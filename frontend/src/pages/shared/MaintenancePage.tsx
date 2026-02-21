/**
 * Shared Maintenance Page
 * Used by generator-owner, industry-owner
 */
import { useState } from 'react';
import { Wrench, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';

const TASKS = [
    { id: 1, task: 'Exhaust Filter Replacement', due: '2026-02-22', status: 'overdue', priority: 'high', notes: 'Filter blocked at 87%. Urgent.' },
    { id: 2, task: 'Coolant System Flush', due: '2026-03-01', status: 'due', priority: 'medium', notes: 'Every 500 hours of runtime.' },
    { id: 3, task: 'Battery Check', due: '2026-03-10', status: 'upcoming', priority: 'low', notes: 'Routine check; battery at 78%.' },
    { id: 4, task: 'Oil and Filter Change', due: '2026-03-20', status: 'upcoming', priority: 'medium', notes: 'Every 250 hours or 3 months.' },
    { id: 5, task: 'Emission Calibration', due: '2026-04-01', status: 'upcoming', priority: 'high', notes: 'Annual calibration mandated by CPCB.' },
];

const statusCls = {
    overdue: 'bg-danger-100 text-danger-700',
    due: 'bg-warning-100 text-warning-700',
    upcoming: 'bg-blue-100 text-blue-700',
};

export default function MaintenancePage() {
    const [booked, setBooked] = useState<number[]>([]);
    const overdue = TASKS.filter(t => t.status === 'overdue').length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maintenance Schedule</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Track and book preventive and corrective maintenance</p>
            </div>

            {overdue > 0 && (
                <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-300 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" />
                    <p className="text-sm text-danger-800 dark:text-danger-200 font-medium">{overdue} overdue task(s) require immediate attention.</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Tasks</h2>
                </div>
                {TASKS.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl gap-4 flex-wrap">
                        <div className="flex items-start gap-4">
                            {t.status === 'overdue' ? <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />}
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t.task}</p>
                                <p className="text-sm text-gray-500">{t.notes}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-400">Due: {t.due}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${statusCls[t.status as keyof typeof statusCls]}`}>{t.status}</span>
                            {!booked.includes(t.id) ? (
                                <button onClick={() => setBooked(b => [...b, t.id])} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">Book Service</button>
                            ) : (
                                <span className="text-xs bg-success-100 text-success-700 px-3 py-1.5 rounded-lg font-medium">✓ Booked</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
