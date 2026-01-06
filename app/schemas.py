from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, time
from typing import Optional
from decimal import Decimal

# --- USER ---
class UserBase(BaseModel):
    name: str
    surname: str
    email: EmailStr
    phone_number: Optional[str] = None
    address: Optional[str] = None
    role: str = 'normal'

class UserCreate(UserBase):
    password: str 

class UserOut(UserBase):
    user_id: int

    class Config:
        from_attributes = True

# --- VEHICLE ---
class VehicleBase(BaseModel):
    license_plate: str
    model: str
    color: str
    max_seats: int

class VehicleCreate(VehicleBase):
    pass

class VehicleOut(VehicleBase):
    vehicle_id: int
    driver_id: int

    class Config:
        from_attributes = True

# --- RIDE ---
class RideBase(BaseModel):
    address_from: str
    address_to: str
    departure: datetime
    max_seats: int = Field(gt=0, le=8)
    price: Decimal = Field(ge=0)

class RideCreate(BaseModel):
    """Schema pour la création d'un trajet"""
    # L'adresse libre (l'autre sera l'IUT)
    address: str
    
    # Coordonnées de l'adresse libre (fournies par le frontend via Google Places)
    lat: float
    lng: float
    
    # Direction: True = départ depuis l'IUT, False = arrivée à l'IUT
    from_iut: bool = False
    
    # Infos du trajet
    departure: datetime
    max_seats: int = Field(gt=0, le=8, default=3)
    price: Decimal = Field(ge=0)
    vehicle_id: int

class RideOut(BaseModel):
    """Schema pour l'affichage d'un trajet"""
    ride_id: int
    driver_id: int
    
    # Adresses
    address_from: str
    address_to: str
    
    # Coordonnées
    lat_from: Optional[float] = None
    lng_from: Optional[float] = None
    lat_to: Optional[float] = None
    lng_to: Optional[float] = None
    
    # Distance et durée
    distance_km: Optional[float] = None
    duration_min: Optional[int] = None
    
    # Direction
    from_iut: bool
    
    # Infos du trajet
    departure: datetime
    max_seats: int
    price: Decimal
    status: str
    creation_time: datetime
    
    # Info du conducteur (optionnel, pour l'affichage enrichi)
    driver: Optional[UserOut] = None
    
    class Config:
        from_attributes = True

class RideSearchParams(BaseModel):
    """Paramètres de recherche de trajets"""
    # Adresse de recherche (là où le passager veut partir/arriver)
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    # Direction souhaitée
    from_iut: Optional[bool] = None  # None = les deux directions
    
    # Filtres temporels
    date: Optional[date] = None
    time: Optional[time] = None  # L'heure souhaitée (une plage ±30min sera appliquée)
    
    # Pagination
    skip: int = 0
    limit: int = 20

class RideSearchResult(RideOut):
    """Résultat de recherche avec distance par rapport au point de recherche"""
    # Distance entre le point de recherche et le point de départ/arrivée du trajet
    distance_from_search: Optional[float] = None  # en km
    
    class Config:
        from_attributes = True

# --- RESERVATION ---
class ReservationBase(BaseModel):
    seats_booked: int

class ReservationCreate(ReservationBase):
    ride_id: int

class ReservationOut(ReservationBase):
    reservation_id: int
    status: str
    reservation_date: datetime
    ride_id: int
    passenger_id: int
    
    # Infos du trajet associé (optionnel)
    ride: Optional[RideOut] = None

    class Config:
        from_attributes = True

# --- AUTH ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- GOOGLE MAPS ---
class AddressAutocompleteResult(BaseModel):
    """Résultat de l'autocomplétion d'adresse"""
    address: str
    lat: float
    lng: float
    place_id: Optional[str] = None