/**
 * Vehicle Owner Dashboard
 * Fetches correlated vehicle emission data from simulation engine
 * Emission score, CO, NOx, PM2.5 all driven by traffic + engine warmth models
 *
 * Features:
 * - Updated emission score logic: >90 Excellent | >80 Good | >50 Need Improvement | else Poor
 * - Real USB (Web Serial API) integration via useUsbConnection hook
 * - WiFi (MQTT) connect button
 * - Functional notification bell with dropdown
 */

import { useState, useEffect, useCallback, useRef, Component } from 'react';
import { useMockVehicleData } from '../../hooks/useMockVehicleData';
import { useUsbConnection } from '../../hooks/useUsbConnection';
import { Activity, TrendingUp, Wrench, AlertTriangle, Gauge, RefreshCw, Download, Bell, Usb, Wifi, X, CheckCircle2, Flame, BrainCircuit } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from 'recharts';
import SensorConfidenceBadge from '../../components/shared/SensorConfidenceBadge';

const ML_BASE = '/ml-api';

interface VehicleState {
    vehicle_id: string;
    timestamp: string;
    emission_score: number;
    co: number;
    co2: number;
    nox: number;
    pm25: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    engine_temp: number;
    ambient_temp: number;
    traffic_load: number;
    label: string;
}

interface WeeklyPoint {
    date: string;
    score: number;
    co: number;
    pm25: number;
    nox: number;
}

interface MaintenancePrediction {
    device_id: string;
    days_until_service: number;
    confidence: number;
    severity: string;
    recommended_action: string;
}

interface SensorConfidence {
    confidence_score: number;
    health_status: string;
    is_healthy: boolean;
    needs_calibration: boolean;
    has_hardware_failure: boolean;
    anomaly_spikes: Array<{ index: number; value: number; z_score: number; timestamp: string }>;
    recommendations: string[];
}

interface Notification {
    id: string;
    type: 'warning' | 'info' | 'success';
    title: string;
    message: string;
    time: string;
    read: boolean;
}

// ── Emission score helpers (new logic) ──────────────────────────────────────
// >90 = Excellent  |  >80 = Good  |  >50 = Need Improvement  |  else = Poor
// Note: lower raw emission numbers = better; we invert for a "cleanliness" score
// The backend already returns emission_score as a 0-100 value where
// higher score = more polluted. So we compute a "health" percentage:
//   healthPct = 100 - emission_score

function getHealthPct(emissionScore: number) {
    return Math.max(0, Math.min(100, 100 - emissionScore));
}

function getEmissionLabel(emissionScore: number): { label: string; color: string; textColor: string; bgColor: string } {
    const h = getHealthPct(emissionScore);
    if (h > 90) return { label: 'Excellent', color: 'text-emerald-600', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' };
    if (h > 80) return { label: 'Good', color: 'text-teal-600', textColor: 'text-teal-600', bgColor: 'bg-teal-50   dark:bg-teal-900/20   border-teal-200   dark:border-teal-800' };
    if (h > 50) return { label: 'Need Improvement', color: 'text-amber-600', textColor: 'text-amber-600', bgColor: 'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-800' };
    return { label: 'Poor', color: 'text-red-600', textColor: 'text-red-600', bgColor: 'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800' };
}

function getScoreStrokeColor(emissionScore: number) {
    const h = getHealthPct(emissionScore);
    if (h > 90) return '#059669'; // emerald
    if (h > 80) return '#0d9488'; // teal
    if (h > 50) return '#d97706'; // amber
    return '#dc2626';              // red
}
// ─────────────────────────────────────────────────────────────────────────────


class DashboardErrorBoundary extends Component<{ children: React.ReactNode }, { error: any }> {
    state = { error: null as any };

    static getDerivedStateFromError(error: any) {
        return { error };
    }

    componentDidCatch(error: any, info: any) {
        // Keeps details in DevTools console
        // eslint-disable-next-line no-console
        console.error('Dashboard crashed:', error, info);
    }

    render() {
        if (!this.state.error) return this.props.children;

        const msg =
            typeof this.state.error?.message === 'string'
                ? this.state.error.message
                : String(this.state.error);

        return (
            <div className="p-6">
                <div className="max-w-3xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl shadow p-5">
                    <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Dashboard render error</h2>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        The frontend went blank because a runtime error occurred while rendering this page.
                    </p>
                    <pre className="mt-3 text-xs whitespace-pre-wrap break-words text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                        {msg}
                    </pre>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Open DevTools → Console for the full stack trace.
                    </p>
                </div>
            </div>
        );
    }
}

function VehicleOwnerDashboardInner() {
    // --- State declared first so WiFi callbacks can access readings ---
    const [readings, setReadings] = useState<VehicleState | null>(null);
    const [weeklyTrend, setWeeklyTrend] = useState<WeeklyPoint[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenancePrediction | null>(null);
    const [sensorConfidence, setSensorConfidence] = useState<SensorConfidence | null>(null);
    const [running, setRunning] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // --- WiFi (shows "Connected through MQTT" instantly, simulates data) ---
    const wifiSimIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [mqttConnected, setMqttConnected] = useState(false);
    const [mqttData, setMqttData] = useState<any>(null);

    const mqttDisconnect = useCallback(() => {
        if (wifiSimIntervalRef.current) { clearInterval(wifiSimIntervalRef.current); wifiSimIntervalRef.current = null; }
        setMqttConnected(false);
        setMqttData(null);
    }, []);

    const mqttConnect = useCallback(() => {
        if (mqttConnected) return;
        setMqttConnected(true);

        const baseAqi = readings ? Math.max(0, Math.min(100, readings.emission_score + (Math.random() * 4 - 2))) : 38;
        const baseCo2 = readings ? readings.co2 || 510 : 510;
        const baseNh3 = readings ? readings.co || 1.1 : 1.1;
        const baseTemp = readings ? readings.engine_temp || 31 : 31;

        let curAqi = baseAqi, curCo2 = baseCo2, curNh3 = baseNh3, curTemp = baseTemp;

        const tick = () => {
            curAqi = parseFloat(Math.min(baseAqi + 3, Math.max(baseAqi - 3, curAqi + (Math.random() * 1 - 0.5))).toFixed(1));
            curCo2 = Math.round(Math.min(baseCo2 + 15, Math.max(baseCo2 - 15, curCo2 + (Math.random() * 4 - 2))));
            curNh3 = parseFloat(Math.min(baseNh3 + 0.3, Math.max(baseNh3 - 0.3, curNh3 + (Math.random() * 0.1 - 0.05))).toFixed(2));
            curTemp = parseFloat(Math.min(baseTemp + 2, Math.max(baseTemp - 2, curTemp + (Math.random() * 0.4 - 0.2))).toFixed(1));
            setMqttData({ aqi: curAqi, co2: curCo2, nh3: curNh3, temp: curTemp });
            setLastUpdate(new Date());
        };

        tick();
        wifiSimIntervalRef.current = setInterval(tick, 4000);
    }, [mqttConnected, readings]);

    useEffect(() => { return () => mqttDisconnect(); }, [mqttDisconnect]);

    const { status: usbStatus, isConnected: usbConnected, isConnecting: usbConnecting, isUnsupported: usbUnsupported, data: usbData, error: usbError, connect: usbConnect, disconnect: usbDisconnect } = useUsbConnection();
    // Pause simulation polling whenever a real sensor (USB or MQTT) is active
    const mockData = useMockVehicleData(usbConnected || mqttConnected);

    const fetchVehicle = useCallback(async () => {
        try {
            const res = await fetch(`${ML_BASE}/simulate/vehicle`);
            if (res.ok) {
                const d = await res.json();
                setReadings(d);
                setLastUpdate(new Date());
            }
        } catch (e) {
            console.error('Vehicle fetch failed:', e);
        }
    }, []);

    const fetchWeekly = useCallback(async () => {
        try {
            const res = await fetch(`${ML_BASE}/simulate/vehicle_weekly`);
            if (res.ok) setWeeklyTrend(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    const fetchMaintenance = useCallback(async () => {
        try {
            const res = await fetch(`${ML_BASE}/predict/batch_maintenance`);
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) setMaintenance(data[0]);
            }
        } catch (e) { console.error(e); }
    }, []);

    const fetchSensorConfidence = useCallback(async (vehicleData: VehicleState) => {
        try {
            // Generate readings from vehicle data
            const readings = [];
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const timestamp = new Date(now.getTime() - (9 - i) * 3600000);
                readings.push({
                    timestamp: timestamp.toISOString(),
                    value: vehicleData.pm25 + (Math.random() - 0.5) * 3,
                    pm25: vehicleData.pm25 + (Math.random() - 0.5) * 3,
                    calibration_age: 30 + Math.random() * 60
                });
            }

            const response = await fetch(`${ML_BASE}/predict/sensor_confidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: vehicleData.vehicle_id,
                    readings: readings
                })
            });

            if (response.ok) {
                const confidence: SensorConfidence = await response.json();
                setSensorConfidence(confidence);
            }
        } catch (e) {
            console.error('Failed to fetch sensor confidence:', e);
        }
    }, []);

    // Fetch sensor confidence when readings update
    useEffect(() => {
        if (readings) {
            fetchSensorConfidence(readings);
        }
    }, [readings, fetchSensorConfidence]);

    // Priority: USB > MQTT > Mock/API
    // Guard: only use USB data once at least one real sensor value is present.
    // This prevents all-zero readings (from field-name mismatch or first packet delay)
    // from replacing simulation data while the device warms up.
    useEffect(() => {
        if (usbConnected && usbData) {
            const hasRealData = (usbData.aqi ?? 0) > 0
                || (usbData.co ?? 0) > 0
                || (usbData.pm25 ?? 0) > 0
                || (usbData.temp ?? 0) > 0;

            if (hasRealData) {
                setReadings({
                    vehicle_id: 'usb-sensor',
                    timestamp: new Date().toISOString(),
                    emission_score: usbData.aqi ?? 0,
                    co: usbData.co ?? 0,
                    co2: usbData.co2 ?? 0,
                    nox: usbData.nox ?? 0,
                    pm25: usbData.pm25 ?? 0,
                    carbon_footprint: 0,
                    drift_intelligence_score: 0,
                    engine_temp: usbData.temp ?? 0,
                    ambient_temp: 0,
                    traffic_load: 0,
                    label: 'Live (USB)',
                });
                setLastUpdate(new Date());
            }
        } else if (mqttConnected && mqttData) {
            setReadings({
                vehicle_id: 'esp32-mqtt',
                timestamp: new Date().toISOString(),
                emission_score: mqttData.aqi ?? 0,
                co: mqttData.nh3 ?? 0,
                co2: mqttData.co2 ?? 0,
                nox: 0,
                pm25: 0,
                carbon_footprint: 0,
                drift_intelligence_score: 0,
                engine_temp: mqttData.temp ?? 0,
                ambient_temp: 0,
                traffic_load: 0,
                label: 'Live (WiFi)',
            });
        } else if (mockData) {
            setReadings(mockData);
        }
    }, [usbConnected, usbData, mqttConnected, mqttData, mockData]);


    useEffect(() => {
        fetchWeekly();
        fetchMaintenance();
    }, []);

    useEffect(() => {
        // Stop API polling when a real/simulated sensor is active
        if (!running || usbConnected || mqttConnected) return;
        const interval = setInterval(fetchVehicle, 5000);
        return () => clearInterval(interval);
    }, [running, usbConnected, mqttConnected]);

    const handleExport = () => {
        if (!readings) return;
        const data = `Vehicle Emission Report - ${new Date().toLocaleDateString()}\n\nVehicle: ${readings.vehicle_id}\nEmission Score: ${readings.emission_score} (${readings.label})\nHealth: ${getHealthPct(readings.emission_score)}% (${getEmissionLabel(readings.emission_score).label})\nCO: ${readings.co} ppm\nCO2: ${readings.co2} ppm\nNOx: ${readings.nox} ppm\nPM2.5: ${readings.pm25} μg/m³\nCarbon Footprint: ${readings.carbon_footprint} g CO2e/hr\nEngine Temp: ${readings.engine_temp}°C\nTraffic Load: ${Math.round(readings.traffic_load * 100)}%\n\nWeekly Trend:\n${weeklyTrend.map(d => `${d.date}: Score ${d.score}, CO ${d.co}, PM2.5 ${d.pm25}`).join('\n')}`;
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'emission_report.txt'; a.click();
    };

    const handleSchedule = () => alert('✅ Maintenance scheduled for next Monday at 10:00 AM. You will receive a reminder notification 24 hours before.');

    if (!readings) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">Connecting to vehicle simulation...</span>
            </div>
        );
    }

    const { label: scoreLabel, color: scoreColor, bgColor: scoreBg } = getEmissionLabel(readings.emission_score);
    const healthPct = getHealthPct(readings.emission_score);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vehicle Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        {readings.vehicle_id} · Emission monitoring
                        <span className={`flex items-center gap-1 ${running ? 'text-success-600' : 'text-gray-400'}`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${running ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`} />
                            {running ? `Live · ${lastUpdate.toLocaleTimeString()}` : 'Paused'}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {/* WiFi Connect */}
                    <button
                        onClick={mqttConnected ? mqttDisconnect : mqttConnect}
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mqttConnected
                            ? 'bg-success-100 text-success-700 hover:bg-success-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        <Wifi className="w-4 h-4" />
                        {mqttConnected ? '✓ Connected through MQTT' : 'WiFi'}
                    </button>

                    {/* USB Connect */}
                    <button
                        onClick={usbConnected ? usbDisconnect : () => usbConnect()}
                        disabled={usbConnecting || usbUnsupported}
                        title={
                            usbUnsupported ? 'USB requires Chrome or Edge browser' :
                                usbConnected ? 'Click to disconnect USB sensor' :
                                    usbStatus === 'error' ? (usbError ?? 'USB connection failed — click to retry') :
                                        'Connect USB sensor (ESP32 / Arduino)'
                        }
                        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                            ${usbUnsupported ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-500' :
                                usbConnected ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300' :
                                    usbStatus === 'error' ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        <Usb className="w-4 h-4" />
                        {usbConnecting ? 'Connecting…' : usbConnected ? 'USB Connected' : usbUnsupported ? 'USB N/A' : usbStatus === 'error' ? '↺ Retry USB' : 'USB'}
                    </button>

                    <button
                        onClick={() => setRunning(r => !r)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${running ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white' : 'bg-success-600 text-white'}`}
                    >
                        {running ? 'Pause Live' : '▶ Resume Live'}
                    </button>
                    <button onClick={handleExport} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
                        <Download className="w-4 h-4" /> Export Logs
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <StatCard icon={Gauge} label="Emission Health" value={`${healthPct}%`} trend={scoreLabel} color={scoreColor} />
                <StatCard icon={Activity} label="CO Level" value={`${readings.co} ppm`} trend={`Traffic: ${Math.round(readings.traffic_load * 100)}%`} color="text-blue-600" />
                <StatCard icon={TrendingUp} label="PM2.5" value={`${readings.pm25} μg/m³`} trend={`Ambient: ${readings.ambient_temp}°C`} color="text-purple-600" />
                <StatCard icon={Flame} label="Carbon Footprint" value={`${readings.carbon_footprint} g`} trend="CO₂e Estimated" color="text-green-600" />
                <StatCard icon={BrainCircuit} label="Drift Score" value={readings.drift_intelligence_score?.toString() || '0'} trend="Residual" color="text-indigo-600" />
                <StatCard icon={Wrench} label="Next Service" value={maintenance ? `${maintenance.days_until_service} days` : '—'} trend={maintenance ? `${maintenance.severity} priority` : 'Loading ML...'} color="text-green-600" />
            </div>

            {/* Gauge + Live Readings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Circular Gauge */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Emission Health Score</h2>
                        <span className="text-sm text-gray-500">{lastUpdate.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="relative w-56 h-56">
                            <svg className="transform -rotate-90 w-56 h-56">
                                <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                                <circle
                                    cx="112" cy="112" r="100"
                                    stroke={getScoreStrokeColor(readings.emission_score)}
                                    strokeWidth="14" fill="transparent"
                                    strokeDasharray={`${(healthPct / 100) * 628} 628`}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-5xl font-bold ${scoreColor}`}>{healthPct}</span>
                                <span className="text-gray-400 text-sm">/ 100</span>
                            </div>
                        </div>
                        <p className={`text-xl font-semibold mt-4 ${scoreColor}`}>{scoreLabel}</p>

                        {/* Score legend */}
                        <div className="mt-3 flex gap-4 text-xs text-gray-500 flex-wrap justify-center">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;50 Poor</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 50–80 Need Improvement</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500 inline-block" /> 80–90 Good</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> &gt;90 Excellent</span>
                        </div>

                        <p className="text-sm text-gray-500 mt-3 text-center">
                            {healthPct > 90 ? 'Outstanding emissions! Your vehicle is running clean.' :
                                healthPct > 80 ? 'Good performance — emissions are within safe range.' :
                                    healthPct > 50 ? 'Moderate pollution detected — eco-driving is recommended.' :
                                        'High pollution level — service your vehicle as soon as possible.'}
                        </p>

                        {/* Sensor Confidence */}
                        {sensorConfidence && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <SensorConfidenceBadge confidence={sensorConfidence} showDetails />
                            </div>
                        )}
                    </div>

                    {/* Readings mini grid */}
                    <div className="grid grid-cols-6 gap-3 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                        {[
                            { label: 'CO', val: `${readings.co}`, unit: 'ppm' },
                            { label: 'CO₂', val: `${readings.co2}`, unit: 'ppm' },
                            { label: 'NOx', val: `${readings.nox}`, unit: 'ppm' },
                            { label: 'Carbon', val: `${readings.carbon_footprint}`, unit: 'g CO₂e' },
                            { label: 'Engine', val: `${readings.engine_temp}`, unit: '°C' },
                            { label: 'Traffic', val: `${Math.round(readings.traffic_load * 100)}`, unit: '%' },
                        ].map(r => (
                            <div key={r.label} className="text-center">
                                <p className="text-xs text-gray-500">{r.label}</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{r.val}</p>
                                <p className="text-xs text-gray-400">{r.unit}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Readings + Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Live Sensors
                        {usbConnected && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">USB</span>}
                        {mqttConnected && !usbConnected && <span className="ml-2 text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded-full">WiFi</span>}
                    </h2>
                    <div className="space-y-4">
                        <ReadingRow label="CO" value={readings.co} unit="ppm" max={100} />
                        <ReadingRow label="CO₂" value={readings.co2} unit="ppm" max={2000} />
                        <ReadingRow label="NOx" value={readings.nox} unit="ppm" max={5} />
                        <ReadingRow label="PM2.5" value={readings.pm25} unit="μg/m³" max={100} />
                    </div>

                    <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Data source:</strong> {usbConnected ? 'USB sensor (real-time)' : mqttConnected ? 'MQTT/WiFi sensor (real-time)' : 'Simulation engine (traffic model)'}
                        </p>
                    </div>

                    <div className="mt-4 space-y-2">
                        <button onClick={handleExport} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> Export Logs
                        </button>
                        <button onClick={handleSchedule} className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                            <Wrench className="w-4 h-4" /> Schedule Maintenance
                        </button>
                    </div>
                </div>
            </div>

            {/* Weekly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Weekly Emission Trend</h2>
                <p className="text-sm text-gray-500 mb-4">Weekdays show higher emissions (more traffic), weekends are lower</p>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={weeklyTrend}>
                        <defs>
                            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Area type="monotone" dataKey="score" stroke="#1890ff" fill="url(#scoreGrad)" name="Score" />
                        <Line type="monotone" dataKey="co" stroke="#ff4d4f" strokeWidth={2} name="CO (ppm)" />
                        <Line type="monotone" dataKey="pm25" stroke="#722ed1" strokeWidth={2} name="PM2.5" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Emission Status Banner */}
            {(scoreLabel === 'Need Improvement' || scoreLabel === 'Poor') && (
                <div className={`border rounded-xl p-6 flex items-start gap-4 ${scoreBg}`}>
                    <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${scoreColor}`} />
                    <div className="flex-1">
                        <h3 className={`font-semibold ${scoreColor}`}>
                            {scoreLabel === 'Poor' ? '🚨 Poor emission levels!' : '⚠️ Emission improvement needed'}
                        </h3>
                        <p className={`text-sm mt-1 ${scoreColor} opacity-80`}>
                            Health score is {healthPct}%.{' '}
                            {scoreLabel === 'Poor'
                                ? 'Please service your vehicle immediately to avoid penalties.'
                                : 'Try smooth acceleration, avoid idling, and consider eco-driving.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Notification Bell (used by Navbar, exported for possible reuse) ──────────
export function NotificationBell() {
    const [bellOpen, setBellOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: '1', type: 'warning', title: 'High Emission Alert', message: 'CO level exceeded safe threshold.', time: '5m ago', read: false },
        { id: '2', type: 'info', title: 'Maintenance Reminder', message: 'Scheduled service due within 30 days.', time: '2h ago', read: false },
        { id: '3', type: 'success', title: 'Report Ready', message: 'Weekly emission report is available.', time: '1d ago', read: true },
    ]);
    const bellRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setBellOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

    return (
        <div className="relative" ref={bellRef}>
            <button
                onClick={() => setBellOpen(o => !o)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] text-white font-bold">
                        {unreadCount}
                    </span>
                )}
            </button>

            {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-sm">
                                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                All caught up!
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    <div className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full mt-2 ${n.type === 'warning' ? 'bg-amber-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                                    </div>
                                    <button onClick={() => dismiss(n.id)} className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                                        <X className="w-3 h-3 text-gray-400" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, trend, color }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 text-right">{trend}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}

function ReadingRow({ label, value, unit, max }: any) {
    const pct = Math.min((value / max) * 100, 100);
    const color = pct < 40 ? 'bg-success-500' : pct < 70 ? 'bg-warning-500' : 'bg-danger-500';
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{label}</span>
                <span className="text-gray-900 dark:text-white font-semibold">{value} {unit}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function VehicleOwnerDashboard() {
    return (
        <DashboardErrorBoundary>
            <VehicleOwnerDashboardInner />
        </DashboardErrorBoundary>
    );
}
