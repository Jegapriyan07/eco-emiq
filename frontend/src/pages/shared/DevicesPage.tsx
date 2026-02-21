/**
 * Shared Devices Page
 * Used by both vehicle-owner and city-admin
 */
import { Wifi, Battery, Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const generateDevices = (n: number) => Array.from({ length: n }, (_, i) => ({
    id: `ET-${(1000 + i).toString()}`,
    name: `Sensor Node ${i + 1}`,
    type: i % 3 === 0 ? 'Air Quality' : i % 3 === 1 ? 'Emission' : 'Weather',
    status: Math.random() > 0.1 ? 'online' : 'offline',
    battery: Math.floor(Math.random() * 60 + 40),
    signal: Math.floor(Math.random() * 40 + 60),
    lastSeen: `${Math.floor(Math.random() * 5 + 1)} min ago`,
    firmware: '2.1.4',
}));

const DEVICES = generateDevices(12);

export default function DevicesPage() {
    const [filter, setFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const filtered = filter === 'all' ? DEVICES : DEVICES.filter(d => d.status === filter);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Devices</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{DEVICES.filter(d => d.status === 'online').length} / {DEVICES.length} devices online</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white">
                        <option value="all">All Devices</option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(d => (
                    <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-xs font-medium text-gray-500 uppercase">{d.status}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-400">{d.id}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <Wifi className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm">{d.name}</p>
                                <p className="text-xs text-gray-500">{d.type}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                <Battery className="w-4 h-4 mx-auto text-gray-500 mb-1" />
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{d.battery}%</p>
                                <p className="text-xs text-gray-400">Battery</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                <Activity className="w-4 h-4 mx-auto text-gray-500 mb-1" />
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{d.signal}%</p>
                                <p className="text-xs text-gray-400">Signal</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                                <span className="text-xs font-semibold text-gray-900 dark:text-white block mt-1">{d.lastSeen}</span>
                                <p className="text-xs text-gray-400">Last Seen</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">Firmware {d.firmware}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
