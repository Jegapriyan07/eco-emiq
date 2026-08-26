/**
 * Carbon Reduction Advisor panel (B2 / C1)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Leaf, RefreshCw, Sparkles, TrendingDown } from 'lucide-react';
import { ML_BASE } from '../../config/api';

interface Recommendation {
    priority: string;
    title: string;
    recommendation: string;
    estimated_co2e_saved_kg_per_year: number;
}

interface AdvisorResponse {
    device_id: string;
    recommendations: Recommendation[];
    total_estimated_co2e_saved_kg_per_year: number;
    assumptions: string;
    generated_at: string;
}

interface Props {
    deviceId: string;
    deviceType?: string;
    emissionHistory?: Array<Record<string, number>>;
    /** How often to re-fetch advisor data (ms). Default 20s. */
    refreshIntervalMs?: number;
}

const priorityColors: Record<string, string> = {
    critical: 'border-red-300 bg-red-50 dark:bg-red-900/20',
    high: 'border-orange-300 bg-orange-50 dark:bg-orange-900/20',
    medium: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20',
    low: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20',
};

export default function ReductionRecommendationsPanel({
    deviceId,
    deviceType = 'vehicle',
    emissionHistory,
    refreshIntervalMs = 20_000,
}: Props) {
    const [data, setData] = useState<AdvisorResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const historyRef = useRef(emissionHistory);
    historyRef.current = emissionHistory;

    const fetchAdvisor = useCallback(async () => {
        setLoading(true);
        try {
            const history = historyRef.current;
            let res;
            if (history && history.length > 0) {
                res = await fetch(`${ML_BASE}/agents/carbon-advisor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        device_id: deviceId,
                        device_type: deviceType,
                        emission_history: history,
                    }),
                });
            } else {
                res = await fetch(`${ML_BASE}/agents/carbon-advisor/${encodeURIComponent(deviceId)}?device_type=${deviceType}`);
            }
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error('Carbon advisor fetch failed:', e);
        } finally {
            setLoading(false);
        }
    }, [deviceId, deviceType]);

    useEffect(() => {
        fetchAdvisor();
        const id = setInterval(fetchAdvisor, refreshIntervalMs);
        return () => clearInterval(id);
    }, [fetchAdvisor, refreshIntervalMs]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Reduction Recommendations</h2>
                    <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Advisor
                    </span>
                </div>
                <button onClick={fetchAdvisor} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Refresh">
                    <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading && !data ? (
                <p className="text-sm text-gray-500">Generating personalized recommendations...</p>
            ) : data ? (
                <>
                    {data.total_estimated_co2e_saved_kg_per_year > 0 && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                            <TrendingDown className="w-5 h-5 text-emerald-600" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                    Est. {data.total_estimated_co2e_saved_kg_per_year} kg CO₂e/year saved if followed
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Personalized to your device history</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {data.recommendations.map((rec, i) => (
                            <div
                                key={i}
                                className={`border rounded-lg p-4 ${priorityColors[rec.priority] || priorityColors.medium}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{rec.title}</p>
                                    <span className="text-xs uppercase font-semibold text-gray-500">{rec.priority}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{rec.recommendation}</p>
                                {rec.estimated_co2e_saved_kg_per_year > 0 && (
                                    <p className="text-xs text-emerald-600 mt-2">~{rec.estimated_co2e_saved_kg_per_year} kg CO₂e/yr</p>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-gray-400 mt-4" title={data.assumptions}>
                        ⓘ {data.assumptions.slice(0, 120)}…
                    </p>
                </>
            ) : (
                <p className="text-sm text-gray-500">Unable to load recommendations.</p>
            )}
        </div>
    );
}
