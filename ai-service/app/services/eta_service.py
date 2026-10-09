import math

def calculate_eta(store_lat: float, store_lng: float, user_lat: float, user_lng: float) -> dict:
    # Haversine formula in Python
    to_rad = math.radians
    R = 6371.0 # Earth radius in km

    d_lat = to_rad(user_lat - store_lat)
    d_lon = to_rad(user_lng - store_lng)

    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(to_rad(store_lat)) * math.cos(to_rad(user_lat)) * math.sin(d_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_km = R * c

    # Speed assumed: 20 kmph + 8 minutes prep time, clamped between 8 and 45 mins
    travel_time_minutes = (distance_km / 20.0) * 60.0
    total_eta = int(round(travel_time_minutes + 8.0))
    
    # Clamp between 8 and 45 mins
    eta_minutes = max(8, min(total_eta, 45))

    return {
        "etaMinutes": eta_minutes,
        "distanceKm": round(distance_km, 2)
    }