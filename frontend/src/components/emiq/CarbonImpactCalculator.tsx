/**
 * City-wide carbon impact calculator widget (C2)
 */

import { useState, useCallback } from 'react';
import { Calculator, Info } from 'lucide-react';
import { ML_BASE } from '../../config/api';

interface ImpactResult {
    participating_devices: number;
    estimated_annual_co2e_reduction_tonnes: number;
    assumptions: Record<string, unknown>;
}

export default function CarbonImpactCalculator() {
    const [deviceCount, setDeviceCount] = useState(500);
    const [complianceRate, setComplianceRate] = useState(70);
    const [reductionPct, setReductionPct] = useState(15);
    const [result, setResult] = useState<ImpactResult | null>(null);
    const [loading, setLoading] = useState(false);

    const calculate = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ML_BASE}/carbon-impact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_count: deviceCount,
                    compliance_rate_pct: complianceRate,
                    avg_emission_reduction_pct: reductionPct,
                }),
            });
            if (res.ok) setResult(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [deviceCount, complianceRate, reductionPct]);

    return (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estimated City-Wide Impact</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <label className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Devices (N)</span>
                    <input
                        type="number"
                        value={deviceCount}
                        onChange={(e) => setDeviceCount(Number(e.target.value))}
                        className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-600"
                        min={1}
                    />
                </label>
                <label className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Follow EMIQ guidance (%)</span>
                    <input
                        type="range"
                        value={complianceRate}
                        onChange={(e) => setComplianceRate(Number(e.target.value))}
                        className="w-full"
                        min={10}
                        max={100}
                    />
                    <span className="font-medium">{complianceRate}%</span>
                </label>
                <label className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">Excess emission cut (%)</span>
                    <input
                        type="range"
                        value={reductionPct}
                        onChange={(e) => setReductionPct(Number(e.target.value))}
                        className="w-full"
                        min={5}
                        max={40}
                    />
                    <span className="font-medium">{reductionPct}%</span>
                </label>
            </div>

            <button
                onClick={calculate}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
                {loading ? 'Calculating…' : 'Calculate impact'}
            </button>

            {result && (
                <div className="mt-4 p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg">
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                        {result.estimated_annual_co2e_reduction_tonnes}{' '}
                        <span className="text-lg font-semibold">tonnes CO₂e / year</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        If {result.participating_devices} of {deviceCount} devices follow EMIQ-guided maintenance
                    </p>
                    <p className="text-xs text-gray-400 mt-3 flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Assumes ~2.1 tonnes CO₂e/year excess per non-compliant device. Illustrative — pilot validation required.
                    </p>
                </div>
            )}
        </div>
    );
}
