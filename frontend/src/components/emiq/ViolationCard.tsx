/**
 * Violation card with Compliance Explainer Agent output + confidence + dispute
 */

import { AlertTriangle, CheckCircle, Info, Sparkles } from 'lucide-react';
import DisputeButton from './DisputeButton';

export interface ViolationData {
    device_id: string;
    verdict: 'Compliant' | 'Warning' | 'Violation' | string;
    confidence: number;
    explanation?: string;
    corrective_action?: string;
    confidence_note?: string;
    exceeded_thresholds?: Array<{ parameter: string; value: number; threshold: number; level: string }>;
}

interface Props {
    data: ViolationData;
    showDispute?: boolean;
    userRole?: string;
}

export default function ViolationCard({ data, showDispute = true, userRole = 'industry_owner' }: Props) {
    const isLowConfidence = data.confidence < 0.7;
    const verdictStyles = {
        Compliant: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800',
        Warning: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800',
        Violation: 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800',
    };
    const style = verdictStyles[data.verdict as keyof typeof verdictStyles] || verdictStyles.Warning;

    const Icon = data.verdict === 'Compliant' ? CheckCircle : AlertTriangle;
    const iconColor = data.verdict === 'Compliant' ? 'text-emerald-600' : data.verdict === 'Warning' ? 'text-amber-600' : 'text-red-600';

    return (
        <div className={`rounded-xl border p-5 ${style} ${isLowConfidence ? 'ring-2 ring-dashed ring-orange-300' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        Compliance Verdict: {data.verdict}
                    </h3>
                </div>
                <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isLowConfidence
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-white/80 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                    title="Random Forest classifier confidence"
                >
                    {Math.round(data.confidence * 100)}% confidence
                </span>
            </div>

            {data.verdict === 'Compliant' && (
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    All monitored pollutants are within CPCB/IEEE reference limits. No enforcement action required.
                </p>
            )}

            {data.verdict !== 'Compliant' && (
                <div className="mt-4 space-y-3">
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
                                AI Compliance Explainer
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {data.explanation || 'Analyzing sensor readings against regulatory thresholds…'}
                            </p>
                        </div>
                    </div>
                    {data.corrective_action && (
                        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-gray-200/50 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Immediate action</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{data.corrective_action}</p>
                        </div>
                    )}
                </div>
            )}

            {data.confidence_note && (
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {data.confidence_note}
                </p>
            )}

            {showDispute && data.verdict !== 'Compliant' && (
                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <DisputeButton
                        deviceId={data.device_id}
                        violationId={`${data.device_id}-${data.verdict}`}
                        classifierConfidence={data.confidence}
                        userRole={userRole}
                    />
                </div>
            )}
        </div>
    );
}
