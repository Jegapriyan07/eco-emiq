/**
 * Dispute / appeal mechanism (F1)
 */

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { ML_BASE } from '../../config/api';

interface Props {
    deviceId: string;
    violationId: string;
    classifierConfidence: number;
    userRole?: string;
}

export default function DisputeButton({ deviceId, violationId, classifierConfidence, userRole = 'industry_owner' }: Props) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!reason.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`${ML_BASE}/disputes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: deviceId,
                    violation_id: violationId,
                    reason: reason.trim(),
                    user_role: userRole,
                    classifier_confidence: classifierConfidence,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setStatus(data.message);
                setOpen(false);
                setReason('');
            }
        } catch (e) {
            setStatus('Failed to submit dispute. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                    <Flag className="w-4 h-4" />
                    Dispute this flag
                    {classifierConfidence < 0.7 && (
                        <span className="text-xs text-orange-600">(recommended — low confidence)</span>
                    )}
                </button>
            ) : (
                <div className="space-y-2">
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain why you believe this flag is incorrect (e.g. recent service, sensor error)..."
                        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={submit}
                            disabled={loading || !reason.trim()}
                            className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                        >
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            Submit dispute
                        </button>
                        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {status && (
                <p className="text-xs text-emerald-600 mt-2">{status}</p>
            )}
        </div>
    );
}
