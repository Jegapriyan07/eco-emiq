import { useEffect, useState } from "react";

export interface GeneratorState {
    emission: number;
    co: number;
    pm25: number;
    nox: number;
    temp: number;
    runtime: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    lastUpdate: Date;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export function useMockGeneratorData(intervalMs = 2000) {
    const [data, setData] = useState<GeneratorState>({
        emission: 45.2,
        co: 12.4,
        pm25: 28.5,
        nox: 0.55,
        temp: 78,
        runtime: 125.5,
        carbon_footprint: 7.2,
        drift_intelligence_score: 0.5,
        lastUpdate: new Date(),
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setData((prev) => {
                const wobble = (Math.random() - 0.5) * 3;
                const newEmission = parseFloat(clamp(prev.emission + wobble, 18, 85).toFixed(1));
                const newCo = parseFloat(clamp(prev.co + wobble * 0.35, 3, 40).toFixed(1));
                const newPm25 = parseFloat(clamp(prev.pm25 + wobble * 0.55, 8, 90).toFixed(1));
                const newNox = parseFloat(clamp(prev.nox + wobble * 0.02, 0.15, 1.8).toFixed(2));
                const newRuntime = parseFloat((prev.runtime + intervalMs / 3_600_000).toFixed(3));
                const predictedEmission = newEmission + (Math.random() - 0.5) * 4;
                const residual = Math.abs(predictedEmission - newEmission);
                const drift = prev.drift_intelligence_score * 0.8 + residual * 0.2;

                return {
                    emission: newEmission,
                    co: newCo,
                    pm25: newPm25,
                    nox: newNox,
                    temp: Math.round(clamp(prev.temp + (Math.random() - 0.5) * 2, 60, 100)),
                    runtime: newRuntime,
                    carbon_footprint: parseFloat((5.0 + (newEmission / 100) * 5.0).toFixed(2)),
                    drift_intelligence_score: parseFloat(drift.toFixed(2)),
                    lastUpdate: new Date(),
                };
            });
        }, intervalMs);
        return () => clearInterval(interval);
    }, [intervalMs]);

    return data;
}
