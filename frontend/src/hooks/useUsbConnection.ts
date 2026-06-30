/**
 * useUsbConnection Hook
 * Real Web Serial API integration for USB-connected emission sensors (e.g., ESP32, Arduino)
 * Parses JSON lines from the serial port and returns live sensor data.
 *
 * Fixes:
 *  - Port is always fully closed/released on error so retries work immediately
 *  - Stale portRef cleaned up before every new connect attempt
 *  - Baud rate is configurable; hook auto-retries at 9600 if 115200 fails
 *  - Meaningful error message exposed so the UI can display it
 *  - Clicking the "USB Error" button cleanly resets state before retrying
 */

import { useState, useRef, useCallback } from 'react';

export interface UsbSensorData {
    // Dashboard-standard names
    aqi?: number;       // AQI 0-500  (mapped from mq135_ppm or derived from pm25)
    co?: number;        // CO ppm     (mapped from co_ppm)
    co2?: number;       // CO2 ppm
    nox?: number;       // NOx ppm    (mapped from no2_ppm)
    no2?: number;       // NO2 ppm
    nh3?: number;       // NH3 ppm    (mapped from nh3_ppm — Generator dashboard)
    pm25?: number;      // PM2.5 µg/m³
    pm10?: number;      // PM10 µg/m³
    temp?: number;      // °C         (mapped from temperature)
    humidity?: number;  // %
    mq135_ppm?: number; // raw MQ135 (kept as-is)
    runtime?: number;   // hours
    timestamp?: number; // added by hook
    [key: string]: any; // any extra fields pass through
}

export type UsbStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';

// Common baud rates to try (ESP32 = 115200, Arduino Uno often = 9600)
const BAUD_RATES = [115200, 9600, 38400, 57600];

/** Forcibly close a port reference, ignoring any errors */
async function forceClosePort(port: any) {
    try { await port?.close(); } catch { /* already closed or never opened */ }
}

export function useUsbConnection() {
    const [status, setStatus] = useState<UsbStatus>(() =>
        'serial' in navigator ? 'idle' : 'unsupported'
    );
    const [data, setData] = useState<UsbSensorData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const portRef = useRef<any>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    /** Fully tear down any existing connection (called before every retry too) */
    const teardown = useCallback(async () => {
        try { abortRef.current?.abort(); } catch { }
        try { await readerRef.current?.cancel(); } catch { }
        await forceClosePort(portRef.current);
        portRef.current = null;
        readerRef.current = null;
        abortRef.current = null;
    }, []);

    const connect = useCallback(async (preferredBaudRate?: number) => {
        if (!('serial' in navigator)) {
            setStatus('unsupported');
            setError('Web Serial API requires Chrome or Edge browser.');
            return;
        }

        // Always tear down any stale connection first — this is the key fix
        // for the "USB Error on retry" bug.
        await teardown();

        setStatus('connecting');
        setError(null);

        let port: any = null;

        try {
            // Show the browser port picker
            port = await (navigator as any).serial.requestPort();
        } catch (e: any) {
            // User cancelled the picker → not an error
            if (e?.name === 'NotFoundError' || e?.name === 'AbortError') {
                setStatus('idle');
            } else {
                setStatus('error');
                setError(`Could not open port picker: ${e?.message ?? e}`);
            }
            return;
        }

        // --- Try to open the port, auto-retrying with other baud rates if needed ---
        const baudRatesToTry = preferredBaudRate
            ? [preferredBaudRate, ...BAUD_RATES.filter(b => b !== preferredBaudRate)]
            : BAUD_RATES;

        let openedBaudRate: number | null = null;
        let lastOpenError: string = '';

        for (const baud of baudRatesToTry) {
            try {
                await port.open({ baudRate: baud });
                openedBaudRate = baud;
                break; // success
            } catch (e: any) {
                lastOpenError = e?.message ?? String(e);
                // Port may be partially open; force-close before trying next baud
                await forceClosePort(port);

                // "Port already open" in another app → no point trying other baud rates
                if (
                    lastOpenError.toLowerCase().includes('already open') ||
                    lastOpenError.toLowerCase().includes('access denied') ||
                    lastOpenError.toLowerCase().includes('permission')
                ) {
                    setStatus('error');
                    setError(
                        'Serial port is already open in another application ' +
                        '(e.g. Arduino IDE Serial Monitor, PlatformIO). ' +
                        'Close it there first, then retry here.'
                    );
                    return;
                }
            }
        }

        if (openedBaudRate === null) {
            setStatus('error');
            setError(`Could not open port at any baud rate. Last error: ${lastOpenError}`);
            return;
        }

        // ---- Port opened successfully ----
        portRef.current = port;
        setStatus('connected');

        const abort = new AbortController();
        abortRef.current = abort;

        // Stream reader: decode UTF-8 text line by line
        let lineReader: ReadableStreamDefaultReader<string>;
        try {
            const decoder = new TextDecoderStream();
            port.readable.pipeTo(decoder.writable, { signal: abort.signal }).catch(() => { });
            lineReader = decoder.readable
                .pipeThrough(new TransformStream(new LineBreakTransformer()))
                .getReader();
            readerRef.current = lineReader;
        } catch (e: any) {
            setStatus('error');
            setError(`Failed to set up stream reader: ${e?.message ?? e}`);
            await teardown();
            return;
        }

        // Read loop (runs until port disconnects or user clicks disconnect)
        (async () => {
            try {
                while (true) {
                    const { value, done } = await lineReader.read();
                    if (done) break;
                    if (!value) continue;
                    try {
                        const raw = JSON.parse(value.trim());

                        // ── Normalise ESP32 field names → dashboard field names ──────────
                        // Your ESP32 sends: temperature, co_ppm, nh3_ppm, no2_ppm, mq135_ppm
                        // Dashboards read:  temp,        co,     nh3,     nox,     aqi
                        const d: UsbSensorData = { ...raw };
                        if (raw.temperature !== undefined && d.temp === undefined) d.temp = raw.temperature;
                        if (raw.co_ppm !== undefined && d.co === undefined) d.co = raw.co_ppm;
                        if (raw.nh3_ppm !== undefined && d.nh3 === undefined) d.nh3 = raw.nh3_ppm;
                        if (raw.no2_ppm !== undefined) { d.nox ??= raw.no2_ppm; d.no2 ??= raw.no2_ppm; }
                        if (raw.mq135_ppm !== undefined && d.aqi === undefined)
                            d.aqi = Math.min(500, Math.max(0, Math.round(raw.mq135_ppm)));

                        // Derive AQI from PM2.5 (WHO breakpoints) when mq135 is absent
                        if (d.aqi === undefined && d.pm25 !== undefined) {
                            const pm = d.pm25;
                            let aqi = 0;
                            if (pm <= 12.0) aqi = (50 / 12.0) * pm;
                            else if (pm <= 35.4) aqi = 50 + (50 / 23.4) * (pm - 12.1);
                            else if (pm <= 55.4) aqi = 100 + (50 / 19.9) * (pm - 35.5);
                            else if (pm <= 150.4) aqi = 150 + (50 / 94.9) * (pm - 55.5);
                            else if (pm <= 250.4) aqi = 200 + (100 / 99.9) * (pm - 150.5);
                            else aqi = 300 + (100 / 149.9) * (pm - 250.5);
                            d.aqi = Math.min(500, Math.round(aqi));
                        }
                        // ────────────────────────────────────────────────────────────────

                        setData({ ...d, timestamp: Date.now() });
                    } catch {
                        // Non-JSON lines (debug output, boot messages, etc.) are silently skipped
                    }
                }
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    console.error('USB read error:', e);
                    setError(`Read error: ${e?.message ?? e}`);
                    setStatus('error');
                }
            } finally {
                // Only reset to idle if we didn't already set 'error' above
                setStatus(s => s === 'connected' ? 'idle' : s);
                setData(null);
                await teardown();
            }
        })();
    }, [teardown]);

    const disconnect = useCallback(async () => {
        await teardown();
        setStatus('idle');
        setData(null);
        setError(null);
    }, [teardown]);

    return {
        status,
        isConnected: status === 'connected',
        isConnecting: status === 'connecting',
        isUnsupported: status === 'unsupported',
        data,
        error,                            // expose error so UI can show the reason
        connect,
        disconnect,
    };
}

/**
 * TransformStream helper: splits raw bytes into newline-delimited strings
 */
class LineBreakTransformer implements Transformer<string, string> {
    private chunks = '';

    transform(chunk: string, controller: TransformStreamDefaultController<string>) {
        this.chunks += chunk;
        const lines = this.chunks.split('\n');
        this.chunks = lines.pop() ?? '';
        for (const line of lines) {
            if (line.trim()) controller.enqueue(line.trim());
        }
    }

    flush(controller: TransformStreamDefaultController<string>) {
        if (this.chunks.trim()) controller.enqueue(this.chunks.trim());
    }
}
