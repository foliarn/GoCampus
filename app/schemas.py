from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date, time
from typing import Optional, List
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

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    user_id: int
    average_rating: Optional[float] = None
    review_count: Optional[int] = None

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

# --- HELPER FOR RESERVATIONS IN RIDE ---
class UserBasic(BaseModel):
    """Minimal user info for display in reservation lists"""
    user_id: int
    name: str
    surname: str
    
    class Config:
        from_attributes = True

class ReservationInRide(BaseModel):
    """Schema for a reservation nested inside a ride (for driver view)"""
    reservation_id: int
    seats_booked: int
    status: str
    passenger: UserBasic

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
    address: str
    lat: float
    lng: float
    from_iut: bool = False
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
    
    # Info du conducteur (optionnel)
    driver: Optional[UserOut] = None
    
    # Liste des réservations (Pour la vue conducteur)
    reservations: List[ReservationInRide] = []
    
    class Config:
        from_attributes = True

class RideSearchParams(BaseModel):
    """Paramètres de recherche de trajets"""
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    from_iut: Optional[bool] = None
    date: Optional[date] = None
    time: Optional[time] = None
    skip: int = 0
    limit: int = 20

class RideSearchResult(RideOut):
    """Résultat de recherche avec distance par rapport au point de recherche"""
    distance_from_search: Optional[float] = None
    
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
    
    # Infos du trajet associé
    ride: Optional[RideOut] = None

    class Config:
        from_attributes = True

# --- REVIEW ---
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None

class ReviewCreate(ReviewBase):
    reservation_id: int

class ReviewOut(ReviewBase):
    review_id: int
    reservation_id: int
    reviewer_id: int
    driver_id: int
    created_at: datetime

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
    address: str
    lat: float
    lng: float
    place_id: Optional[str] = None