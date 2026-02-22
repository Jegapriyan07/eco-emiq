import { useState } from 'react';
import { Shield, AlertTriangle, Download, CheckCircle, Activity, Layers, Droplets } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Governance() {
    const [status] = useState<'Compliant' | 'Warning' | 'Violation'>('Compliant');
    const { t } = useLanguage();

    const statusColors = {
        Compliant: 'bg-green-100 text-green-800 border-green-200',
        Warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        Violation: 'bg-red-100 text-red-800 border-red-200'
    };

    const handleDownloadESG = () => {
        alert("Preparing Complete ESG & Compliance Report...");
    };

    const handleInspectionMode = () => {
        alert("Activating Auditor Read-Only Interface Mode...");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-600" />
                        {t('industry_governance')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{t('industry_gov_subtitle')}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-xl">
                        {t('industry_gov_desc')}
                    </p>
                </div>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className={`px-4 py-2 rounded-full border text-sm font-semibold flex items-center gap-2 ${statusColors[status]}`}>
                        {status === 'Compliant' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {t('spcb_norms')}: {t(status.toLowerCase())}
                    </div>
                    <button onClick={handleDownloadESG} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-sm transition-colors text-sm font-medium">
                        <Download className="w-4 h-4" />
                        {t('download_esg')}
                    </button>
                    <button onClick={handleInspectionMode} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg shadow-sm transition-colors text-sm font-medium">
                        {t('inspection_mode')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ESG Score</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">A+</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                            <Activity className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Carbon / Unit</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1.2 kg</h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
                            <Layers className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Legal Risk</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-1">Low</h3>
                        </div>
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg">
                            <Shield className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sustainability Index</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">92%</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <Droplets className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stack Emission Monitoring</h3>
                    <div className="h-64 flex items-end gap-2">
                        {[50, 48, 55, 60, 52, 45, 49].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col justify-end group h-full">
                                <div
                                    className="w-full bg-primary-500 group-hover:bg-primary-600 rounded-t-sm transition-all duration-300"
                                    style={{ height: `${val}%` }}
                                ></div>
                                <div className="text-[10px] text-center mt-2 text-gray-500 truncate">Day {idx + 1}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between text-sm">
                        <span className="text-gray-500">Max Permissible Limit: <strong>100 mg/Nm3</strong></span>
                        <span className="text-primary-600 font-medium">Status: Well below norms</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h3>
                    </div>
                    <div className="p-0 overflow-y-auto max-h-72">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Date</th>
                                    <th className="px-4 py-2 font-medium">Activity</th>
                                    <th className="px-4 py-2 font-medium">Inspector</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 text-gray-500">10/18/2023</td>
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">Annual CPCB Audit</td>
                                    <td className="px-4 py-3 text-gray-500">Dr. Sharma</td>
                                </tr>
                                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 text-gray-500">09/05/2023</td>
                                    <td className="px-4 py-3 text-gray-900 dark:text-white">Filter Calibration</td>
                                    <td className="px-4 py-3 text-gray-500">Internal Team</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
