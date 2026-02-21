/**
 * Vehicle Owner - Timeline Page
 */
import { Clock } from 'lucide-react';

const TIMELINE = [
    { id: 1, date: '2026-02-17 14:32', event: 'Engine started', icon: '🚗', type: 'info', emission: 45 },
    { id: 2, date: '2026-02-17 14:45', event: 'PM2.5 spike detected', icon: '⚠️', type: 'warning', emission: 72 },
    { id: 3, date: '2026-02-17 15:00', event: 'Emission levels normalized', icon: '✅', type: 'success', emission: 38 },
    { id: 4, date: '2026-02-17 15:30', event: 'Highway mode triggered', icon: '🛣️', type: 'info', emission: 35 },
    { id: 5, date: '2026-02-17 16:00', event: 'Engine stopped', icon: '🔴', type: 'info', emission: 0 },
    { id: 6, date: '2026-02-16 08:15', event: 'Engine started', icon: '🚗', type: 'info', emission: 48 },
    { id: 7, date: '2026-02-16 09:10', event: 'CO Spike – 22 ppm', icon: '⚠️', type: 'danger', emission: 82 },
    { id: 8, date: '2026-02-16 09:25', event: 'Auto alert sent', icon: '📲', type: 'info', emission: 82 },
    { id: 9, date: '2026-02-16 10:00', event: 'Emission levels normalized', icon: '✅', type: 'success', emission: 40 },
];

const typeStyles: Record<string, string> = {
    info: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    warning: 'border-warning-200 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300',
    success: 'border-success-200 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300',
    danger: 'border-danger-200 bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300',
};

export default function TimelinePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emission Timeline</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Full history of emission events for MH-31-AB-1234</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Event Log</h2>
                </div>
                <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-4">
                        {TIMELINE.map(e => (
                            <div key={e.id} className="flex items-start gap-5 pl-4">
                                <div className="relative z-10 w-9 h-9 flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full text-lg flex-shrink-0">{e.icon}</div>
                                <div className={`flex-1 p-4 rounded-xl border ${typeStyles[e.type]}`}>
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium">{e.event}</p>
                                        {e.emission > 0 && <span className="text-xs font-semibold bg-white/60 dark:bg-black/30 px-2 py-0.5 rounded-full">AQI {e.emission}</span>}
                                    </div>
                                    <p className="text-xs mt-1 opacity-70">{e.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
