import { useState } from 'react';
import { Shield, AlertCircle, Download, CheckCircle, TrendingUp, DollarSign, Award, Gauge } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Governance() {
    const [status] = useState<'Compliant' | 'Warning' | 'Violation'>('Compliant');

    const { t } = useLanguage();

    const statusColors = {
        Compliant: 'bg-green-100 text-green-800 border-green-200',
        Warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        Violation: 'bg-red-100 text-red-800 border-red-200'
    };

    const handleExportPDF = () => {
        alert("Generating Governance Compliance PDF Report...");
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" />
                        {t('vehicle_governance')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('vehicle_gov_subtitle')}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-xl">
                        {t('vehicle_gov_desc')}
                    </p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2 ${statusColors[status]}`}>
                        {status === 'Compliant' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {t('puc_status')}: {t(status.toLowerCase())}
                    </div>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        {t('export_pdf')}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('driving_behavior')}</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">85/100</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <Gauge className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm mt-4 text-green-600 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> +2% vs last month</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fuel Efficiency</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">18.5 km/l</h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm mt-4 text-green-600 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Optimal range</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Carbon Credits</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">240 pts</h3>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                            <Award className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm mt-4 text-gray-500 dark:text-gray-400">Next tier at 300 pts</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('est_fines')}</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₹0</h3>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                    <p className="text-sm mt-4 text-gray-500 dark:text-gray-400">No overdue fines</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Emission vs Limit (BS6)</h3>
                    <div className="h-64 flex items-end gap-2">
                        {[40, 60, 45, 70, 50, 85, 55].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end group h-full">
                                <div
                                    className={`w-full rounded-t-sm transition-all duration-300 ${val > 80 ? 'bg-red-500' : 'bg-primary-500 group-hover:bg-primary-600'}`}
                                    style={{ height: `${val}%` }}
                                ></div>
                                <div className="text-xs text-center mt-2 text-gray-500 text-[10px] truncate">Day {idx + 1}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary-500 rounded-full"></div>Actual</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div>Limit Exceeded</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 w-full text-left">Eco Score Gauge</h3>
                    <div className="relative w-48 h-48 border-[12px] border-gray-100 dark:border-gray-700 rounded-full border-b-transparent border-l-primary-500 border-t-primary-500 transform -rotate-45 flex items-center justify-center">
                        <div className="transform rotate-45 text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4 ml-4">
                            <span className="text-4xl font-bold text-gray-900 dark:text-white">85</span>
                            <span className="block text-sm text-gray-500 dark:text-gray-400">/100</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Violation History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Type</th>
                                <th className="px-6 py-3 font-medium">Description</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Today, 10:45 AM</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Hard Braking</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Harsh braking event recorded.</td>
                                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Warning</span></td>
                            </tr>
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">Oct 12, 2023</td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">PUC Expired</td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">PUC certificate manually renewed.</td>
                                <td className="px-6 py-4"><span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Resolved</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
