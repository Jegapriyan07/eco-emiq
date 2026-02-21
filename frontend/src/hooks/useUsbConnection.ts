/**
 * useUsbConnection Hook
 * Real Web Serial API integration for USB-connected emission sensors (e.g., ESP32, Arduino)
 * Parses JSON lines from the serial port and returns live sensor data
 */

import { useState, useRef, useCallback } from 'react';

export interface UsbSensorData {
    aqi?: number;
    co?: number;
    co2?: number;
    nox?: number;
    pm25?: number;
    temp?: number;
    humidity?: number;
    timestamp?: number;
    [key: string]: any;
}

export type UsbStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'unsupported';

export function useUsbConnection() {
    const [status, setStatus] = useState<UsbStatus>(() =>
        'serial' in navigator ? 'idle' : 'unsupported'
    );
    const [data, setData] = useState<UsbSensorData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const portRef = useRef<any>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const connect = useCallback(async (baudRate = 115200) => {
        if (!('serial' in navigator)) {
            setStatus('unsupported');
            setError('Web Serial API is not supported in this browser. Use Chrome or Edge.');
            return;
        }

        try {
            setStatus('connecting');
            setError(null);

            // Prompt user to select a serial port
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate });
            portRef.current = port;
            setStatus('connected');

            // Set up abort controller for clean teardown
            const abort = new AbortController();
            abortRef.current = abort;

            // Stream reader: decode UTF-8 text line by line
            const decoder = new TextDecoderStream();
            port.readable.pipeTo(decoder.writable, { signal: abort.signal }).catch(() => { });
            const lineReader = decoder.readable
                .pipeThrough(new TransformStream(new LineBreakTransformer()))
                .getReader();
            readerRef.current = lineReader;

            // Read loop
            (async () => {
                try {
                    while (true) {
                        const { value, done } = await lineReader.read();
                        if (done) break;
                        if (!value) continue;
                        try {
                            const parsed = JSON.parse(value.trim());
                            setData({ ...parsed, timestamp: Date.now() });
                        } catch {
                            // Non-JSON lines (debug output etc.) are silently skipped
                        }
                    }
                } catch (e: any) {
                    if (e?.name !== 'AbortError') {
                        console.error('USB read error:', e);
                        setError('Serial read error: ' + (e?.message ?? e));
                    }
                } finally {
                    setStatus('idle');
                    setData(null);
                }
            })();
        } catch (e: any) {
            console.error('USB connect error:', e);
            // User cancelled the port picker => don't show as error
            if (e?.name === 'NotFoundError') {
                setStatus('idle');
            } else {
                setStatus('error');
                setError(e?.message ?? 'Failed to connect to USB device');
            }
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            abortRef.current?.abort();
            readerRef.current?.cancel();
            await portRef.current?.close();
        } catch { /* ignore */ } finally {
            portRef.current = null;
            readerRef.current = null;
            abortRef.current = null;
            setStatus('idle');
            setData(null);
            setError(null);
        }
    }, []);

    return {
        status,
        isConnected: status === 'connected',
        isConnecting: status === 'connecting',
        isUnsupported: status === 'unsupported',
        data,
        error,
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
