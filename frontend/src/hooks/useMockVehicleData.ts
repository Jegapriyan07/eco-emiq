import { useEffect, useState } from "react";

export interface VehicleState {
    vehicle_id: string;
    timestamp: string;
    emission_score: number;
    co: number;
    co2: number;
    nox: number;
    pm25: number;
    carbon_footprint: number;
    drift_intelligence_score: number;
    engine_temp: number;
    ambient_temp: number;
    traffic_load: number;
    label: string;
}

/**
 * Polls the simulation engine for vehicle data.
 * @param paused - When true (e.g. USB or MQTT is connected), the polling
 *                 interval is suspended so real sensor data is never
 *                 overwritten by simulated readings.
 */
export function useMockVehicleData(paused = false) {
    const [data, setData] = useState<VehicleState | null>(null);

    useEffect(() => {
        // Don't start/resume polling while a real sensor is active
        if (paused) return;

        const fetchData = async () => {
            try {
                const res = await fetch('/ml-api/simulate/vehicle');
                if (res.ok) setData(await res.json());
            } catch {
                // network unavailable – ignore silently
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [paused]); // re-evaluate whenever paused changes

    return data;
}
