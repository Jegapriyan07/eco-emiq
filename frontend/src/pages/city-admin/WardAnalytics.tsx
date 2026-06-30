/**
 * City Admin - Ward Analytics Page
 * Fetches correlated ward data from simulation engine
 */
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { MapPin, RefreshCw } from 'lucide-react';

const ML_BASE = '/ml-api';

interface WardState {
    ward_id: string;
    name: string;
    aqi: number;
    pm1_0: number;
    pm25: number;
    pm4_0: number;
    pm10_0: number;
    co: number;
    nox: number;
    no2: number;
    nh3: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    temp: number;
    humidity: number;
    wind_speed: number;
    devices: number;
    online_devices: number;
    alerts: any[];
    risk_level: string;
    traffic_load: number;
}

const COLORS = ['#1890ff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1'];

export default function WardAnalyticsPage() {
    const [wards, setWards] = useState<WardState[]>([]);
    const [selected, setSelected] = useState<WardState | null>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [wardsRes, trendsRes] = await Promise.all([
                fetch(`${ML_BASE}/simulate/city`),
                fetch(`${ML_BASE}/simulate/ward_trends`),
            ]);

            if (wardsRes.ok) {
                const data = await wardsRes.json();
                setWards(data.wards);
                if (!selected) setSelected(data.wards[0]);
                else {
                    const updated = data.wards.find((w: WardState) => w.ward_id === selected.ward_id);
                    if (updated) setSelected(updated);
                }
            }

            if (trendsRes.ok) setTrends(await trendsRes.json());
        } catch (e) {
            console.error('Ward analytics fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, [selected]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !selected) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">Loading ward analytics...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ward Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Detailed per-ward emission and air quality analysis — powered by simulation engine</p>
            </div>

            {/* Ward Selector Row */}
            <div className="flex gap-3 flex-wrap">
                {wards.map(w => (
                    <button key={w.ward_id} onClick={() => setSelected(w)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selected.ward_id === w.ward_id ? 'bg-primary-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}>
                        <MapPin className="w-4 h-4" /> {w.name}
                        {w.alerts.length > 0 && <span className="bg-danger-500 text-white text-xs px-1.5 rounded-full">{w.alerts.length}</span>}
                    </button>
                ))}
            </div>

            {/* Selected Ward Detail */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className={`p-6 rounded-xl text-white ${selected.aqi <= 50 ? 'bg-success-500' : selected.aqi <= 100 ? 'bg-warning-500' : 'bg-danger-500'}`}>
                    <p className="text-sm opacity-80">{selected.name} · Current AQI</p>
                    <p className="text-5xl font-black mt-2">{selected.aqi}</p>
                    <p className="text-sm mt-1 opacity-80">{selected.aqi <= 50 ? 'Good' : selected.aqi <= 100 ? 'Moderate' : 'Unhealthy'}</p>
                    <p className="text-xs mt-2 opacity-60">Traffic load: {Math.round(selected.traffic_load * 100)}%</p>
                </div>
                {[
                    { label: 'PM1.0', val: `${selected.pm1_0} μg/m³` },
                    { label: 'PM2.5', val: `${selected.pm25} μg/m³` },
                    { label: 'PM4.0', val: `${selected.pm4_0} μg/m³` },
                    { label: 'PM10.0', val: `${selected.pm10_0} μg/m³` },
                    { label: 'CO', val: `${selected.co} ppm` },
                    { label: 'NH3', val: `${selected.nh3} ppm` },
                    { label: 'NO2', val: `${selected.no2} ppm` },
                    { label: 'Carbon Footprint', val: `${selected.carbon_footprint} kg CO₂e` },
                    { label: 'Drift Score', val: `${selected.drift_intelligence_score}` },
                    { label: 'Temperature', val: `${selected.temp}°C` },
                    { label: 'Devices Online', val: `${selected.online_devices}/${selected.devices}` },
                    { label: 'Risk Level', val: selected.risk_level.charAt(0).toUpperCase() + selected.risk_level.slice(1) },
                ].map(m => (
                    <div key={m.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{m.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{m.val}</p>
                    </div>
                ))}
            </div>

            {/* Bar Chart – All Wards Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AQI Comparison (Live)</h2>
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={wards}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-10} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Bar dataKey="aqi" radius={[6, 6, 0, 0]} fill="#1890ff" name="AQI" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Line chart - Throughout the day */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Today's AQI by Ward
                    <span className="text-xs text-gray-400 ml-3 font-normal">Values correlate with traffic rush hours</span>
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        {wards.map((w, i) => (
                            <Line key={w.name} type="monotone" dataKey={w.name} stroke={COLORS[i]} strokeWidth={2} dot={false} />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
