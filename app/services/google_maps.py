"""
Service Google Maps pour GoCampus
- Géocodage d'adresses (adresse → coordonnées)
- Calcul de distance et durée (Directions API)
"""

import httpx
from typing import Optional, Tuple
from dataclasses import dataclass
from app.config import settings


@dataclass
class GeocodingResult:
    """Résultat du géocodage d'une adresse"""
    address: str  # Adresse formatée par Google
    lat: float
    lng: float


@dataclass
class RouteResult:
    """Résultat du calcul d'itinéraire"""
    distance_km: float
    duration_min: int
    distance_text: str  # Ex: "67.5 km"
    duration_text: str  # Ex: "52 mins"


class GoogleMapsError(Exception):
    """Exception levée en cas d'erreur avec l'API Google Maps"""
    pass


class GoogleMapsService:
    """Service pour interagir avec les APIs Google Maps"""
    
    GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"
    
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        # On ne lève plus d'erreur ici pour éviter de bloquer l'app si la clé manque
        if not self.api_key:
            print("⚠️ Attention: GOOGLE_MAPS_API_KEY non configurée.")
    
    async def geocode_address(self, address: str) -> Optional[GeocodingResult]:
        """
        Convertit une adresse en coordonnées GPS.
        """
        if not self.api_key:
            return None

        params = {
            "address": address,
            "key": self.api_key,
            "language": "fr",
            "region": "fr"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.GEOCODING_URL, params=params)
            data = response.json()
        
        if data["status"] != "OK":
            if data["status"] == "ZERO_RESULTS":
                return None
            # Inclure le message d'erreur détaillé s'il existe
            error_msg = data.get("error_message", "Aucun détail fourni par Google")
            raise GoogleMapsError(f"Erreur Geocoding API: {data['status']} - {error_msg}")
        
        result = data["results"][0]
        location = result["geometry"]["location"]
        
        return GeocodingResult(
            address=result["formatted_address"],
            lat=location["lat"],
            lng=location["lng"]
        )
    
    async def calculate_route(
        self, 
        origin_lat: float, 
        origin_lng: float,
        dest_lat: float,
        dest_lng: float
    ) -> Optional[RouteResult]:
        """
        Calcule la distance et la durée entre deux points.
        """
        if not self.api_key:
            return None

        params = {
            "origin": f"{origin_lat},{origin_lng}",
            "destination": f"{dest_lat},{dest_lng}",
            "key": self.api_key,
            "language": "fr",
            "mode": "driving"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.DIRECTIONS_URL, params=params)
            data = response.json()
        
        if data["status"] != "OK":
            if data["status"] == "ZERO_RESULTS":
                return None
            # Inclure le message d'erreur détaillé s'il existe (CRUCIAL pour le debug)
            error_msg = data.get("error_message", "Aucun détail fourni par Google")
            raise GoogleMapsError(f"Erreur Directions API: {data['status']} - {error_msg}")
        
        # Prendre le premier itinéraire et la première étape
        route = data["routes"][0]
        leg = route["legs"][0]
        
        # Distance en mètres → km
        distance_m = leg["distance"]["value"]
        distance_km = round(distance_m / 1000, 1)
        
        # Durée en secondes → minutes
        duration_s = leg["duration"]["value"]
        duration_min = round(duration_s / 60)
        
        return RouteResult(
            distance_km=distance_km,
            duration_min=duration_min,
            distance_text=leg["distance"]["text"],
            duration_text=leg["duration"]["text"]
        )
    
    async def calculate_route_from_addresses(
        self,
        origin_address: str,
        dest_address: str
    ) -> Tuple[Optional[GeocodingResult], Optional[GeocodingResult], Optional[RouteResult]]:
        """
        Géocode les deux adresses et calcule l'itinéraire.
        """
        origin = await self.geocode_address(origin_address)
        if not origin:
            return None, None, None
        
        dest = await self.geocode_address(dest_address)
        if not dest:
            return origin, None, None
        
        route = await self.calculate_route(
            origin.lat, origin.lng,
            dest.lat, dest.lng
        )
        
        return origin, dest, route


def calculate_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calcule la distance à vol d'oiseau entre deux points (formule de Haversine).
    Utilisé pour la recherche par proximité sans appel API.
    """
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Rayon de la Terre en km
    
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return round(R * c, 2)


# Instance singleton pour l'utilisation dans l'app
_google_maps_service: Optional[GoogleMapsService] = None


def get_google_maps_service() -> GoogleMapsService:
    """Retourne l'instance singleton du service Google Maps"""
    global _google_maps_service
    if _google_maps_service is None:
        _google_maps_service = GoogleMapsService()
    return _google_maps_service