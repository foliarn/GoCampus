from pydantic import BaseModel, EmailStr
from datetime import date, time, datetime
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
    password: str # 

class UserOut(UserBase):
    user_id: int
    # On ne renvoie JAMAIS le mot de passe

    class Config:
        from_attributes = True

# --- VEHICULE ---
class VehiculeBase(BaseModel):
    license_plate: str
    model: str
    color: str
    seats: int

class VehicleCreate(VehiculeBase):
    pass

class VehicleOut(VehiculeBase):
    vehicle_id: int
    driver_id: int

    class Config:
        from_attributes = True

# --- TRAJET ---
class RideBase(BaseModel):
    address_start: str
    address_arrival: str
    departure: datetime
    max_seats: int
    price: Decimal

class RideCreate(RideBase):
    vehicle_id: int # On doit savoir quelle voiture est utilisée

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