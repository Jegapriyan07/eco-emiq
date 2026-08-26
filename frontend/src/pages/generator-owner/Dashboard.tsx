/**
 * Generator Owner Dashboard
 * Real-time runtime vs emission monitoring with control panel and live mock data
 */

import { useState, useEffect } from 'react';
import { useMqttConnection } from '../../hooks/useMqttConnection';
import { useMockGeneratorData } from '../../hooks/useMockGeneratorData';
import { Zap, Clock, Fuel, Power, ToggleLeft, ToggleRight, Download, AlertTriangle, Flame, BrainCircuit } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RUNTIME_DATA = [
    { time: '00:00', runtime: 45, emission: 25, fuel: 12 },
    { time: '04:00', runtime: 78, emission: 42, fuel: 18 },
    { time: '08:00', runtime: 95, emission: 68, fuel: 24 },
    { time: '12:00', runtime: 88, emission: 55, fuel: 21 },
    { time: '16:00', runtime: 92, emission: 61, fuel: 23 },
    { time: '20:00', runtime: 75, emission: 38, fuel: 16 },
    { time: '24:00', runtime: 62, emission: 32, fuel: 14 },
];

const EFFICIENCY_DATA = [
    { day: 'Mon', efficiency: 84, target: 90 },
    { day: 'Tue', efficiency: 88, target: 90 },
    { day: 'Wed', efficiency: 82, target: 90 },
    { day: 'Thu', efficiency: 91, target: 90 },
    { day: 'Fri', efficiency: 87, target: 90 },
    { day: 'Sat', efficiency: 79, target: 90 },
    { day: 'Sun', efficiency: 85, target: 90 },
];


export default function GeneratorOwnerDashboard() {
    const { isConnected, data: mqttData } = useMqttConnection();
    const mockData = useMockGeneratorData();
    const [autoShutdown, setAutoShutdown] = useState(false);
    const [generatorOn, setGeneratorOn] = useState(true);
    const [emission, setEmission] = useState(45.2);
    const [co, setCo] = useState(12.4);
    const [pm25, setPm25] = useState(28.5);
    const [nox, setNox] = useState(0.55);
    const [temp, setTemp] = useState(78);
    const [runtime, setRuntime] = useState(125.5);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [alert, setAlert] = useState('');

    const [carbonFootprint, setCarbonFootprint] = useState(0);
    const [driftScore, setDriftScore] = useState(0);

    // Use MQTT data if connected, otherwise use live simulation
    useEffect(() => {
        if (isConnected && mqttData) {
            setEmission(mqttData.nh3 ?? mqttData.aqi ?? 0);
            setCo(mqttData.co ?? mqttData.nh3 ?? 0);
            setPm25(mqttData.pm25 ?? 0);
            setNox(mqttData.nox ?? 0);
            setTemp(mqttData.temp ?? 0);
            setRuntime(mqttData.runtime ?? 0);
            setCarbonFootprint(0);
            setDriftScore(0);
            setLastUpdate(new Date());
        } else if (mockData) {
            setEmission(mockData.emission);
            setCo(mockData.co);
            setPm25(mockData.pm25);
            setNox(mockData.nox);
            setTemp(mockData.temp);
            setRuntime(mockData.runtime);
            setCarbonFootprint(mockData.carbon_footprint);
            setDriftScore(mockData.drift_intelligence_score);
            setLastUpdate(mockData.lastUpdate);
        }
    }, [isConnected, mqttData, mockData]);

    // Alert when emission spikes
    useEffect(() => {
        if (emission > 65) {
            setAlert('⚠️ Emission level above threshold (65 ppm). Consider reducing load.');
        } else {
            setAlert('');
        }
    }, [emission]);

    const handleToggleGenerator = () => {
        setGeneratorOn(on => {
            if (on) window.alert('Generator stopped. Emissions reset.');
            else setEmission(45.2);
            return !on;
        });
    };

    const handleExportLogs = () => {
        const csv = ['Time,Runtime,Emission,Fuel', ...RUNTIME_DATA.map(r => `${r.time},${r.runtime},${r.emission},${r.fuel}`)].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'generator_logs.csv'; a.click();
    };

    const handleScheduleMaint = () => window.alert('✅ Maintenance request sent. Service team will contact you within 24 hours to confirm the appointment.');

    const emColor = emission < 40 ? 'text-success-600' : emission < 65 ? 'text-warning-600' : 'text-danger-600';
    const tempPct = Math.min((temp / 100) * 100, 100);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generator Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        DG Set Unit #1 · Monitor performance and control emissions
                        <span className={`flex items-center gap-1 ${generatorOn ? 'text-success-600' : 'text-gray-400'}`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${generatorOn ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`} />
                            {generatorOn ? `Running · ${lastUpdate.toLocaleTimeString()}` : 'Stopped'}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportLogs} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <Download className="w-4 h-4" /> Export Logs
                    </button>
                </div>
            </div>

            {/* Alert Banner */}
            {alert && (
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-300 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
                    <p className="text-sm text-warning-800 dark:text-warning-200 font-medium">{alert}</p>
                    {autoShutdown && <span className="ml-auto text-xs bg-warning-600 text-white px-2 py-1 rounded-lg">Auto-Shutdown will trigger</span>}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <StatCard icon={Clock} label="Total Runtime" value={`${runtime}h`} status={generatorOn ? 'running' : 'stopped'} color="text-blue-600" />
                <StatCard icon={Zap} label="Emission Level" value={`${emission} ppm`} status={emission < 65 ? 'normal' : 'alert'} color={emColor} />
                <StatCard icon={Zap} label="CO" value={`${co} ppm`} status="live" color="text-orange-600" />
                <StatCard icon={Zap} label="PM2.5" value={`${pm25} µg/m³`} status="live" color="text-rose-600" />
                <StatCard icon={Zap} label="NOx" value={`${nox} ppm`} status="live" color="text-amber-600" />
                <StatCard icon={Flame} label="Carbon Footprint" value={`${carbonFootprint} g CO₂e`} status="tracking" color="text-green-600" />
                <StatCard icon={BrainCircuit} label="Drift Score" value={driftScore.toString()} status="residual" color="text-indigo-600" />
                <StatCard icon={Power} label="Next Maintenance" value="72h" status="scheduled" color="text-orange-600" />
            </div>

            {/* Chart + Control */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Runtime vs Emission Analysis</h2>
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={RUNTIME_DATA}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                            <Line type="monotone" dataKey="runtime" stroke="#1890ff" strokeWidth={2} name="Runtime (%)" />
                            <Line type="monotone" dataKey="emission" stroke="#52c41a" strokeWidth={2} name="Emission (ppm)" />
                            <Line type="monotone" dataKey="fuel" stroke="#faad14" strokeWidth={2} name="Fuel (L/h)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Control Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Control Panel</h2>

                    {/* Status */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${generatorOn ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className={`text-sm font-semibold ${generatorOn ? 'text-success-600' : 'text-gray-400'}`}>{generatorOn ? 'Running' : 'Stopped'}</span>
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${generatorOn ? 'bg-success-50 dark:bg-success-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <p className={`text-sm ${generatorOn ? 'text-success-700 dark:text-success-400' : 'text-gray-500'}`}>
                                {generatorOn ? 'Operating within emission limits' : 'Generator is offline'}
                            </p>
                        </div>
                    </div>

                    {/* Temperature */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temperature</span>
                            <span className={`text-sm font-semibold ${temp > 85 ? 'text-danger-600' : temp > 75 ? 'text-warning-600' : 'text-gray-900 dark:text-white'}`}>{temp}°C</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div className="bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500 h-3 rounded-full transition-all duration-700" style={{ width: `${tempPct}%` }} />
                        </div>
                    </div>

                    {/* Current Emission Gauge */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Emission</span>
                            <span className={`text-sm font-semibold ${emColor}`}>{emission} ppm</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div className={`h-3 rounded-full transition-all duration-700 ${emission < 40 ? 'bg-success-500' : emission < 65 ? 'bg-warning-500' : 'bg-danger-500'}`} style={{ width: `${Math.min((emission / 100) * 100, 100)}%` }} />
                        </div>
                    </div>

                    {/* Auto Shutdown Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        onClick={() => setAutoShutdown(a => !a)}>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm">Auto-Shutdown</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Stop on critical emissions ({'>'}65 ppm)</p>
                        </div>
                        {autoShutdown ? <ToggleRight className="w-8 h-8 text-success-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button onClick={handleToggleGenerator} className={`w-full font-medium py-2.5 rounded-lg text-sm transition-colors ${generatorOn ? 'bg-danger-100 hover:bg-danger-200 text-danger-700' : 'bg-success-600 hover:bg-success-700 text-white'}`}>
                            {generatorOn ? '⏹ Stop Generator' : '▶ Start Generator'}
                        </button>
                        <button onClick={handleExportLogs} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">Export Logs</button>
                        <button onClick={handleScheduleMaint} className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-2.5 rounded-lg text-sm transition-colors">Schedule Maintenance</button>
                    </div>
                </div>
            </div>

            {/* Weekly Efficiency */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Weekly Fuel Efficiency vs Target</h2>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={EFFICIENCY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="efficiency" fill="#1890ff" radius={[4, 4, 0, 0]} name="Actual %" />
                        <Bar dataKey="target" fill="#52c41a" radius={[4, 4, 0, 0]} name="Target %" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Tip */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex items-start gap-4">
                <Fuel className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">Fuel Efficiency Tip</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Reduce load during peak emission periods (8 AM–12 PM) to improve efficiency by 5–8%. Consider installing a smart timer.
                    </p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, status, color }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs px-2 py-1 bg-success-100 text-success-700 rounded-full uppercase font-medium">{status}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
