from pydantic import BaseModel, EmailStr
from datetime import datetime
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

# --- RIDE (Trajet) ---
class RideBase(BaseModel):
    address_from: str
    address_to: str
    departure: datetime
    max_seats: int
    price: Decimal

class RideCreate(RideBase):
    vehicle_id: int 

class RideOut(RideBase):
    ride_id: int
    driver_id: int
    status: str
    creation_time: datetime
    
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

    class Config:
        from_attributes = True

# --- AUTH ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None