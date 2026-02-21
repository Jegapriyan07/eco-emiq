/**
 * City Admin - Alerts Page
 * Fetches threshold-based alerts from simulation engine
 * Alerts are generated when AQI > 100, PM2.5 > 60, CO > 20, NOx > 1.0
 */
import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Bell, CheckCircle, Filter, RefreshCw, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const ML_BASE = '/ml-api';

interface Alert {
    type: string;
    severity: string;
    desc: string;
    ward: string;
    time: string;
}

const sev: Record<string, string> = {
    high: 'bg-danger-100 text-danger-700 border-danger-200 dark:bg-danger-900/20 dark:text-danger-300 dark:border-danger-800',
    medium: 'bg-warning-100 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-300 dark:border-warning-800',
    low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
};

export default function AlertsPage() {
    const { t } = useLanguage();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [filter, setFilter] = useState('all');
    const [resolved, setResolved] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [smsStatus, setSmsStatus] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch(`${ML_BASE}/simulate/alerts`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data);
            }
        } catch (e) {
            console.error('Failed to fetch alerts:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const triggerWhatsApp = async () => {
        try {
            const res = await fetch(`${ML_BASE}/simulate/trigger-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: '+919360260470',
                    message: 'EcoTronics Alert: High AQI detected in Sadar ward. Immediate action required.',
                    priority: 'high'
                })
            });
            if (res.ok) {
                setSmsStatus(t('message_sent'));
                setTimeout(() => setSmsStatus(null), 5000);
            }
        } catch (e) {
            console.error('WhatsApp trigger failed:', e);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 15000);
        return () => clearInterval(interval);
    }, []);

    const visible = alerts
        .filter((_, i) => !resolved.includes(i))
        .filter(a => filter === 'all' || a.severity === filter);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">{t('loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('alerts')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        {visible.length} {t('active_alerts')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {smsStatus && (
                        <span className="text-sm font-medium text-success-600 bg-success-50 px-3 py-1.5 rounded-lg animate-fade-in">
                            ✓ {smsStatus}
                        </span>
                    )}
                    <button onClick={triggerWhatsApp} className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors">
                        <MessageSquare className="w-4 h-4" /> {t('trigger_alert')}
                    </button>
                    {['all', 'high', 'medium', 'low'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>{f}</button>
                    ))}
                    <button onClick={fetchAlerts} className="ml-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Explanation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> {t('alert_desc')}
                </p>
            </div>

            {visible.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('all_clear')}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('no_alerts')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map((a, i) => (
                        <div key={`${a.ward}-${a.type}-${i}`} className={`p-5 rounded-xl border ${sev[a.severity] || sev['low']}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-semibold">{a.type}</span>
                                            <span className="text-xs opacity-70">{a.ward} · {a.time}</span>
                                        </div>
                                        <p className="text-sm opacity-80">{a.desc}</p>
                                    </div>
                                </div>
                                <button onClick={() => setResolved(r => [...r, i])} className="flex-shrink-0 text-xs bg-white/60 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 px-3 py-1.5 rounded-lg font-medium transition-colors">{t('resolve')}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {resolved.length > 0 && (
                <div className="text-center">
                    <button onClick={() => setResolved([])} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Restore {resolved.length} resolved alert(s)</button>
                </div>
            )}
        </div>
    );
}
