import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Download, CheckCircle, Clock, Lightbulb, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Governance() {
    const [status] = useState<'Compliant' | 'Warning' | 'Violation'>('Warning');
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
    const { t } = useLanguage();

    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
        return () => clearInterval(t);
    }, []);

    const statusColors = {
        Compliant: 'bg-green-100 text-green-800 border-green-200',
        Warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        Violation: 'bg-red-100 text-red-800 border-red-200'
    };

    const handleExportPDF = () => {
        alert("Downloading CPCB Compliance Report...");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" />
                        {t('generator_governance')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('generator_gov_subtitle')}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-xl">
                        {t('generator_gov_desc')}
                    </p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2 ${statusColors[status]}`}>
                        {status === 'Compliant' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {t('cpcb_status')}: {t(status.toLowerCase())}
                    </div>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        {t('export_pdf')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Emission / kWh</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">2.4g</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <Zap className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Maintenance Due</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">12 Days</h3>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-lg">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Predictive Risk</p>
                            <h3 className="text-2xl font-bold text-yellow-600 mt-1">Warning</h3>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensor Drift</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Normal</h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                            <Lightbulb className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fuel vs Emission</h3>
                    <div className="h-64 flex items-end gap-2">
                        {[40, 45, 50, 48, 60, 65, 80].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end group h-full">
                                <div
                                    className={`w-full rounded-t-sm transition-all duration-300 ${val > 70 ? 'bg-red-500' : 'bg-primary-500 group-hover:bg-primary-600'}`}
                                    style={{ height: `${val}%` }}
                                ></div>
                                <div className="text-[10px] text-center mt-2 text-gray-500 truncate">H {idx + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Runtime Anomaly Log</h3>
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">{currentTime}</span>
                    </div>
                    <div className="space-y-4">
                        {[
                            { time: '10:45 AM', event: 'Residual drift detected on NO2 sensor', type: 'Warning' },
                            { time: '09:00 AM', event: 'Load exceeded 80% capacity', type: 'Alert' },
                            { time: '08:30 AM', event: 'System startup normal', type: 'Info' }
                        ].map((log, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className={`mt-0.5 w-2 h-2 rounded-full ${log.type === 'Alert' ? 'bg-red-500' : log.type === 'Warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{log.event}</p>
                                    <p className="text-xs text-gray-500 mt-1">{log.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts & Maintenance Actions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Issue</th>
                                <th className="px-6 py-3 font-medium">Action Required</th>
                                <th className="px-6 py-3 font-medium">Priority</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Today</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Emission Cap Reached</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Reduce payload capacity to avoid fines</td>
                                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">High</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
