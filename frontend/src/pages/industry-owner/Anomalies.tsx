/**
 * Industry Owner - Anomalies Page
 * Uses ML Isolation Forest model for anomaly detection on industrial emission data
 * Fetches real-time ward data and runs anomaly checks
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Activity, Brain, RefreshCw, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend
} from 'recharts';

const ML_BASE = '/ml-api';

interface AnomalyResult {
    chamber: string;
    ward_id: string;
    is_anomaly: boolean;
    anomaly_score: number;
    pm25: number;
    co: number;
    nox: number;
    temp: number;
    reason: string;
}

// Industrial chambers mapped to wards
const CHAMBERS = [
    { chamber: 'Boiler Unit A', ward_id: 'dhantoli', factor: 1.2 },
    { chamber: 'Exhaust Line B', ward_id: 'sadar', factor: 0.9 },
    { chamber: 'Stack C (Main)', ward_id: 'dhantoli', factor: 1.5 },
    { chamber: 'Furnace D', ward_id: 'dharampeth', factor: 0.8 },
];

export default function AnomaliesPage() {
    const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastScan, setLastScan] = useState(new Date());
    const [dismissed, setDismissed] = useState<string[]>([]);
    const { t } = useLanguage();

    const runAnomalyDetection = useCallback(async () => {
        try {
            // Step 1: Fetch current ward data for each chamber
            const wardIds = [...new Set(CHAMBERS.map(c => c.ward_id))];
            const wardData: Record<string, any> = {};

            for (const wid of wardIds) {
                const res = await fetch(`${ML_BASE}/simulate/ward/${wid}`);
                if (res.ok) wardData[wid] = await res.json();
            }

            // Step 2: Try to run through ML anomaly model
            const results: AnomalyResult[] = [];

            for (const ch of CHAMBERS) {
                const ward = wardData[ch.ward_id];
                if (!ward) continue;

                const pm25 = Math.round(ward.pm25 * ch.factor * 10) / 10;
                const co = Math.round(ward.co * ch.factor * 10) / 10;
                const nox = Math.round(ward.nox * ch.factor * 100) / 100;
                const temp = ward.temp;

                // Try ML-based anomaly detection
                let is_anomaly = false;
                let anomaly_score = 0;
                let reason = '';

                try {
                    const mlRes = await fetch(`${ML_BASE}/predict/anomaly`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            readings: [pm25, co, nox * 100, temp, ward.humidity],
                            method: 'isolation_forest',
                        }),
                    });
                    if (mlRes.ok) {
                        const mlData = await mlRes.json();
                        is_anomaly = mlData.is_anomaly;
                        anomaly_score = mlData.anomaly_score || 0;
                        reason = mlData.anomaly_details || '';
                    }
                } catch {
                    // Fallback: threshold-based anomaly detection
                    const thresholds = { pm25: 50, co: 20, nox: 0.8 };
                    const violations = [];
                    if (pm25 > thresholds.pm25) violations.push(`PM2.5 at ${pm25} exceeds ${thresholds.pm25}`);
                    if (co > thresholds.co) violations.push(`CO at ${co} exceeds ${thresholds.co}`);
                    if (nox > thresholds.nox) violations.push(`NOx at ${nox} exceeds ${thresholds.nox}`);
                    is_anomaly = violations.length > 0;
                    anomaly_score = violations.length / 3;
                    reason = violations.join('; ') || 'All values within normal range';
                }

                results.push({
                    chamber: ch.chamber,
                    ward_id: ch.ward_id,
                    is_anomaly,
                    anomaly_score: Math.round(anomaly_score * 100) / 100,
                    pm25, co, nox, temp,
                    reason: reason || (is_anomaly ? 'Anomalous pattern detected by ML model' : 'Normal operating range'),
                });
            }

            setAnomalies(results);
            setLastScan(new Date());

            // Step 3: Fetch hourly trend for the main industrial ward
            const hourlyRes = await fetch(`${ML_BASE}/simulate/ward_hourly/dhantoli?hours=24`);
            if (hourlyRes.ok) {
                const raw = await hourlyRes.json();
                setHourlyData(raw.map((point: any) => ({
                    ...point,
                    // Industrial multiplier
                    ind_pm25: Math.round(point.pm25 * 1.3 * 10) / 10,
                    ind_co: Math.round(point.co * 1.3 * 10) / 10,
                    threshold: 50,
                })));
            }
        } catch (e) {
            console.error('Anomaly detection failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        runAnomalyDetection();
        const interval = setInterval(runAnomalyDetection, 15000);
        return () => clearInterval(interval);
    }, []);

    const detectedCount = anomalies.filter(a => a.is_anomaly).length;
    const normalCount = anomalies.filter(a => !a.is_anomaly).length;
    const visibleAnomalies = anomalies.filter(a => !dismissed.includes(a.chamber));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Brain className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">Running ML anomaly detection...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Anomaly Detection</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        ML-based emission anomaly detection
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">🧠 Isolation Forest</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Last scan: {lastScan.toLocaleTimeString()}</span>
                    <button onClick={runAnomalyDetection} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
                        <RefreshCw className="w-4 h-4" /> Re-scan
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Chambers Scanned</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{anomalies.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-danger-100 dark:bg-danger-900/30 text-danger-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Anomalies Detected</p>
                            <p className="text-2xl font-bold text-danger-600">{detectedCount}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-success-100 dark:bg-success-900/30 text-success-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Normal Operation</p>
                            <p className="text-2xl font-bold text-success-600">{normalCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Anomaly Cards */}
            <div className="space-y-3">
                {visibleAnomalies.map(a => (
                    <div
                        key={a.chamber}
                        className={`p-5 rounded-xl border ${a.is_anomaly
                            ? 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800'
                            : 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                            }`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                {a.is_anomaly ? (
                                    <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-semibold text-gray-900 dark:text-white">{a.chamber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.is_anomaly ? 'bg-danger-200 text-danger-800' : 'bg-success-200 text-success-800'}`}>
                                            {a.is_anomaly ? 'ANOMALY' : 'NORMAL'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{a.reason}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>PM2.5: {a.pm25} μg/m³</span>
                                        <span>CO: {a.co} ppm</span>
                                        <span>NOx: {a.nox} ppm</span>
                                        <span>Temp: {a.temp}°C</span>
                                        {a.anomaly_score > 0 && <span className="font-semibold">Score: {a.anomaly_score}</span>}
                                    </div>
                                </div>
                            </div>
                            {a.is_anomaly && (
                                <button
                                    onClick={() => setDismissed(d => [...d, a.chamber])}
                                    className="text-xs bg-white/60 dark:bg-black/30 px-3 py-1.5 rounded-lg font-medium"
                                >
                                    Acknowledge
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 24-Hour Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">24-Hour Industrial Emission Trend</h2>
                <p className="text-sm text-gray-500 mb-4">Industrial PM2.5 (Dhantoli ward × 1.3x chamber factor) — anomalies appear above the red threshold line</p>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Line type="monotone" dataKey="ind_pm25" stroke="#1890ff" strokeWidth={2} dot={false} name="Industrial PM2.5" />
                        <Line type="monotone" dataKey="ind_co" stroke="#722ed1" strokeWidth={2} dot={false} name="Industrial CO" />
                        <Line type="monotone" dataKey="threshold" stroke="#ff4d4f" strokeWidth={2} strokeDasharray="5 5" dot={false} name="CPCB Limit" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* How it works */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary-600" /> How Anomaly Detection Works
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">1. Data Collection</p>
                        <p>Real-time ward simulation provides correlated PM2.5, CO, NOx, temperature, and humidity values.</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">2. ML Analysis</p>
                        <p>Isolation Forest model (trained on 60 days of data) identifies patterns that deviate from normal operation.</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">3. Alert Generation</p>
                        <p>Anomalous data points trigger alerts. Threshold-based rules provide backup detection if ML is unavailable.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
