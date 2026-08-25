/**
 * Competitor comparison page (E1)
 */

import { Check, X, Minus } from 'lucide-react';

type Cell = 'yes' | 'partial' | 'no' | string;

const rows: { feature: string; emiq: Cell; puc: Cell; cpcb: Cell; cems: Cell }[] = [
    { feature: 'Real-time capability', emiq: 'yes', puc: 'no', cpcb: 'partial', cems: 'yes' },
    { feature: 'Granularity (per device)', emiq: 'yes', puc: 'partial', cpcb: 'no', cems: 'partial' },
    { feature: 'Cost (affordable edge)', emiq: 'yes', puc: 'yes', cpcb: 'no', cems: 'no' },
    { feature: 'Predictive / AI capability', emiq: 'yes', puc: 'no', cpcb: 'no', cems: 'partial' },
    { feature: 'Carbon reduction coaching', emiq: 'yes', puc: 'no', cpcb: 'no', cems: 'no' },
    { feature: 'Enforcement speed', emiq: 'yes', puc: 'partial', cpcb: 'partial', cems: 'yes' },
    { feature: 'Sensor drift handling', emiq: 'yes', puc: 'no', cpcb: 'no', cems: 'partial' },
    { feature: 'Spans vehicle + gen + industry', emiq: 'yes', puc: 'partial', cpcb: 'no', cems: 'partial' },
];

function CellIcon({ value }: { value: Cell }) {
    if (value === 'yes') return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
    if (value === 'no') return <X className="w-5 h-5 text-red-400 mx-auto" />;
    if (value === 'partial') return <Minus className="w-5 h-5 text-amber-500 mx-auto" />;
    return <span className="text-sm text-gray-600">{value}</span>;
}

export default function HowItComparesPage() {
    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">How EMIQ Compares</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    EMIQ vs. PUC centres vs. CPCB stations vs. Industrial CEMS
                </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            <th className="text-left p-4 font-semibold">Capability</th>
                            <th className="p-4 font-semibold text-primary-600">EMIQ</th>
                            <th className="p-4 font-semibold">PUC Centres</th>
                            <th className="p-4 font-semibold">CPCB Stations</th>
                            <th className="p-4 font-semibold">Industrial CEMS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.feature} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="p-4 text-gray-700 dark:text-gray-300">{r.feature}</td>
                                <td className="p-4 bg-primary-50/50 dark:bg-primary-900/10"><CellIcon value={r.emiq} /></td>
                                <td className="p-4"><CellIcon value={r.puc} /></td>
                                <td className="p-4"><CellIcon value={r.cpcb} /></td>
                                <td className="p-4"><CellIcon value={r.cems} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
                <h2 className="font-bold text-gray-900 dark:text-white">The EMIQ moat</h2>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                    <strong>Sensor Drift Intelligence + multi-agent AI layer + single platform spanning three emitter categories</strong> —
                    no single existing solution does all three. EMIQ turns monitoring into measurable carbon reduction.
                </p>
            </div>
        </div>
    );
}
