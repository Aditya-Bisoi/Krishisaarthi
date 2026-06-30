import httpx
from datetime import date, timedelta
from typing import List, Dict, Any
import random
from backend.app.models.models import WeatherForecast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Approximate coordinates for key agricultural districts
DISTRICT_COORDS = {
    "Cuttack": {"lat": 20.46, "lon": 85.88},
    "Ludhiana": {"lat": 30.90, "lon": 75.85},
    "Nashik": {"lat": 19.99, "lon": 73.78},
    "Vijayawada": {"lat": 16.50, "lon": 80.64},
    "Bathinda": {"lat": 30.21, "lon": 74.94},
}

async def get_district_weather(db: AsyncSession, district: str) -> List[Dict[str, Any]]:
    """
    Retrieves weather forecast for the next 7 days.
    Checks cache in the database first, otherwise queries Open-Meteo API or falls back to synthetic weather data.
    """
    today = date.today()
    end_date = today + timedelta(days=6)
    
    # Check cache in Database
    stmt = select(WeatherForecast).where(
        WeatherForecast.district == district,
        WeatherForecast.forecast_date >= today,
        WeatherForecast.forecast_date <= end_date
    ).order_by(WeatherForecast.forecast_date.asc())
    
    result = await db.execute(stmt)
    cached_forecasts = result.scalars().all()
    
    if len(cached_forecasts) >= 7:
        return [
            {
                "district": f.district,
                "forecast_date": f.forecast_date,
                "temp_c": f.temp_c,
                "humidity_pct": f.humidity_pct,
                "rainfall_mm": f.rainfall_mm,
                "wind_kph": f.wind_kph
            }
            for f in cached_forecasts
        ]
        
    # Not cached, fetch new weather forecast
    coords = DISTRICT_COORDS.get(district, {"lat": 20.0, "lon": 75.0})
    lat, lon = coords["lat"], coords["lon"]
    
    forecasts = []
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,relative_humidity_2m_max,precipitation_sum,wind_speed_10m_max&timezone=auto"
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                daily = data.get("daily", {})
                dates = daily.get("time", [])
                temps = daily.get("temperature_2m_max", [])
                humidities = daily.get("relative_humidity_2m_max", [])
                precips = daily.get("precipitation_sum", [])
                winds = daily.get("wind_speed_10m_max", [])
                
                # Clear old cache for this range
                await db.execute(
                    WeatherForecast.__table__.delete().where(
                        WeatherForecast.district == district,
                        WeatherForecast.forecast_date >= today
                    )
                )
                
                for i in range(min(7, len(dates))):
                    f_date = date.fromisoformat(dates[i])
                    temp = temps[i] if temps[i] is not None else 30.0
                    hum = humidities[i] if humidities[i] is not None else 65.0
                    rain = precips[i] if precips[i] is not None else 0.0
                    wind = winds[i] if winds[i] is not None else 12.0
                    
                    db_forecast = WeatherForecast(
                        district=district,
                        forecast_date=f_date,
                        temp_c=temp,
                        humidity_pct=hum,
                        rainfall_mm=rain,
                        wind_kph=wind
                    )
                    db.add(db_forecast)
                    
                    forecasts.append({
                        "district": district,
                        "forecast_date": f_date,
                        "temp_c": temp,
                        "humidity_pct": hum,
                        "rainfall_mm": rain,
                        "wind_kph": wind
                    })
                await db.flush()
                return forecasts
    except Exception:
        # Request failed, log and fall back to synthetic data
        pass

    # Generate synthetic/fallback data for Indian farming regions
    # Clear old cache for this range
    await db.execute(
        WeatherForecast.__table__.delete().where(
            WeatherForecast.district == district,
            WeatherForecast.forecast_date >= today
        )
    )
    
    # Establish regional weather base lines
    base_temp = 32.0
    base_humidity = 60.0
    rain_probability = 0.2
    
    if district in ["Cuttack", "Vijayawada"]:
        base_temp = 34.0
        base_humidity = 75.0
        rain_probability = 0.4
    elif district in ["Ludhiana", "Bathinda"]:
        base_temp = 37.0
        base_humidity = 40.0
        rain_probability = 0.1
        
    random.seed(district) # repeatable weather forecasts
    for i in range(7):
        f_date = today + timedelta(days=i)
        
        temp = round(base_temp + random.uniform(-3, 3), 1)
        hum = round(base_humidity + random.uniform(-10, 10), 1)
        hum = max(10.0, min(100.0, hum))
        
        rain = 0.0
        if random.random() < rain_probability:
            rain = round(random.uniform(2.0, 30.0), 1)
            
        wind = round(random.uniform(5.0, 22.0), 1)
        
        db_forecast = WeatherForecast(
            district=district,
            forecast_date=f_date,
            temp_c=temp,
            humidity_pct=hum,
            rainfall_mm=rain,
            wind_kph=wind
        )
        db.add(db_forecast)
        forecasts.append({
            "district": district,
            "forecast_date": f_date,
            "temp_c": temp,
            "humidity_pct": hum,
            "rainfall_mm": rain,
            "wind_kph": wind
        })
        
    await db.flush()
    return forecasts
