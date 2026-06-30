/**
 * Industry Owner - Compliance Page
 * CPCB/SPCB regulatory compliance tracking with real emission data from simulation engine
 * Shows which chambers meet emission limits and which violate them
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, FileText, Shield, RefreshCw, Download, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, ReferenceLine
} from 'recharts';

const ML_BASE = '/ml-api';

// CPCB (Central Pollution Control Board) limits for industrial emissions
const CPCB_LIMITS = {
    pm25: { limit: 50, unit: 'μg/m³', label: 'PM2.5 (NAAQS)' },
    co: { limit: 20, unit: 'ppm', label: 'CO (Industrial)' },
    nox: { limit: 0.8, unit: 'ppm', label: 'NOx (Industrial)' },
};

// Industrial chambers mapped to wards (simulation-based)
const CHAMBER_WARD_MAP = [
    { chamber: 'Boiler Unit A', ward_id: 'dhantoli', device_id: 'IND-A01', capacity: '4 MW' },
    { chamber: 'Exhaust Line B', ward_id: 'sadar', device_id: 'IND-B02', capacity: '2.5 MW' },
    { chamber: 'Stack C (Main)', ward_id: 'dhantoli', device_id: 'IND-C03', capacity: '6 MW' },
    { chamber: 'Furnace D', ward_id: 'dharampeth', device_id: 'IND-D04', capacity: '3 MW' },
];

interface ComplianceRecord {
    chamber: string;
    device_id: string;
    capacity: string;
    pm25: number;
    co: number;
    nox: number;
    pm25_compliant: boolean;
    co_compliant: boolean;
    nox_compliant: boolean;
    overall: 'compliant' | 'warning' | 'non-compliant';
}

export default function CompliancePage() {
    const [records, setRecords] = useState<ComplianceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [showExport, setShowExport] = useState(false);
    const { t } = useLanguage();

    const fetchCompliance = useCallback(async () => {
        try {
            // Fetch ward data for each chamber's associated ward
            const wardIds = [...new Set(CHAMBER_WARD_MAP.map(c => c.ward_id))];
            const wardData: Record<string, any> = {};

            for (const wid of wardIds) {
                const res = await fetch(`${ML_BASE}/simulate/ward/${wid}`);
                if (res.ok) wardData[wid] = await res.json();
            }

            // Map chambers to compliance records using correlated ward emission data
            const newRecords: ComplianceRecord[] = CHAMBER_WARD_MAP.map((ch, i) => {
                const ward = wardData[ch.ward_id];
                if (!ward) return null;

                // Industrial emissions are higher than ambient — multiply by chamber factor
                const chamberFactors = [1.2, 0.9, 1.5, 0.8]; // Boiler>Stack>Exhaust>Furnace
                const factor = chamberFactors[i];

                const pm25 = Math.round(ward.pm25 * factor * 10) / 10;
                const co = Math.round(ward.co * factor * 10) / 10;
                const nox = Math.round(ward.nox * factor * 100) / 100;

                const pm25_ok = pm25 <= CPCB_LIMITS.pm25.limit;
                const co_ok = co <= CPCB_LIMITS.co.limit;
                const nox_ok = nox <= CPCB_LIMITS.nox.limit;

                const violations = [pm25_ok, co_ok, nox_ok].filter(x => !x).length;

                return {
                    chamber: ch.chamber,
                    device_id: ch.device_id,
                    capacity: ch.capacity,
                    pm25, co, nox,
                    pm25_compliant: pm25_ok,
                    co_compliant: co_ok,
                    nox_compliant: nox_ok,
                    overall: violations > 0 ? 'non-compliant' : pm25 > CPCB_LIMITS.pm25.limit * 0.8 || co > CPCB_LIMITS.co.limit * 0.8 || nox > CPCB_LIMITS.nox.limit * 0.8 ? 'warning' : 'compliant',
                };
            }).filter(Boolean) as ComplianceRecord[];

            setRecords(newRecords);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('Compliance fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCompliance();
        const interval = setInterval(fetchCompliance, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleExport = () => {
        const header = 'Chamber,Device ID,Capacity,PM2.5,PM2.5 Status,CO,CO Status,NOx,NOx Status,Overall';
        const rows = records.map(r => `${r.chamber},${r.device_id},${r.capacity},${r.pm25},${r.pm25_compliant ? 'PASS' : 'FAIL'},${r.co},${r.co_compliant ? 'PASS' : 'FAIL'},${r.nox},${r.nox_compliant ? 'PASS' : 'FAIL'},${r.overall.toUpperCase()}`);
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `compliance_report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        setShowExport(true);
        setTimeout(() => setShowExport(false), 3000);
    };

    const compliantCount = records.filter(r => r.overall === 'compliant').length;
    const warningCount = records.filter(r => r.overall === 'warning').length;
    const nonCompliantCount = records.filter(r => r.overall === 'non-compliant').length;

    const pieData = [
        { name: 'Compliant', value: compliantCount, color: '#52c41a' },
        { name: 'Warning', value: warningCount, color: '#faad14' },
        { name: 'Non-Compliant', value: nonCompliantCount, color: '#ff4d4f' },
    ].filter(d => d.value > 0);

    const barData = records.map(r => ({
        name: r.chamber.split(' ').slice(0, 2).join(' '),
        PM25: r.pm25,
        CO: r.co,
        'PM2.5 Limit': CPCB_LIMITS.pm25.limit,
        'CO Limit': CPCB_LIMITS.co.limit,
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">Checking compliance status...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('compliance')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        {t('cpcb_limits')}
                        <span className="flex items-center gap-1 text-success-600">
                            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse inline-block" />
                            {t('live')} · {lastUpdate.toLocaleTimeString()}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {showExport && <span className="text-sm text-success-600 font-medium">✓ {t('success')}!</span>}
                    <button onClick={fetchCompliance} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm">
                        <Download className="w-4 h-4" /> {t('export')}
                    </button>
                </div>
            </div>

            {/* Regulation Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>CPCB Standards Applied:</strong> PM2.5 ≤ {CPCB_LIMITS.pm25.limit} {CPCB_LIMITS.pm25.unit} · CO ≤ {CPCB_LIMITS.co.limit} {CPCB_LIMITS.co.unit} · NOx ≤ {CPCB_LIMITS.nox.limit} {CPCB_LIMITS.nox.unit}.
                    Values are derived from real-time ward simulation data × chamber-specific emission factors.
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-xl p-6 text-center">
                    <CheckCircle className="w-8 h-8 text-success-600 mx-auto" />
                    <p className="text-3xl font-black text-success-700 dark:text-success-400 mt-2">{compliantCount}</p>
                    <p className="text-sm text-success-600">{t('compliant')}</p>
                </div>
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-6 text-center">
                    <AlertTriangle className="w-8 h-8 text-warning-600 mx-auto" />
                    <p className="text-3xl font-black text-warning-700 dark:text-warning-400 mt-2">{warningCount}</p>
                    <p className="text-sm text-warning-600">{t('warning')}</p>
                </div>
                <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-xl p-6 text-center">
                    <XCircle className="w-8 h-8 text-danger-600 mx-auto" />
                    <p className="text-3xl font-black text-danger-700 dark:text-danger-400 mt-2">{nonCompliantCount}</p>
                    <p className="text-sm text-danger-600">{t('non_compliant')}</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('compliance_trend')}</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value">
                                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-2">
                        {pieData.map(d => (
                            <div key={d.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('chamber_emissions')}</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="PM25" fill="#1890ff" radius={[6, 6, 0, 0]} name="PM2.5 (μg/m³)" />
                            <Bar dataKey="CO" fill="#722ed1" radius={[6, 6, 0, 0]} name="CO (ppm)" />
                            <ReferenceLine y={CPCB_LIMITS.pm25.limit} stroke="#ff4d4f" strokeDasharray="5 5" label={{ value: 'PM2.5 Limit', position: 'right', fontSize: 10, fill: '#ff4d4f' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('compliance_report')}</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                {[t('chamber'), t('device_id'), t('capacity'), t('pm25'), t('co'), t('nox'), t('status')].map(h => (
                                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.device_id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="py-4 px-4 text-sm font-medium text-gray-900 dark:text-white">{r.chamber}</td>
                                    <td className="py-4 px-4 text-sm font-mono text-primary-600">{r.device_id}</td>
                                    <td className="py-4 px-4 text-sm text-gray-500">{r.capacity}</td>
                                    <td className="py-4 px-4">
                                        <span className={`text-sm font-semibold ${r.pm25_compliant ? 'text-success-600' : 'text-danger-600'}`}>
                                            {r.pm25} {r.pm25_compliant ? '✓' : '✗'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`text-sm font-semibold ${r.co_compliant ? 'text-success-600' : 'text-danger-600'}`}>
                                            {r.co} {r.co_compliant ? '✓' : '✗'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`text-sm font-semibold ${r.nox_compliant ? 'text-success-600' : 'text-danger-600'}`}>
                                            {r.nox} {r.nox_compliant ? '✓' : '✗'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${r.overall === 'compliant' ? 'bg-success-100 text-success-700' :
                                                r.overall === 'warning' ? 'bg-warning-100 text-warning-700' :
                                                    'bg-danger-100 text-danger-700'
                                            }`}>
                                            {r.overall === 'compliant' ? `✓ ${t('compliant')}` : r.overall === 'warning' ? `⚠ ${t('warning')}` : `✗ ${t('non_compliant')}`}
                                        </span>
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
