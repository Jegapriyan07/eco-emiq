/**
 * City Admin Dashboard
 * Fetches ALL data from the physics-based simulation engine (ML API)
 * Every value is logically correlated: AQI, PM2.5, CO, NOx, temperature, wind, traffic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { MapPin, Wifi, AlertTriangle, TrendingUp, BarChart3, RefreshCw, Download, Wind, Thermometer, Droplets, Flame, BrainCircuit } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue (avoids broken image module imports)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ML_BASE = '/ml-api';

interface SensorConfidence {
    device_id: string;
    confidence_score: number;
    health_status: string;
    is_healthy: boolean;
    needs_calibration: boolean;
    has_hardware_failure: boolean;
    anomaly_spikes: Array<{ index: number; value: number; z_score: number; timestamp: string }>;
    recommendations: string[];
    features: Record<string, number>;
    model_version: string;
}

interface WardState {
    ward_id: string;
    name: string;
    aqi: number;
    pm25: number;
    co: number;
    nox: number;
    temp: number;
    humidity: number;
    wind_speed: number;
    devices: number;
    online_devices: number;
    alerts: any[];
    risk_level: string;
    traffic_load: number;
    sensor_confidence?: SensorConfidence;
}

interface CitySnapshot {
    timestamp: string;
    city: string;
    avg_aqi: number;
    total_devices: number;
    online_devices: number;
    total_alerts: number;
    city_carbon_footprint: number;
    drift_intelligence_score: number;
    wards: WardState[];
    alerts: any[];
}

interface HourlyPoint {
    hour: string;
    aqi: number;
    pm25: number;
    co: number;
}

export default function CityAdminDashboard() {
    const { t } = useLanguage();
    const [city, setCity] = useState<CitySnapshot | null>(null);
    const [selectedWard, setSelectedWard] = useState<WardState | null>(null);
    const [hourlyTrend, setHourlyTrend] = useState<HourlyPoint[]>([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [refreshing, setRefreshing] = useState(false);
    const [forecast, setForecast] = useState<any[]>([]);
    const [deviceConfidences, setDeviceConfidences] = useState<Record<string, SensorConfidence>>({});
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const polygonsRef = useRef<L.Polygon[]>([]);
    const [mapInitialized, setMapInitialized] = useState(false);

    const fetchSensorConfidence = useCallback(async (ward: WardState) => {
        try {
            // Generate sample readings from ward data for confidence check
            const readings = [];
            const now = new Date();
            for (let i = 0; i < 10; i++) {
                const timestamp = new Date(now.getTime() - (9 - i) * 3600000); // Last 10 hours
                readings.push({
                    timestamp: timestamp.toISOString(),
                    value: ward.pm25 + (Math.random() - 0.5) * 5, // Add some variation
                    pm25: ward.pm25 + (Math.random() - 0.5) * 5,
                    aqi: ward.aqi + (Math.random() - 0.5) * 3,
                    calibration_age: 30 + Math.random() * 60 // 30-90 days
                });
            }

            const response = await fetch(`${ML_BASE}/predict/sensor_confidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: `ward_${ward.ward_id}`,
                    readings: readings
                })
            });

            if (response.ok) {
                const confidence: SensorConfidence = await response.json();
                setDeviceConfidences(prev => ({
                    ...prev,
                    [ward.ward_id]: confidence
                }));
            }
        } catch (e) {
            console.error('Failed to fetch sensor confidence:', e);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [cityRes, forecastRes] = await Promise.all([
                fetch(`${ML_BASE}/simulate/city`),
                fetch(`${ML_BASE}/predict/ward_forecast?ward_id=t_nagar&horizon=72`),
            ]);

            if (cityRes.ok) {
                const data: CitySnapshot = await cityRes.json();
                setCity(data);

                // Fetch sensor confidence for each ward
                data.wards.forEach(ward => {
                    fetchSensorConfidence(ward);
                });

                if (!selectedWard) {
                    setSelectedWard(data.wards[0]);
                } else {
                    const updated = data.wards.find(w => w.ward_id === selectedWard.ward_id);
                    if (updated) setSelectedWard(updated);
                }
            }

            if (forecastRes.ok) {
                const fData = await forecastRes.json();
                setForecast([
                    { time: 'Now', aqi: Math.round(fData.current_aqi) },
                    ...fData.forecasts.map((f: any) => ({ time: `+${f.hour}h`, aqi: Math.round(f.aqi) }))
                ]);
            }

            setLastUpdated(new Date());
        } catch (e) {
            console.error('Failed to fetch city data:', e);
        }
    }, [selectedWard, fetchSensorConfidence]);

    // Fetch hourly trend when ward changes
    const fetchHourly = useCallback(async (wardId: string) => {
        try {
            const res = await fetch(`${ML_BASE}/simulate/ward_hourly/${wardId}?hours=24`);
            if (res.ok) setHourlyTrend(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    // Auto-refresh every 8 seconds
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, []);

    // Ensure map stays visible and properly sized when data updates
    useEffect(() => {
        if (mapRef.current) {
            setMapInitialized(true);
            // Invalidate size when city data updates
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                }
            }, 50);
        }
    }, [city]);

    // Fetch hourly trend when selected ward changes
    useEffect(() => {
        if (selectedWard) fetchHourly(selectedWard.ward_id);
    }, [selectedWard?.ward_id]);

    // Initialize Leaflet map - simplified and reliable
    useEffect(() => {
        // If map already exists, just ensure it's visible
        if (mapRef.current) {
            setMapInitialized(true);
            return;
        }

        // Wait for container to be ready
        const initMap = () => {
            if (!mapContainerRef.current) {
                return false;
            }

            // Don't initialize if map already exists
            if (mapRef.current) {
                setMapInitialized(true);
                return true;
            }

            try {
                // Initialize map centered on Chennai
                const map = L.map(mapContainerRef.current, {
                    center: [13.0827, 80.2707], // Chennai coordinates
                    zoom: 11,
                    zoomControl: true,
                });

                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19,
                }).addTo(map);

                mapRef.current = map;

                // Set initialized immediately
                setMapInitialized(true);

                // Invalidate size after map is created
                setTimeout(() => {
                    if (mapRef.current) {
                        mapRef.current.invalidateSize();
                    }
                }, 100);

                return true;
            } catch (error) {
                console.error('Error initializing map:', error);
                return false;
            }
        };

        // Try to initialize immediately
        if (!initMap()) {
            // If failed, retry after a short delay
            const timer = setTimeout(() => {
                if (!mapRef.current && mapContainerRef.current) {
                    initMap();
                } else if (mapRef.current) {
                    setMapInitialized(true);
                }
            }, 200);

            // Fallback: clear loading state after 3 seconds even if map didn't initialize
            const fallbackTimer = setTimeout(() => {
                if (mapRef.current) {
                    setMapInitialized(true);
                }
            }, 3000);

            return () => {
                clearTimeout(timer);
                clearTimeout(fallbackTimer);
            };
        }

        // Handle window resize
        const handleResize = () => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Update map with ward data
    useEffect(() => {
        // Ensure map is visible
        if (mapRef.current) {
            setMapInitialized(true);
        }

        if (!mapRef.current || !city || !city.wards || city.wards.length === 0) {
            return;
        }

        const map = mapRef.current;

        // Ensure map is visible
        setMapInitialized(true);

        // Invalidate size to ensure proper rendering
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);

        // Clear existing markers and polygons
        markersRef.current.forEach(marker => map.removeLayer(marker));
        polygonsRef.current.forEach(polygon => map.removeLayer(polygon));
        markersRef.current = [];
        polygonsRef.current = [];

        // Create markers and polygons for each ward
        city.wards.forEach((ward) => {
            // Get ward coordinates (approximate Chennai areas)
            const coords = getWardCoordinates(ward.ward_id, ward.name);
            if (!coords) return;

            const color = getAqiColor(ward.aqi);
            const fillColor = getAqiFillColor(ward.aqi);

            // Create polygon if we have polygon data
            if (coords.polygon && coords.polygon.length > 0) {
                const polygon = L.polygon(coords.polygon.map(([lat, lng]) => [lat, lng]), {
                    color: color,
                    fillColor: fillColor,
                    fillOpacity: 0.6,
                    weight: 2,
                }).addTo(map);

                polygon.on('click', () => {
                    setSelectedWard(ward);
                });

                // Add popup to polygon
                const popupText = `
                    <div style="font-weight: bold; margin-bottom: 4px;">${ward.name}</div>
                    <div>AQI: <strong>${ward.aqi}</strong> (${aqiLabel(ward.aqi)})</div>
                    <div>${t('devices')}: ${ward.online_devices}/${ward.devices}</div>
                    ${ward.alerts.length > 0 ? `<div style="color: red; margin-top: 4px;">${ward.alerts.length} ${t('alerts')}</div>` : ''}
                `;
                polygon.bindPopup(popupText);

                polygonsRef.current.push(polygon);
            }

            // Create marker at center
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `
                    <div style="
                        background: ${fillColor};
                        color: white;
                        border: 2px solid ${color};
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    ">${ward.aqi}</div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
            });

            const marker = L.marker([coords.center[0], coords.center[1]], { icon }).addTo(map);
            marker.on('click', () => {
                setSelectedWard(ward);
            });

            const markerPopupText = `
                <div style="font-weight: bold; margin-bottom: 4px;">${ward.name}</div>
                <div>AQI: <strong>${ward.aqi}</strong> (${aqiLabel(ward.aqi)})</div>
                <div>${t('pm25')}: ${ward.pm25} μg/m³</div>
                <div>${t('co')}: ${ward.co} ppm</div>
                <div>${t('devices')}: ${ward.online_devices}/${ward.devices}</div>
            `;
            marker.bindPopup(markerPopupText);

            markersRef.current.push(marker);
        });

        // Fit map to show all wards and invalidate size again
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();

                if (polygonsRef.current.length > 0) {
                    const group = new L.FeatureGroup(polygonsRef.current);
                    mapRef.current.fitBounds(group.getBounds().pad(0.1));
                } else if (markersRef.current.length > 0) {
                    const group = new L.FeatureGroup(markersRef.current);
                    mapRef.current.fitBounds(group.getBounds().pad(0.1));
                }
            }
        }, 100);
    }, [city, t]);

    const getAqiColor = (aqi: number) => {
        if (aqi <= 50) return '#22c55e'; // green
        if (aqi <= 100) return '#eab308'; // yellow
        return '#ef4444'; // red
    };

    const getAqiFillColor = (aqi: number) => {
        if (aqi <= 50) return '#22c55e80'; // green with opacity
        if (aqi <= 100) return '#eab30880'; // yellow with opacity
        return '#ef444480'; // red with opacity
    };

    const getWardCoordinates = (wardId: string, wardName: string) => {
        // Chennai ward coordinates (approximate)
        const chennaiWards: Record<string, { center: [number, number], polygon: [number, number][] }> = {
            't_nagar': {
                center: [13.0418, 80.2341],
                polygon: [
                    [13.035, 80.225], [13.048, 80.225],
                    [13.048, 80.243], [13.035, 80.243], [13.035, 80.225]
                ]
            },
            'anna_nagar': {
                center: [13.0850, 80.2100],
                polygon: [
                    [13.078, 80.200], [13.092, 80.200],
                    [13.092, 80.220], [13.078, 80.220], [13.078, 80.200]
                ]
            },
            'adyar': {
                center: [13.0067, 80.2206],
                polygon: [
                    [13.000, 80.210], [13.013, 80.210],
                    [13.013, 80.231], [13.000, 80.231], [13.000, 80.210]
                ]
            },
            'mylapore': {
                center: [13.0339, 80.2627],
                polygon: [
                    [13.027, 80.253], [13.041, 80.253],
                    [13.041, 80.272], [13.027, 80.272], [13.027, 80.253]
                ]
            },
            'velachery': {
                center: [12.9789, 80.2203],
                polygon: [
                    [12.972, 80.210], [12.986, 80.210],
                    [12.986, 80.231], [12.972, 80.231], [12.972, 80.210]
                ]
            },
            'porur': {
                center: [13.0356, 80.1567],
                polygon: [
                    [13.029, 80.147], [13.042, 80.147],
                    [13.042, 80.166], [13.029, 80.166], [13.029, 80.147]
                ]
            },
        };

        // Try to find by ward_id first, then by name
        let coords = chennaiWards[wardId.toLowerCase()];
        if (!coords) {
            // Try to match by name
            const nameKey = Object.keys(chennaiWards).find(key =>
                wardName.toLowerCase().includes(key.replace('_', ' ')) ||
                key.replace('_', ' ').includes(wardName.toLowerCase())
            );
            if (nameKey) coords = chennaiWards[nameKey];
        }

        // Default fallback - use Chennai center with approximate polygon
        if (!coords) {
            const centerLat = 13.0827 + (Math.random() - 0.5) * 0.1;
            const centerLng = 80.2707 + (Math.random() - 0.5) * 0.1;
            coords = {
                center: [centerLat, centerLng],
                polygon: [
                    [centerLat - 0.01, centerLng - 0.01],
                    [centerLat + 0.01, centerLng - 0.01],
                    [centerLat + 0.01, centerLng + 0.01],
                    [centerLat - 0.01, centerLng + 0.01],
                    [centerLat - 0.01, centerLng - 0.01]
                ]
            };
        }

        return coords;
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        if (selectedWard) await fetchHourly(selectedWard.ward_id);
        setRefreshing(false);
    };

    const handleExport = () => {
        if (!city) return;
        const csv = ['Ward,AQI,PM2.5,CO,NOx,Temp,Humidity,Wind,Devices,Online,Risk',
            ...city.wards.map(w => `${w.name},${w.aqi},${w.pm25},${w.co},${w.nox},${w.temp},${w.humidity},${w.wind_speed},${w.devices},${w.online_devices},${w.risk_level}`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ecotronics_city_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const aqiColor = (aqi: number) => aqi <= 50 ? 'text-success-600' : aqi <= 100 ? 'text-warning-600' : 'text-danger-600';
    const aqiBg = (aqi: number) => aqi <= 50 ? 'bg-success-400/70' : aqi <= 100 ? 'bg-warning-400/70' : 'bg-danger-400/70';
    const badgeColor = (aqi: number) => aqi <= 50 ? 'bg-success-100 text-success-700' : aqi <= 100 ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700';
    const aqiLabel = (aqi: number) => {
        if (aqi <= 50) return t('aqi_good');
        if (aqi <= 100) return t('aqi_moderate');
        return t('aqi_unhealthy');
    };

    if (!city) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
                <span className="ml-3 text-gray-500">{t('connecting_simulation')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('city_dashboard')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm flex items-center gap-2">
                        Chennai — {t('physics_simulation')}
                        <span className="flex items-center gap-1 text-success-600">
                            <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse inline-block" />
                            {t('live')} · {lastUpdated.toLocaleTimeString()}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {t('refresh')}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        {t('export')}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${Object.keys(deviceConfidences).length > 0 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'} gap-6`}>
                <StatCard icon={Wifi} label={t('total_devices')} value={city.total_devices.toString()} subtitle={`${city.online_devices} ${t('online')} · ${city.total_devices - city.online_devices} ${t('offline')}`} color="text-blue-600" />
                <StatCard icon={MapPin} label={t('city_wards')} value={city.wards.length.toString()} subtitle={t('all_monitored')} color="text-green-600" />
                <StatCard icon={AlertTriangle} label={t('active_alerts')} value={city.total_alerts.toString()} subtitle={city.total_alerts > 0 ? t('threshold_violations') : t('all_clear')} color="text-orange-600" />
                <StatCard icon={TrendingUp} label={t('avg_aqi')} value={city.avg_aqi.toString()} subtitle={aqiLabel(city.avg_aqi)} color={aqiColor(city.avg_aqi)} />
                <StatCard icon={Flame} label="Carbon Footprint" value={`${city.city_carbon_footprint.toLocaleString()} kg`} subtitle="CO₂e Total Est." color="text-green-600" />
                <StatCard icon={BrainCircuit} label="Drift Score" value={city.drift_intelligence_score?.toString() || '0'} subtitle="Residual Avg" color="text-indigo-600" />

                {/* Average Sensor Confidence */}
                {Object.keys(deviceConfidences).length > 0 && (
                    <StatCard
                        icon={BarChart3}
                        label={t('sensor_confidence')}
                        value={`${Math.round(Object.values(deviceConfidences).reduce((sum, c) => sum + c.confidence_score, 0) / Object.keys(deviceConfidences).length * 100)}%`}
                        subtitle={(() => {
                            const avgConf = Object.values(deviceConfidences).reduce((sum, c) => sum + c.confidence_score, 0) / Object.keys(deviceConfidences).length;
                            const needsCal = Object.values(deviceConfidences).some(c => c.needs_calibration);
                            const hasFailure = Object.values(deviceConfidences).some(c => c.has_hardware_failure);
                            if (hasFailure) return t('hardware_inspection_warning');
                            if (needsCal) return t('calibration_needed');
                            return avgConf >= 0.8 ? t('excellent') : avgConf >= 0.6 ? t('good') : t('fair');
                        })()}
                        color={(() => {
                            const avgConf = Object.values(deviceConfidences).reduce((sum, c) => sum + c.confidence_score, 0) / Object.keys(deviceConfidences).length;
                            return avgConf >= 0.8 ? 'text-green-600' : avgConf >= 0.6 ? 'text-yellow-600' : 'text-red-600';
                        })()}
                    />
                )}
            </div>

            {/* Map + Ward Selector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Heatmap */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('city_aqi_heatmap')}</h2>
                    <div className="relative w-full h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                        {!mapInitialized && mapContainerRef.current && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100 dark:bg-gray-900 rounded-lg pointer-events-none">
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
                                    <span className="text-sm text-gray-500">{t('loading')} {t('city_aqi_heatmap')}...</span>
                                </div>
                            </div>
                        )}
                        <div
                            ref={mapContainerRef}
                            className="w-full h-full z-0"
                            style={{
                                minHeight: '384px',
                                height: '384px',
                                width: '100%',
                                position: 'relative'
                            }}
                        />
                        {/* Legend */}
                        <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 rounded-lg p-3 shadow-lg text-xs z-[1000]">
                            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('aqi_scale')}</p>
                            {[
                                [t('aqi_good_range'), '#22c55e'],
                                [t('aqi_moderate_range'), '#eab308'],
                                [t('aqi_unhealthy_range'), '#ef4444']
                            ].map(([l, c]) => (
                                <div key={l} className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
                                    <span className="text-gray-600 dark:text-gray-300">{l}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Selected Ward Detail */}
                {selectedWard && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('ward_details')}</h2>
                        <div className={`p-4 rounded-xl ${badgeColor(selectedWard.aqi)}`}>
                            <h3 className="text-lg font-bold">{selectedWard.name}</h3>
                            <p className="text-sm mt-1">{selectedWard.online_devices}/{selectedWard.devices} {t('devices')} · {selectedWard.alerts.length} {t('alerts')}</p>
                            <p className="text-3xl font-black mt-2">AQI {selectedWard.aqi}</p>
                            <p className="text-sm font-semibold">{aqiLabel(selectedWard.aqi)}</p>

                            {/* Sensor Confidence Score */}
                            {deviceConfidences[selectedWard.ward_id] && (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-white/90">{t('sensor_confidence')}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${deviceConfidences[selectedWard.ward_id].confidence_score >= 0.8 ? 'bg-green-500/30 text-white' :
                                            deviceConfidences[selectedWard.ward_id].confidence_score >= 0.6 ? 'bg-yellow-500/30 text-white' :
                                                'bg-red-500/30 text-white'
                                            }`}>
                                            {Math.round(deviceConfidences[selectedWard.ward_id].confidence_score * 100)}%
                                        </span>
                                    </div>
                                    {deviceConfidences[selectedWard.ward_id].needs_calibration && (
                                        <div className="text-xs bg-yellow-500/40 text-white px-2 py-1 rounded mt-2">
                                            ⚠️ {t('calibration_needed')}
                                        </div>
                                    )}
                                    {deviceConfidences[selectedWard.ward_id].has_hardware_failure && (
                                        <div className="text-xs bg-red-500/40 text-white px-2 py-1 rounded mt-2">
                                            🔧 {t('hardware_failure_detected')}
                                        </div>
                                    )}
                                    {deviceConfidences[selectedWard.ward_id].anomaly_spikes.length > 0 && (
                                        <div className="text-xs bg-orange-500/40 text-white px-2 py-1 rounded mt-2">
                                            📈 {deviceConfidences[selectedWard.ward_id].anomaly_spikes.length} {t('anomaly_spikes')}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: t('pm25'), value: `${selectedWard.pm25} μg/m³`, icon: '💨' },
                                { label: t('temperature'), value: `${selectedWard.temp}°C`, icon: '🌡️' },
                                { label: t('co_level'), value: `${selectedWard.co} ppm`, icon: '🏭' },
                                { label: t('nox'), value: `${selectedWard.nox} ppm`, icon: '⚗️' },
                                { label: t('humidity'), value: `${selectedWard.humidity}%`, icon: '💧' },
                                { label: t('wind'), value: `${selectedWard.wind_speed} km/h`, icon: '🌬️' },
                            ].map(m => (
                                <div key={m.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.icon} {m.label}</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{m.value}</p>
                                </div>
                            ))}

                            {/* Sensor Confidence Details */}
                            {deviceConfidences[selectedWard.ward_id] && (
                                <div className="col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">🤖 {t('sensor_confidence')} (ML)</p>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${deviceConfidences[selectedWard.ward_id].confidence_score >= 0.8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            deviceConfidences[selectedWard.ward_id].confidence_score >= 0.6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                            {Math.round(deviceConfidences[selectedWard.ward_id].confidence_score * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                        {t('sensor_health')}: <span className="font-semibold capitalize">{deviceConfidences[selectedWard.ward_id].health_status}</span>
                                    </p>
                                    {deviceConfidences[selectedWard.ward_id].recommendations.length > 0 && (
                                        <div className="space-y-1">
                                            {deviceConfidences[selectedWard.ward_id].recommendations.map((rec, idx) => (
                                                <p key={idx} className="text-xs text-gray-600 dark:text-gray-400">• {rec}</p>
                                            ))}
                                        </div>
                                    )}
                                    {deviceConfidences[selectedWard.ward_id].anomaly_spikes.length > 0 && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                            ⚠️ {deviceConfidences[selectedWard.ward_id].anomaly_spikes.length} {t('anomaly_spikes')} detected
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            {city.wards.map(w => (
                                <div
                                    key={w.ward_id}
                                    onClick={() => setSelectedWard(w)}
                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedWard.ward_id === w.ward_id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <span className="text-sm font-medium text-gray-800 dark:text-white">{w.name}</span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badgeColor(w.aqi)}`}>AQI {w.aqi}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 72-Hour ML Forecast */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('forecast')}</h2>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">🧠 ML Model</span>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={forecast}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Line type="monotone" dataKey="aqi" stroke="#1890ff" strokeWidth={3} dot={{ fill: '#1890ff', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">{t('forecast_description')}</p>
                    </div>
                </div>

                {/* Ward AQI Comparison */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('ward_comparison')}</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={city.wards}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-10} textAnchor="end" height={60} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="aqi" radius={[6, 6, 0, 0]} fill="#1890ff" name="AQI" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hourly Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {t('hourly_trend')} — {selectedWard?.name || t('city')}
                    <span className="text-xs text-gray-400 ml-3 font-normal">{t('correlated_pollutant_data')}</span>
                </h2>
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={hourlyTrend}>
                        <defs>
                            <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }} />
                        <Legend />
                        <Area type="monotone" dataKey="aqi" stroke="#1890ff" fill="url(#aqiGrad)" strokeWidth={2} name="AQI" />
                        <Line type="monotone" dataKey="pm25" stroke="#722ed1" strokeWidth={2} dot={false} name="PM2.5" />
                        <Line type="monotone" dataKey="co" stroke="#ff4d4f" strokeWidth={2} dot={false} name="CO (ppm)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtitle, color }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
}
