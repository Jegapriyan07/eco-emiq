/**
 * Industry Owner Dashboard
 * Multi-device monitoring with compliance tracking and anomaly detection
 */

import { useState, useEffect, useCallback } from 'react';
import { Building, CheckCircle, XCircle, AlertTriangle, Users, FileText, RefreshCw, Flame, BrainCircuit } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import SensorConfidenceBadge from '../../components/shared/SensorConfidenceBadge';

const ML_BASE = '/ml-api';

interface DeviceConfidence {
    confidence_score: number;
    health_status: string;
    is_healthy: boolean;
    needs_calibration: boolean;
    has_hardware_failure: boolean;
    anomaly_spikes: Array<{ index: number; value: number; z_score: number; timestamp: string }>;
    recommendations: string[];
}

interface Device {
    id: string;
    name: string;
    status: string;
    emission: number;
    uptime: number;
    pm25: number;
    co: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    confidence?: DeviceConfidence;
}

const DEVICES_BASE: Device[] = [
    { id: 'D001', name: 'Chamber A', status: 'compliant', emission: 35, uptime: 98.2, pm25: 18, co: 8, carbon_footprint: 6.75, drift_intelligence_score: 0.1 },
    { id: 'D002', name: 'Chamber B', status: 'compliant', emission: 42, uptime: 95.1, pm25: 22, co: 10, carbon_footprint: 7.10, drift_intelligence_score: 0.2 },
    { id: 'D003', name: 'Chamber C', status: 'warning', emission: 68, uptime: 92.4, pm25: 38, co: 16, carbon_footprint: 8.40, drift_intelligence_score: 0.4 },
    { id: 'D004', name: 'Chamber D', status: 'compliant', emission: 38, uptime: 99.0, pm25: 20, co: 9, carbon_footprint: 6.90, drift_intelligence_score: 0.1 },
];

const COMPLIANCE_DATA = [
    { name: 'Compliant', value: 75, color: '#52c41a' },
    { name: 'Warning', value: 20, color: '#faad14' },
    { name: 'Non-Compliant', value: 5, color: '#ff4d4f' },
];

const MONTHLY_TREND = [
    { month: 'Oct', compliant: 68, warning: 25, nonComp: 7 },
    { month: 'Nov', compliant: 72, warning: 22, nonComp: 6 },
    { month: 'Dec', compliant: 70, warning: 24, nonComp: 6 },
    { month: 'Jan', compliant: 74, warning: 21, nonComp: 5 },
    { month: 'Feb', compliant: 75, warning: 20, nonComp: 5 },
];

const ANOMALIES = [
    { id: 1, date: '2026-02-15', device: 'Chamber C', type: 'High PM2.5', severity: 'medium' },
    { id: 2, date: '2026-02-14', device: 'Chamber B', type: 'CO Spike', severity: 'low' },
    { id: 3, date: '2026-02-12', device: 'Chamber A', type: 'Temperature', severity: 'low' },
    { id: 4, date: '2026-02-10', device: 'Chamber C', type: 'NOx Spike', severity: 'high' },
];

const j = (v: number, r = 3) => parseFloat((v + (Math.random() - 0.5) * r).toFixed(1));

export default function IndustryOwnerDashboard() {
    const [devices, setDevices] = useState<Device[]>(DEVICES_BASE);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [dismissedAnomalies, setDismissedAnomalies] = useState<number[]>([]);
    const [showExportMsg, setShowExportMsg] = useState(false);
    const [deviceConfidences, setDeviceConfidences] = useState<Record<string, DeviceConfidence>>({});

    const fetchSensorConfidence = useCallback(async (device: Device) => {
        try {
            // Generate sample readings from device data
            const readings = [];
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const timestamp = new Date(now.getTime() - (9 - i) * 3600000);
                readings.push({
                    timestamp: timestamp.toISOString(),
                    value: device.pm25 + (Math.random() - 0.5) * 5,
                    pm25: device.pm25 + (Math.random() - 0.5) * 5,
                    calibration_age: 30 + Math.random() * 60
                });
            }

            const response = await fetch(`${ML_BASE}/predict/sensor_confidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: device.id,
                    readings: readings
                })
            });

            if (response.ok) {
                const confidence: DeviceConfidence = await response.json();
                setDeviceConfidences(prev => ({
                    ...prev,
                    [device.id]: confidence
                }));
            }
        } catch (e) {
            console.error('Failed to fetch sensor confidence:', e);
        }
    }, []);

    // Fetch sensor confidence for all devices
    useEffect(() => {
        devices.forEach(device => {
            if (!deviceConfidences[device.id]) {
                fetchSensorConfidence(device);
            }
        });
    }, [devices, fetchSensorConfidence]);

    // Simulate live updates
    useEffect(() => {
        const interval = setInterval(() => {
            setDevices(prev => prev.map(d => {
                const newEmission = Math.max(10, j(d.emission, 3));
                const predictedEmission = newEmission + (Math.random() - 0.5) * 4;
                const residual = Math.abs(predictedEmission - newEmission);
                const drift = d.drift_intelligence_score * 0.8 + residual * 0.2;
                return {
                    ...d,
                    emission: newEmission,
                    pm25: Math.max(5, j(d.pm25, 2)),
                    co: Math.max(2, j(d.co, 1)),
                    carbon_footprint: parseFloat((5.0 + (newEmission / 100) * 5.0).toFixed(2)),
                    drift_intelligence_score: parseFloat(drift.toFixed(2)),
                    status: newEmission > 65 ? 'warning' : 'compliant',
                };
            }));
            setLastUpdate(new Date());
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleExport = () => {
        const csv = ['Device ID,Name,Status,Emission,Uptime,PM2.5,CO', ...devices.map(d => `${d.id},${d.name},${d.status},${d.emission},${d.uptime},${d.pm25},${d.co}`)].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'industry_compliance_report.csv'; a.click();
        setShowExportMsg(true);
        setTimeout(() => setShowExportMsg(false), 3000);
    };

    const compliant = devices.filter(d => d.status === 'compliant').length;
    const visibleAnomalies = ANOMALIES.filter(a => !dismissedAnomalies.includes(a.id));
    const emissionData = devices.map(d => ({ name: d.name, emission: d.emission, limit: 60 }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Industry Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        Organization-wide emission monitoring
                        <span className="flex items-center gap-1 text-success-600">
                            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse inline-block" />
                            Live · {lastUpdate.toLocaleTimeString()}
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    {showExportMsg && <span className="self-center text-sm text-success-600 font-medium">✓ Report downloaded!</span>}
                    <button onClick={handleExport} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors">
                        <FileText className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${Object.keys(deviceConfidences).length > 0 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-6`}>
                <StatCard icon={Building} label="Total Devices" value={devices.length.toString()} color="text-blue-600" badge="Active" />
                <StatCard icon={CheckCircle} label="Compliant" value={compliant.toString()} color="text-green-600" badge={`${Math.round((compliant / devices.length) * 100)}%`} />
                <StatCard icon={AlertTriangle} label="Anomalies" value={visibleAnomalies.length.toString()} color="text-orange-600" badge="Last 30d" />
                <StatCard icon={Users} label="Employees" value="24" color="text-purple-600" badge="Registered" />
                <StatCard icon={Flame} label="Carbon Footprint" value={`${parseFloat((devices.reduce((acc, d) => acc + d.carbon_footprint, 0) / devices.length).toFixed(2))} g`} color="text-green-600" badge="Avg Chamber CO₂e" />
                <StatCard icon={BrainCircuit} label="Drift Score" value={`${parseFloat((devices.reduce((acc, d) => acc + d.drift_intelligence_score, 0) / devices.length).toFixed(2))}`} color="text-indigo-600" badge="Residual Avg" />

                {/* Average Sensor Confidence */}
                {Object.keys(deviceConfidences).length > 0 && (
                    <StatCard
                        icon={AlertTriangle}
                        label="Sensor Confidence"
                        value={`${Math.round(Object.values(deviceConfidences).reduce((sum, c) => sum + c.confidence_score, 0) / Object.keys(deviceConfidences).length * 100)}%`}
                        color={(() => {
                            const avgConf = Object.values(deviceConfidences).reduce((sum, c) => sum + c.confidence_score, 0) / Object.keys(deviceConfidences).length;
                            return avgConf >= 0.8 ? 'text-green-600' : avgConf >= 0.6 ? 'text-yellow-600' : 'text-red-600';
                        })()}
                        badge={(() => {
                            const needsCal = Object.values(deviceConfidences).some(c => c.needs_calibration);
                            const hasFailure = Object.values(deviceConfidences).some(c => c.has_hardware_failure);
                            if (hasFailure) return 'Hardware Issue';
                            if (needsCal) return 'Calibration Needed';
                            return 'ML Verified';
                        })()}
                    />
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compliance Pie */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Compliance Status</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={COMPLIANCE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                {COMPLIANCE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-2">
                        {COMPLIANCE_DATA.map(d => (
                            <div key={d.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">{d.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Emission Bars */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Chamber Emissions vs Limit (60 ppm)</h2>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={emissionData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="emission" fill="#1890ff" radius={[6, 6, 0, 0]} name="Emission (ppm)" />
                            <Bar dataKey="limit" fill="#ff4d4f" radius={[6, 6, 0, 0]} name="Limit (ppm)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Compliance Trend (5 Months)</h2>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={MONTHLY_TREND}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="compliant" stroke="#52c41a" strokeWidth={2} name="Compliant %" />
                        <Line type="monotone" dataKey="warning" stroke="#faad14" strokeWidth={2} name="Warning %" />
                        <Line type="monotone" dataKey="nonComp" stroke="#ff4d4f" strokeWidth={2} name="Non-Compliant %" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Device Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Device Status</h2>
                    <div className="flex items-center gap-1 text-xs text-success-600">
                        <RefreshCw className="w-3 h-3" /> Auto-updating
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                {['Device', 'Name', 'Emission', 'PM2.5', 'CO', 'Uptime', 'Status'].map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {devices.map(d => (
                                <tr key={d.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="py-4 px-4 text-sm font-mono text-primary-600 font-medium">{d.id}</td>
                                    <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">{d.name}</td>
                                    <td className={`py-4 px-4 text-sm font-semibold ${d.emission > 60 ? 'text-danger-600' : 'text-gray-700 dark:text-gray-300'}`}>{d.emission} ppm</td>
                                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{d.pm25} μg/m³</td>
                                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{d.co} ppm</td>
                                    <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300">{d.uptime}%</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${d.status === 'compliant' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                            {d.status === 'compliant' ? '✓ Compliant' : '⚠ Warning'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        {deviceConfidences[d.id] ? (
                                            <SensorConfidenceBadge confidence={deviceConfidences[d.id]} compact />
                                        ) : (
                                            <span className="text-xs text-gray-400">Loading...</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Anomalies */}
            {visibleAnomalies.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Anomalies</h2>
                    <div className="space-y-3">
                        {visibleAnomalies.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <AlertTriangle className={`w-5 h-5 ${a.severity === 'high' ? 'text-danger-600' : a.severity === 'medium' ? 'text-warning-600' : 'text-blue-600'}`} />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{a.type}</p>
                                        <p className="text-sm text-gray-500">{a.device} · {a.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.severity === 'high' ? 'bg-danger-100 text-danger-700' : a.severity === 'medium' ? 'bg-warning-100 text-warning-700' : 'bg-blue-100 text-blue-700'}`}>{a.severity}</span>
                                    <button onClick={() => setDismissedAnomalies(d => [...d, a.id])} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Dismiss</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color, badge }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}><Icon className="w-6 h-6" /></div>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{badge}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
