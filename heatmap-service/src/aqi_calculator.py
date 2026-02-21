"""
AQI Calculator
Converts pollutant concentrations to AQI using US EPA breakpoints.
"""


# US EPA AQI Breakpoints
# (C_low, C_high, I_low, I_high)
PM25_BREAKPOINTS = [
    (0.0,   12.0,   0,   50),
    (12.1,  35.4,  51,  100),
    (35.5,  55.4, 101,  150),
    (55.5, 150.4, 151,  200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]

CO_BREAKPOINTS = [
    (0.0,   4.4,   0,  50),
    (4.5,   9.4,  51, 100),
    (9.5,  12.4, 101, 150),
    (12.5, 15.4, 151, 200),
    (15.5, 30.4, 201, 300),
    (30.5, 40.4, 301, 400),
    (40.5, 50.4, 401, 500),
]

NOX_BREAKPOINTS = [
    (0,    53,   0,  50),
    (54,  100,  51, 100),
    (101, 360, 101, 150),
    (361, 649, 151, 200),
    (650, 1249, 201, 300),
    (1250, 1649, 301, 400),
    (1650, 2049, 401, 500),
]

AQI_CATEGORIES = [
    (0,   50,  "Good",            "#00e400"),
    (51,  100, "Moderate",        "#ffff00"),
    (101, 150, "Unhealthy (Sensitive)", "#ff7e00"),
    (151, 200, "Unhealthy",       "#ff0000"),
    (201, 300, "Very Unhealthy",  "#8f3f97"),
    (301, 500, "Hazardous",       "#7e0023"),
]


class AQICalculator:

    @staticmethod
    def _linear(C, C_low, C_high, I_low, I_high) -> float:
        return ((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low

    @staticmethod
    def pm25_to_aqi(pm25: float) -> float:
        for C_low, C_high, I_low, I_high in PM25_BREAKPOINTS:
            if C_low <= pm25 <= C_high:
                return AQICalculator._linear(pm25, C_low, C_high, I_low, I_high)
        return 500.0

    @staticmethod
    def co_to_aqi(co_ppm: float) -> float:
        for C_low, C_high, I_low, I_high in CO_BREAKPOINTS:
            if C_low <= co_ppm <= C_high:
                return AQICalculator._linear(co_ppm, C_low, C_high, I_low, I_high)
        return 500.0

    @staticmethod
    def nox_to_aqi(nox_ppb: float) -> float:
        for C_low, C_high, I_low, I_high in NOX_BREAKPOINTS:
            if C_low <= nox_ppb <= C_high:
                return AQICalculator._linear(nox_ppb, C_low, C_high, I_low, I_high)
        return 500.0

    @staticmethod
    def composite_aqi(pm25: float = 0, co: float = 0, nox: float = 0) -> float:
        """Overall AQI is the maximum of individual pollutant AQIs"""
        aqis = []
        if pm25 > 0:
            aqis.append(AQICalculator.pm25_to_aqi(pm25))
        if co > 0:
            aqis.append(AQICalculator.co_to_aqi(co))
        if nox > 0:
            aqis.append(AQICalculator.nox_to_aqi(nox))
        return round(max(aqis) if aqis else 0, 1)

    @staticmethod
    def get_category(aqi: float) -> dict:
        for low, high, label, color in AQI_CATEGORIES:
            if low <= aqi <= high:
                return {"label": label, "color": color}
        return {"label": "Hazardous", "color": "#7e0023"}
