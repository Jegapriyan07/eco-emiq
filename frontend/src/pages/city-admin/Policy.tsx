/**
 * City Admin – Policy Page
 */
import { useState } from 'react';
import { FileText, CheckCircle, PenLine, X } from 'lucide-react';

interface Policy {
    id: number;
    title: string;
    current: string;
    editable: boolean;
    desc: string;
    type?: 'number' | 'text' | 'toggle';
    unit?: string;
}

const INITIAL_POLICIES: Policy[] = [
    { id: 1, title: 'PM2.5 Alert Threshold', current: '60', editable: true, desc: 'Auto-alert when PM2.5 exceeds this level in any ward.', type: 'number', unit: 'μg/m³' },
    { id: 2, title: 'AQI Red Alert Level', current: '150', editable: true, desc: 'Trigger city-wide advisory when AQI exceeds this value.', type: 'number' },
    { id: 3, title: 'Notification Cooldown', current: '15', editable: true, desc: 'Minimum time between repeated alerts for the same ward.', type: 'number', unit: 'min' },
    { id: 4, title: 'Auto-Shutdown Generator Limit', current: '80', editable: true, desc: 'Generators exceeding this limit receive auto-shutdown signal.', type: 'number', unit: 'ppm CO' },
    { id: 5, title: 'Data Retention Period', current: '90', editable: false, desc: 'How long raw sensor data is stored (compliance setting).', type: 'number', unit: 'days' },
    { id: 6, title: 'Emergency Broadcast', current: 'Enabled', editable: true, desc: 'Send SMS to registered residents during AQI > Red Alert.', type: 'toggle' },
];

export default function PolicyPage() {
    const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<Record<number, string>>({});
    const [saved, setSaved] = useState<number[]>([]);

    const handleEdit = (id: number) => {
        const policy = policies.find(p => p.id === id);
        if (policy) {
            setEditingId(id);
            // Extract numeric value for number inputs, keep full string for toggle
            if (policy.type === 'toggle') {
                setEditValues({ ...editValues, [id]: policy.current });
            } else {
                const numericValue = policy.current.replace(/[^\d.]/g, '');
                setEditValues({ ...editValues, [id]: numericValue });
            }
        }
    };

    const handleCancel = (id: number) => {
        setEditingId(null);
        const newValues = { ...editValues };
        delete newValues[id];
        setEditValues(newValues);
    };

    const handleSave = (id: number) => {
        const policy = policies.find(p => p.id === id);
        if (!policy) return;

        const newValue = editValues[id] || policy.current;
        let formattedValue = newValue;

        if (policy.type === 'number' && policy.unit) {
            formattedValue = `${newValue} ${policy.unit}`;
        } else if (policy.type === 'toggle') {
            formattedValue = newValue === 'Enabled' ? 'Disabled' : 'Enabled';
        }

        setPolicies(policies.map(p => 
            p.id === id ? { ...p, current: formattedValue } : p
        ));
        setEditingId(null);
        setSaved(s => [...s, id]);
        setTimeout(() => setSaved(s => s.filter(x => x !== id)), 2000);
    };

    const handleInputChange = (id: number, value: string) => {
        setEditValues({ ...editValues, [id]: value });
    };

    const handleToggle = (id: number) => {
        const policy = policies.find(p => p.id === id);
        if (policy) {
            const newValue = policy.current === 'Enabled' ? 'Disabled' : 'Enabled';
            setPolicies(policies.map(p => 
                p.id === id ? { ...p, current: newValue } : p
            ));
            setSaved(s => [...s, id]);
            setTimeout(() => setSaved(s => s.filter(x => x !== id)), 2000);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Policy Configuration</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage city-wide emission policies and alert thresholds</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                    <FileText className="w-5 h-5 text-primary-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Policies</h2>
                </div>
                <div className="space-y-4">
                    {policies.map(p => {
                        const isEditing = editingId === p.id;
                        const isSaved = saved.includes(p.id);

                        return (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl gap-4">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{p.title}</p>
                                    <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    {isEditing ? (
                                        <>
                                            {p.type === 'toggle' ? (
                                                <select
                                                    value={editValues[p.id] || p.current}
                                                    onChange={(e) => handleInputChange(p.id, e.target.value)}
                                                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <option value="Enabled">Enabled</option>
                                                    <option value="Disabled">Disabled</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type={p.type === 'number' ? 'number' : 'text'}
                                                        value={editValues[p.id] || ''}
                                                        onChange={(e) => handleInputChange(p.id, e.target.value)}
                                                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-24"
                                                        placeholder={p.current}
                                                    />
                                                    {p.unit && (
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{p.unit}</span>
                                                    )}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleSave(p.id)}
                                                className="flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                                            >
                                                <CheckCircle className="w-3 h-3" /> Save
                                            </button>
                                            <button
                                                onClick={() => handleCancel(p.id)}
                                                className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                            >
                                                <X className="w-3 h-3" /> Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-sm font-semibold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">{p.current}</span>
                                            {p.editable ? (
                                                isSaved ? (
                                                    <span className="flex items-center gap-1 text-xs text-success-600 font-medium"><CheckCircle className="w-4 h-4" /> Saved</span>
                                                ) : (
                                                    <button 
                                                        onClick={() => p.type === 'toggle' ? handleToggle(p.id) : handleEdit(p.id)} 
                                                        className="flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                                    >
                                                        <PenLine className="w-3 h-3" /> Edit
                                                    </button>
                                                )
                                            ) : (
                                                <span className="text-xs text-gray-400">Read-only</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
