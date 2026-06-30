/**
 * Generator Owner – Logs Page
 */
import { Download } from 'lucide-react';

const LOGS = Array.from({ length: 20 }, (_, i) => {
    const d = new Date('2026-02-17T12:00:00');
    d.setHours(d.getHours() - i);
    const em = 40 + Math.round(Math.sin(i) * 20);
    return {
        id: i + 1,
        timestamp: d.toLocaleString(),
        emission: em,
        load: 70 + Math.round(Math.random() * 20),
        fuel: 14 + Math.round(Math.random() * 8),
        temp: 75 + Math.round(Math.random() * 10),
        status: em > 65 ? 'alert' : 'normal',
    };
});

export default function LogsPage() {
    const handleExport = () => {
        const csv = ['Timestamp,Emission,Load,Fuel,Temp,Status', ...LOGS.map(l => `${l.timestamp},${l.emission},${l.load},${l.fuel},${l.temp},${l.status}`)].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'generator_full_logs.csv'; a.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emission Logs</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Hourly emission log entries for DG Set Unit #1</p>
                </div>
                <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700">
                                {['#', 'Timestamp', 'Emission (ppm)', 'Load (%)', 'Fuel (L/h)', 'Temp (°C)', 'Status'].map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {LOGS.map(l => (
                                <tr key={l.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-3 px-4 text-sm text-gray-400">{l.id}</td>
                                    <td className="py-3 px-4 text-sm font-mono text-gray-700 dark:text-gray-300">{l.timestamp}</td>
                                    <td className={`py-3 px-4 text-sm font-semibold ${l.emission > 65 ? 'text-danger-600' : 'text-gray-700 dark:text-gray-300'}`}>{l.emission}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{l.load}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{l.fuel}</td>
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{l.temp}</td>
                                    <td className="py-3 px-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${l.status === 'alert' ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700'}`}>{l.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
