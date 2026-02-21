/**
 * Industry Owner - Organization Page
 * Manage organizational structure, employees, and device hierarchy
 */
import { Users, Shield, Building, Key } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const EMPLOYEES = [
    { id: 1, name: 'Anand Kumar', role: 'Owner', email: 'owner@demo.com', status: 'active' },
    { id: 2, name: 'Rajesh Singh', role: 'Plant Manager', email: 'rajesh@demo.com', status: 'active' },
    { id: 3, name: 'Priya Mehta', role: 'Safety Officer', email: 'priya@demo.com', status: 'active' },
    { id: 4, name: 'Amit Sharma', role: 'Technician', email: 'amit@demo.com', status: 'on-leave' },
];

export default function OrganizationPage() {
    const { t } = useLanguage();
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('organization')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('employees')} & {t('facilities')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                            <Building className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('facility_name')}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">Chennai Steel Works</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{t('employee_count')}</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{EMPLOYEES.length} {t('active')}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg text-green-600">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Subscription</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">Enterprise Pro</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Team Members</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {EMPLOYEES.map(e => (
                                <tr key={e.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{e.name}</td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                        <Key className="w-3 h-3 text-gray-400" /> {e.role}
                                    </td>
                                    <td className="py-4 px-4 text-gray-500">{e.email}</td>
                                    <td className="py-4 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <button className="text-blue-600 hover:underline text-sm font-medium">Edit</button>
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
