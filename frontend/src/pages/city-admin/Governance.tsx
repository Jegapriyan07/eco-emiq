import { useState } from 'react';
import { Shield, Map, BarChart2, Bell, CheckCircle, AlertTriangle, Radio, Megaphone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Governance() {
    const [status] = useState<'Compliant' | 'Warning' | 'Violation'>('Warning');
    const { t } = useLanguage();

    const handleBroadcast = () => alert("Triggering Emergency Broadcast to all affected high-pollution zones...");
    const handleIssueNotice = () => alert("Opening Issue Notice Portal...");
    const handleEnforceLimits = () => alert("Enforcing new dynamic emission caps via API to all registered IoT devices...");
    const handleAction = (action: string) => alert(`Executing: ${action}`);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" />
                        {t('city_admin_governance')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 flex flex-col gap-1">
                        <span>{t('city_admin_gov_subtitle')}</span>
                        <span className="text-sm max-w-xl">{t('city_admin_gov_desc')}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2 ${status === 'Compliant' ? 'bg-green-100 text-green-800' : status === 'Warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {status === 'Compliant' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        Status: {status}
                    </div>
                    <button onClick={handleBroadcast} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                        <Megaphone className="w-4 h-4" />
                        {t('emergency_broadcast_btn')}
                    </button>
                    <button onClick={handleIssueNotice} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                        <Bell className="w-4 h-4" />
                        {t('issue_notice_btn')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">High Polluting Zones</p>
                            <h3 className="text-2xl font-bold text-red-600 mt-1">4 Areas</h3>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                            <Map className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Violations</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1,245</h3>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fines Generated</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹4.2L</h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                            <BarChart2 className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensor Anomalies</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">12</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <Radio className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Emission Forecast</h3>
                    <div className="h-64 flex items-end gap-2 relative">
                        {/* Forecast Area */}
                        <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-blue-50/50 dark:bg-blue-900/10 border-l border-dashed border-blue-200 z-0"></div>
                        <span className="absolute top-2 right-4 text-xs font-medium text-blue-500 z-10">Forecast</span>
                        {[60, 65, 55, 75, 80, 70, 85, 90, 88, 95].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end group h-full z-10 w-full">
                                <div
                                    className={`w-full rounded-t-sm transition-all duration-300 ${idx >= 6 ? 'bg-blue-400 hover:bg-blue-500' : val > 75 ? 'bg-red-500' : 'bg-primary-500'}`}
                                    style={{ height: `${val}%` }}
                                ></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dynamic Threshold Control</h3>
                    <div className="space-y-4">
                        <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">City Center AQI Cap</span>
                                <span className="text-sm text-primary-600 font-bold">150</span>
                            </div>
                            <input type="range" min="50" max="300" defaultValue="150" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600" />
                        </div>
                        <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between mb-2">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">Industrial Zone Cap (PM2.5)</span>
                                <span className="text-sm text-primary-600 font-bold">60 µg/m³</span>
                            </div>
                            <input type="range" min="20" max="150" defaultValue="60" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600" />
                        </div>
                        <button onClick={handleEnforceLimits} className="w-full py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity">
                            Enforce New Limits
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Violators Ranking</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Rank</th>
                                <th className="px-6 py-3 font-medium">Entity Name</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 font-medium">Violations</th>
                                <th className="px-6 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-red-600 font-bold">#1</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">ABC Chemicals Ltd.</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Industry</td>
                                <td className="px-6 py-4">24</td>
                                <td className="px-6 py-4"><button onClick={() => handleAction('Draft Notice')} className="text-primary-600 hover:text-primary-700 font-medium">Draft Notice</button></td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-orange-500 font-bold">#2</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">MH 12 AB 1234</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Commercial Vehicle</td>
                                <td className="px-6 py-4">15</td>
                                <td className="px-6 py-4"><button onClick={() => handleAction('Auto-Fine')} className="text-primary-600 hover:text-primary-700 font-medium">Auto-Fine</button></td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-yellow-500 font-bold">#3</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Tech Park DG-4</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Generator</td>
                                <td className="px-6 py-4">8</td>
                                <td className="px-6 py-4"><button onClick={() => handleAction('View Logs')} className="text-primary-600 hover:text-primary-700 font-medium">View Logs</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
