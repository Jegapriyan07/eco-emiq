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

export function useMockVehicleData() {
    const [data, setData] = useState<VehicleState | null>(null);
    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch('/ml-api/simulate/vehicle');
            if (res.ok) setData(await res.json());
        };
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);
    return data;
}
