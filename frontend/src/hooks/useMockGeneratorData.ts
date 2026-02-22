import { useEffect, useState } from "react";

export interface GeneratorState {
    emission: number;
    temp: number;
    runtime: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    lastUpdate: Date;
}

/**
 * Generates simulated generator readings locally.
 * @param paused - When true (e.g. USB or MQTT is connected), the tick
 *                 interval is suspended so real sensor data is never
 *                 overwritten by simulated readings.
 */
export function useMockGeneratorData(paused = false) {
    const [data, setData] = useState<GeneratorState>({
        emission: 45.2,
        temp: 78,
        runtime: 125.5,
        carbon_footprint: 7.2,
        drift_intelligence_score: 0.5,
        lastUpdate: new Date(),
    });

    useEffect(() => {
        // Don't tick while a real sensor is active
        if (paused) return;

        const interval = setInterval(() => {
            setData(prev => {
                const newEmission = parseFloat((prev.emission + (Math.random() - 0.5) * 3).toFixed(1));
                const newRuntime = parseFloat((prev.runtime + 4 / 3600).toFixed(2));
                const predictedEmission = newEmission + (Math.random() - 0.5) * 4;
                const residual = Math.abs(predictedEmission - newEmission);
                const drift = prev.drift_intelligence_score * 0.8 + residual * 0.2;

                return {
                    emission: newEmission,
                    temp: Math.max(60, Math.min(100, Math.round(prev.temp + (Math.random() - 0.5) * 2))),
                    runtime: newRuntime,
                    carbon_footprint: parseFloat((5.0 + (newEmission / 100) * 5.0).toFixed(2)),
                    drift_intelligence_score: parseFloat(drift.toFixed(2)),
                    lastUpdate: new Date(),
                };
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [paused]); // re-evaluate whenever paused changes

    return data;
}
