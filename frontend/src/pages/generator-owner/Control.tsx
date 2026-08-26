/**
 * Generator Control Page
 * Dedicated controls: start/stop, load, thresholds, schedules — not a dashboard duplicate
 */

import { useEffect, useState } from 'react';
import { useMockGeneratorData } from '../../hooks/useMockGeneratorData';
import {
    Power,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
    Gauge,
    Timer,
    Shield,
    Zap,
    Thermometer,
    Siren,
} from 'lucide-react';

export default function GeneratorControlPage() {
    const live = useMockGeneratorData(2000);
    const [generatorOn, setGeneratorOn] = useState(true);
    const [autoShutdown, setAutoShutdown] = useState(true);
    const [ecoMode, setEcoMode] = useState(false);
    const [loadPct, setLoadPct] = useState(62);
    const [shutdownThreshold, setShutdownThreshold] = useState(65);
    const [peakQuietHours, setPeakQuietHours] = useState(true);
    const [notifySms, setNotifySms] = useState(true);
    const [statusMsg, setStatusMsg] = useState('');
    const [lastAction, setLastAction] = useState<Date | null>(null);

    const emission = generatorOn ? live.emission : 0;
    const temp = generatorOn ? live.temp : Math.max(35, live.temp - 20);
    const overLimit = emission > shutdownThreshold;

    useEffect(() => {
        if (autoShutdown && generatorOn && overLimit) {
            setGeneratorOn(false);
            setStatusMsg(`Auto-shutdown triggered — emission ${emission} ppm exceeded ${shutdownThreshold} ppm.`);
            setLastAction(new Date());
        }
    }, [autoShutdown, generatorOn, overLimit, emission, shutdownThreshold]);

    const flash = (msg: string) => {
        setStatusMsg(msg);
        setLastAction(new Date());
    };

    const handleStartStop = () => {
        setGeneratorOn((on) => {
            const next = !on;
            flash(next ? 'Generator started.' : 'Generator stopped by operator.');
            return next;
        });
    };

    const handleEmergencyStop = () => {
        setGeneratorOn(false);
        flash('EMERGENCY STOP — unit offline. Inspect before restart.');
    };

    const handleApplyLoad = () => {
        flash(`Load setpoint applied: ${loadPct}%${ecoMode ? ' (Eco mode)' : ''}.`);
    };

    const emColor =
        emission < 40 ? 'text-success-600' : emission < shutdownThreshold ? 'text-warning-600' : 'text-danger-600';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Generator Control</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        DG Set Unit #1 · Operator controls
                        <span className={`flex items-center gap-1 ${generatorOn ? 'text-success-600' : 'text-gray-400'}`}>
                            <span className={`w-2 h-2 rounded-full inline-block ${generatorOn ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`} />
                            {generatorOn ? `Running · ${live.lastUpdate.toLocaleTimeString()}` : 'Stopped'}
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleEmergencyStop}
                    className="flex items-center gap-2 px-4 py-2.5 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                    <Siren className="w-4 h-4" /> Emergency Stop
                </button>
            </div>

            {statusMsg && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">{statusMsg}</p>
                        {lastAction && (
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                                Last action · {lastAction.toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {overLimit && generatorOn && (
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-300 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
                    <p className="text-sm text-warning-800 dark:text-warning-200 font-medium">
                        Emission {emission} ppm is above the shutdown threshold ({shutdownThreshold} ppm).
                    </p>
                </div>
            )}

            {/* Live status strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat icon={Power} label="Unit status" value={generatorOn ? 'ON' : 'OFF'} color={generatorOn ? 'text-success-600' : 'text-gray-500'} />
                <MiniStat icon={Zap} label="Live emission" value={`${emission} ppm`} color={emColor} />
                <MiniStat icon={Thermometer} label="Coolant temp" value={`${temp}°C`} color={temp > 85 ? 'text-danger-600' : 'text-blue-600'} />
                <MiniStat icon={Gauge} label="Load setpoint" value={`${loadPct}%`} color="text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Power & safety */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Power className="w-5 h-5 text-primary-600" /> Power & safety
                    </h2>

                    <button
                        type="button"
                        onClick={handleStartStop}
                        className={`w-full font-semibold py-3.5 rounded-xl text-sm transition-colors ${
                            generatorOn
                                ? 'bg-danger-100 hover:bg-danger-200 text-danger-700'
                                : 'bg-success-600 hover:bg-success-700 text-white'
                        }`}
                    >
                        {generatorOn ? 'Stop Generator' : 'Start Generator'}
                    </button>

                    <ToggleRow
                        title="Auto-shutdown"
                        desc={`Stop when emission exceeds ${shutdownThreshold} ppm`}
                        on={autoShutdown}
                        onToggle={() => setAutoShutdown((v) => !v)}
                    />

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Shutdown threshold
                            </label>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{shutdownThreshold} ppm</span>
                        </div>
                        <input
                            type="range"
                            min={45}
                            max={90}
                            value={shutdownThreshold}
                            onChange={(e) => setShutdownThreshold(Number(e.target.value))}
                            className="w-full accent-primary-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>45</span>
                            <span>90</span>
                        </div>
                    </div>
                </section>

                {/* Load control */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-primary-600" /> Load control
                    </h2>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target load</label>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{loadPct}%</span>
                        </div>
                        <input
                            type="range"
                            min={20}
                            max={100}
                            value={loadPct}
                            disabled={!generatorOn}
                            onChange={(e) => setLoadPct(Number(e.target.value))}
                            className="w-full accent-primary-600 disabled:opacity-40"
                        />
                    </div>

                    <ToggleRow
                        title="Eco mode"
                        desc="Cap load at 70% to cut NOx and fuel burn"
                        on={ecoMode}
                        onToggle={() => {
                            setEcoMode((v) => {
                                const next = !v;
                                if (next && loadPct > 70) setLoadPct(70);
                                return next;
                            });
                        }}
                    />

                    <button
                        type="button"
                        disabled={!generatorOn}
                        onClick={handleApplyLoad}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                    >
                        Apply load setpoint
                    </button>
                </section>

                {/* Schedule */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Timer className="w-5 h-5 text-primary-600" /> Schedule
                    </h2>
                    <ToggleRow
                        title="Quiet hours"
                        desc="Reduce load 22:00–06:00 for noise & emission compliance"
                        on={peakQuietHours}
                        onToggle={() => setPeakQuietHours((v) => !v)}
                    />
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p><strong>Peak window:</strong> 08:00–12:00 · prefer lower load</p>
                        <p><strong>Quiet hours:</strong> {peakQuietHours ? 'Enabled' : 'Disabled'}</p>
                        <p><strong>Next auto action:</strong> {peakQuietHours ? 'Load trim at 22:00' : 'None scheduled'}</p>
                    </div>
                </section>

                {/* Alerts */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-primary-600" /> Operator alerts
                    </h2>
                    <ToggleRow
                        title="SMS on critical"
                        desc="Notify when auto-shutdown or emergency stop fires"
                        on={notifySms}
                        onToggle={() => setNotifySms((v) => !v)}
                    />
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
                        <p className="font-medium text-gray-900 dark:text-white mb-1">Active policy</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Shutdown at {shutdownThreshold} ppm {autoShutdown ? '(armed)' : '(disarmed)'}</li>
                            <li>Eco mode {ecoMode ? 'on' : 'off'}</li>
                            <li>SMS alerts {notifySms ? 'on' : 'off'}</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}

function MiniStat({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof Power;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
    );
}

function ToggleRow({
    title,
    desc,
    on,
    onToggle,
}: {
    title: string;
    desc: string;
    on: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
        >
            <div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            {on ? <ToggleRight className="w-8 h-8 text-success-500 shrink-0" /> : <ToggleLeft className="w-8 h-8 text-gray-400 shrink-0" />}
        </button>
    );
}
