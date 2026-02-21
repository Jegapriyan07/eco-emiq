/**
 * Generator Owner – Performance Page
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

const DATA = [
    { day: 'Mon', load: 78, efficiency: 84, fuel: 38 },
    { day: 'Tue', load: 85, efficiency: 88, fuel: 42 },
    { day: 'Wed', load: 72, efficiency: 81, fuel: 35 },
    { day: 'Thu', load: 90, efficiency: 92, fuel: 46 },
    { day: 'Fri', load: 88, efficiency: 87, fuel: 44 },
    { day: 'Sat', load: 60, efficiency: 79, fuel: 30 },
    { day: 'Sun', load: 65, efficiency: 82, fuel: 32 },
];

const HOURLY = Array.from({ length: 24 }, (_, i) => ({
    h: `${i.toString().padStart(2, '0')}:00`,
    kw: 20 + Math.round(Math.sin(i / 4) * 15 + Math.random() * 10),
}));

export default function PerformancePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Analytics</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Weekly and daily generator performance metrics</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[{ label: 'Avg Load', val: '79.7%', color: 'text-blue-600' }, { label: 'Avg Efficiency', val: '84.7%', color: 'text-success-600' }, { label: 'Total Fuel', val: '267 L', color: 'text-orange-600' }].map(m => (
                    <div key={m.label} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <p className="text-sm text-gray-500">{m.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${m.color}`}>{m.val}</p>
                        <p className="text-xs text-gray-400 mt-1">This week</p>
                    </div>
                ))}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Weekly Performance</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={DATA}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Bar dataKey="load" fill="#1890ff" radius={[4, 4, 0, 0]} name="Load %" />
                        <Bar dataKey="efficiency" fill="#52c41a" radius={[4, 4, 0, 0]} name="Efficiency %" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Today's Power Output (kW)</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={HOURLY}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="h" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Line type="monotone" dataKey="kw" stroke="#faad14" strokeWidth={2} dot={false} name="kW Output" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
