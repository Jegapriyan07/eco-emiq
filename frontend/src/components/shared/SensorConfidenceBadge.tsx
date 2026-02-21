/**
 * Sensor Confidence Badge Component
 * Displays ML-based sensor confidence score with calibration warnings
 */

import { AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SensorConfidence {
    confidence_score: number;
    health_status: string;
    is_healthy: boolean;
    needs_calibration: boolean;
    has_hardware_failure: boolean;
    anomaly_spikes: Array<{index: number; value: number; z_score: number; timestamp: string}>;
    recommendations: string[];
}

interface SensorConfidenceBadgeProps {
    confidence: SensorConfidence;
    compact?: boolean;
    showDetails?: boolean;
}

export default function SensorConfidenceBadge({ confidence, compact = false, showDetails = false }: SensorConfidenceBadgeProps) {
    const { t } = useLanguage();
    const score = confidence.confidence_score;
    const scorePercent = Math.round(score * 100);

    const getColorClasses = () => {
        if (score >= 0.8) return {
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-700 dark:text-green-400',
            border: 'border-green-200 dark:border-green-800',
            icon: 'text-green-600'
        };
        if (score >= 0.6) return {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            text: 'text-yellow-700 dark:text-yellow-400',
            border: 'border-yellow-200 dark:border-yellow-800',
            icon: 'text-yellow-600'
        };
        return {
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-700 dark:text-red-400',
            border: 'border-red-200 dark:border-red-800',
            icon: 'text-red-600'
        };
    };

    const colors = getColorClasses();

    if (compact) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
                <span>🤖</span>
                <span>{scorePercent}%</span>
                {confidence.needs_calibration && <Wrench className="w-3 h-3" />}
                {confidence.has_hardware_failure && <AlertTriangle className="w-3 h-3" />}
            </div>
        );
    }

    return (
        <div className={`p-3 rounded-lg border ${colors.bg} ${colors.border} ${colors.text}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{t('sensor_confidence')}</span>
                <span className={`text-lg font-bold ${colors.text}`}>{scorePercent}%</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs">{t('sensor_health')}:</span>
                <span className="text-xs font-semibold capitalize">{confidence.health_status}</span>
            </div>
            
            {confidence.needs_calibration && (
                <div className="flex items-center gap-1.5 text-xs bg-yellow-200 dark:bg-yellow-900/40 px-2 py-1 rounded mt-2">
                    <Wrench className="w-3 h-3" />
                    <span>{t('calibration_needed')}</span>
                </div>
            )}
            
            {confidence.has_hardware_failure && (
                <div className="flex items-center gap-1.5 text-xs bg-red-200 dark:bg-red-900/40 px-2 py-1 rounded mt-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{t('hardware_failure_detected')}</span>
                </div>
            )}
            
            {confidence.anomaly_spikes.length > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    ⚠️ {confidence.anomaly_spikes.length} {t('anomaly_spikes')} detected
                </div>
            )}
            
            {showDetails && confidence.recommendations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-current/20">
                    <p className="text-xs font-semibold mb-1">{t('recommendations')}:</p>
                    <ul className="text-xs space-y-0.5">
                        {confidence.recommendations.map((rec, idx) => (
                            <li key={idx}>• {rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
