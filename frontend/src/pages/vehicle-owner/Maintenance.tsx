/**
 * Vehicle Owner - Maintenance Page
 */
import { Wrench, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const TASKS = [
    { id: 1, task: 'Oil Change', due: '2026-03-04', status: 'upcoming', interval: '5,000 km' },
    { id: 2, task: 'Air Filter Replacement', due: '2026-02-25', status: 'due', interval: '10,000 km' },
    { id: 3, task: 'Emission System Check', due: '2026-02-20', status: 'overdue', interval: 'Annual' },
    { id: 4, task: 'Tyre Rotation', due: '2026-03-15', status: 'upcoming', interval: '8,000 km' },
    { id: 5, task: 'Brake Inspection', due: '2026-04-01', status: 'upcoming', interval: '20,000 km' },
];

const status = { upcoming: 'bg-blue-100 text-blue-700', due: 'bg-warning-100 text-warning-700', overdue: 'bg-danger-100 text-danger-700' };

export default function MaintenancePage() {
    const [booked, setBooked] = useState<number[]>([]);
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Upcoming and due maintenance tasks for your vehicle</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Wrench className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Schedule</h2>
                </div>
                <div className="space-y-3">
                    {TASKS.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            <div className="flex items-center gap-4">
                                {t.status === 'overdue' ? <AlertTriangle className="w-5 h-5 text-danger-600" /> : <CheckCircle className="w-5 h-5 text-gray-400" />}
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{t.task}</p>
                                    <p className="text-sm text-gray-500">Due: {t.due} · Every {t.interval}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${status[t.status as keyof typeof status]}`}>{t.status}</span>
                                {!booked.includes(t.id) ? (
                                    <button onClick={() => setBooked(b => [...b, t.id])} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">Book Service</button>
                                ) : (
                                    <span className="text-xs bg-success-100 text-success-700 px-3 py-1.5 rounded-lg">✓ Booked</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
