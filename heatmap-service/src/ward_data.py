"""
Chennai Ward Data — 6 wards with GeoJSON polygons and metadata
"""

CHENNAI_WARDS = [
    {
        "id": "t_nagar",
        "name": "T. Nagar",
        "zone": "Central",
        "center": [80.2341, 13.0418],
        "polygon": [
            [80.225, 13.035], [80.243, 13.035],
            [80.243, 13.048], [80.225, 13.048], [80.225, 13.035]
        ],
        "area_km2": 5.2,
        "population": 125000,
        "device_count": 48,
    },
    {
        "id": "anna_nagar",
        "name": "Anna Nagar",
        "zone": "North",
        "center": [80.2100, 13.0850],
        "polygon": [
            [80.200, 13.078], [80.220, 13.078],
            [80.220, 13.092], [80.200, 13.092], [80.200, 13.078]
        ],
        "area_km2": 6.8,
        "population": 145000,
        "device_count": 45,
    },
    {
        "id": "adyar",
        "name": "Adyar",
        "zone": "South",
        "center": [80.2206, 13.0067],
        "polygon": [
            [80.210, 13.000], [80.231, 13.000],
            [80.231, 13.013], [80.210, 13.013], [80.210, 13.000]
        ],
        "area_km2": 4.5,
        "population": 98000,
        "device_count": 42,
    },
    {
        "id": "mylapore",
        "name": "Mylapore",
        "zone": "South",
        "center": [80.2627, 13.0339],
        "polygon": [
            [80.253, 13.027], [80.272, 13.027],
            [80.272, 13.041], [80.253, 13.041], [80.253, 13.027]
        ],
        "area_km2": 3.8,
        "population": 110000,
        "device_count": 40,
    },
    {
        "id": "velachery",
        "name": "Velachery",
        "zone": "South",
        "center": [80.2203, 12.9789],
        "polygon": [
            [80.210, 12.972], [80.231, 12.972],
            [80.231, 12.986], [80.210, 12.986], [80.210, 12.972]
        ],
        "area_km2": 5.5,
        "population": 105000,
        "device_count": 38,
    },
    {
        "id": "porur",
        "name": "Porur",
        "zone": "West",
        "center": [80.1567, 13.0356],
        "polygon": [
            [80.147, 13.029], [80.166, 13.029],
            [80.166, 13.042], [80.147, 13.042], [80.147, 13.029]
        ],
        "area_km2": 4.2,
        "population": 92000,
        "device_count": 44,
    },
]

# Alias for backward compatibility
NAGPUR_WARDS = CHENNAI_WARDS
