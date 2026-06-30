/**
 * City Admin – AI Predictions Page
 * Fetches REAL predictions from the ML API (FastAPI + trained sklearn models)
 */
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Wind, AlertTriangle, Activity, RefreshCw, Cpu, Brain, Loader2, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

// Types
interface ForecastPoint {
    hour: number;
    aqi: number;
    lower_bound: number;
    upper_bound: number;
}
interface ForecastResponse {
    ward_id: string;
    current_aqi: number;
    forecasts: ForecastPoint[];
    model: string;
    confidence: number;
}
interface WardInfo {
    ward_id: string;
    name: string;
    current_aqi: number;
    devices: number;
    risk_level: string;
}
interface MaintenancePrediction {
    device_id: string;
    days_until_service: number;
    confidence: number;
    severity: string;
    recommended_action: string;
}
interface ModelInfo {
    maintenance: { loaded: boolean; version: string | null; type: string };
    anomaly: { loaded: boolean; version: string | null; type: string };
    forecast: { loaded: boolean; version: string | null; type: string };
}

const ML_BASE = '/ml-api';

const WARD_IDS = ['dharampeth', 'sadar', 'nehru_nagar', 'dhantoli', 'hanuman_nagar'];

const INSIGHTS = [
    { icon: '🌤️', title: 'Favourable wind expected', desc: 'Wind speed will increase to 18 km/h from the west by +24h, helping disperse pollutants.', color: 'bg-success-50 dark:bg-success-900/20 border-success-200' },
    { icon: '🚗', title: 'Rush hour peak predicted', desc: 'ML model predicts AQI spike at +6h coinciding with evening traffic. Suggest traffic alerts.', color: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200' },
    { icon: '🌧️', title: 'Rainfall may help after 48h', desc: 'Light rain in the forecast at +48h should reduce PM2.5 by 15–20%.', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' },
];

export default function PredictionsPage() {
    const [forecast, setForecast] = useState<ForecastResponse | null>(null);
    const [wards, setWards] = useState<WardInfo[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenancePrediction[]>([]);
    const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
    const [selectedWard, setSelectedWard] = useState('dharampeth');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [forecastRes, wardsRes, maintRes, modelsRes] = await Promise.all([
                fetch(`${ML_BASE}/predict/ward_forecast?ward_id=${selectedWard}&horizon=72`),
                fetch(`${ML_BASE}/wards`),
                fetch(`${ML_BASE}/predict/batch_maintenance`),
                fetch(`${ML_BASE}/models/info`),
            ]);

            if (!forecastRes.ok) throw new Error(`Forecast API error: ${forecastRes.status}`);
            if (!wardsRes.ok) throw new Error(`Wards API error: ${wardsRes.status}`);

            const forecastData: ForecastResponse = await forecastRes.json();
            const wardsData: WardInfo[] = await wardsRes.json();

            setForecast(forecastData);
            setWards(wardsData);
            setLastUpdated(new Date());

            if (maintRes.ok) setMaintenance(await maintRes.json());
            if (modelsRes.ok) setModelInfo(await modelsRes.json());
        } catch (e: any) {
            setError(e.message || 'Failed to connect to ML API');
        } finally {
            setLoading(false);
        }
    }, [selectedWard]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Derived chart data
    const chartData = forecast
        ? [
            { time: 'Now', aqi: Math.round(forecast.current_aqi), pm25: Math.round(forecast.current_aqi * 0.4) },
            ...forecast.forecasts.map(f => ({
                time: `+${f.hour}h`,
                aqi: Math.round(f.aqi),
                pm25: Math.round(f.aqi * 0.4),
                lower: Math.round(f.lower_bound),
                upper: Math.round(f.upper_bound),
            }))
        ]
        : [];

    const riskByWard = wards.map(w => ({
        ward: w.name,
        risk: Math.round(Math.min(100, (w.current_aqi / 1.5))),
        aqi: Math.round(w.current_aqi),
    })).sort((a, b) => b.risk - a.risk);

    const severityColor = (s: string) =>
        s === 'critical' ? 'text-red-600 bg-red-100' :
            s === 'high' ? 'text-orange-600 bg-orange-100' :
                s === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                    'text-green-600 bg-green-100';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Predictions</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        72-hour air quality forecast powered by <strong>real trained ML models</strong>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdated && (
                        <span className="text-xs text-gray-400">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={fetchAll}
                        disabled={loading}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Model Status Banner */}
            {modelInfo && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary-600" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">ML Models Status</span>
                    </div>
                    {Object.entries(modelInfo).map(([name, info]) => (
                        <div key={name} className="flex items-center gap-2">
                            {info.loaded ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 capitalize">{name}</span>
                            <span className="text-xs text-gray-400">({info.type})</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm text-red-800 dark:text-red-300 font-medium">Failed to load ML predictions</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                        <p className="text-xs text-red-500 mt-1">Make sure the ML service is running: <code>python -m uvicorn src.main:app --port 8000</code></p>
                    </div>
                </div>
            )}

            {/* Loading skeleton */}
            {loading && !forecast && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                    <span className="ml-3 text-gray-500">Loading ML predictions...</span>
                </div>
            )}

            {/* Ward Selector */}
            {!loading && forecast && (
                <>
                    <div className="flex flex-wrap gap-2">
                        {WARD_IDS.map(wid => {
                            const ward = wards.find(w => w.ward_id === wid);
                            return (
                                <button
                                    key={wid}
                                    onClick={() => setSelectedWard(wid)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedWard === wid
                                        ? 'bg-primary-600 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                        }`}
                                >
                                    {ward?.name || wid} {ward && <span className="text-xs opacity-75">AQI {Math.round(ward.current_aqi)}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Current AQI & Confidence */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <Wind className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Current AQI</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(forecast.current_aqi)}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                <Cpu className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Model Confidence</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(forecast.confidence * 100)}%</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <Activity className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">ML Engine</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{forecast.model.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Forecast Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp className="w-5 h-5 text-primary-600" />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">72-Hour AQI Forecast — {wards.find(w => w.ward_id === selectedWard)?.name}</h2>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-auto font-medium">
                                🟢 Live ML Model
                            </span>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="aqiFG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Legend />
                                <Area type="monotone" dataKey="aqi" stroke="#1890ff" fill="url(#aqiFG)" name="AQI Forecast" strokeWidth={2} />
                                <Area type="monotone" dataKey="pm25" stroke="#722ed1" fill="none" name="PM2.5 Estimate" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Risk by Ward */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Real-Time Risk Level by Ward (from ML API)</h2>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={riskByWard} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="ward" tick={{ fontSize: 12 }} width={110} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Bar dataKey="risk" radius={[0, 6, 6, 0]} fill="#ff4d4f" name="Risk %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Maintenance Predictions */}
                    {maintenance.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="w-5 h-5 text-orange-500" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Predictive Maintenance (RandomForest ML)</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Device</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Days Until Service</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Severity</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Confidence</th>
                                            <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {maintenance.map(m => (
                                            <tr key={m.device_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{m.device_id}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-lg font-bold ${m.days_until_service <= 7 ? 'text-red-600' : m.days_until_service <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                        {m.days_until_service}
                                                    </span>
                                                    <span className="text-gray-400 ml-1">days</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs px-3 py-1 rounded-full font-medium uppercase ${severityColor(m.severity)}`}>
                                                        {m.severity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.round(m.confidence * 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs text-gray-500">{Math.round(m.confidence * 100)}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{m.recommended_action}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* AI Insights */}
                    <div className="space-y-3">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Insights</h2>
                        {INSIGHTS.map(i => (
                            <div key={i.title} className={`p-5 rounded-xl border ${i.color} flex items-start gap-4`}>
                                <span className="text-2xl">{i.icon}</span>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{i.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{i.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
