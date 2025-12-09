from sqlalchemy.orm import Session
from sqlalchemy import func
from app import models, schemas, utils
from typing import List, Optional
from datetime import date, datetime

# === USER ===

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = utils.get_password_hash(user.password)
    
    db_user = models.User(
        name=user.name,
        surname=user.surname,
        email=user.email,   
        password=hashed_password, 
        phone_number=user.phone_number,
        address=user.address,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# === VEHICLE ===

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate, driver_id: int):
    """Create a new vehicle associated with the given driver_id."""
    db_vehicle = models.Vehicle(
        driver_id=driver_id,
        license_plate=vehicle.license_plate,
        model=vehicle.model,
        color=vehicle.color,
        max_seats=vehicle.max_seats,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def get_vehicles_by_user(db: Session, driver_id: int) -> List[models.Vehicle]:
    """Return all vehicles owned by a specific user."""
    return db.query(models.Vehicle).filter(models.Vehicle.driver_id == driver_id).all()

def get_vehicle_by_id_and_owner(db: Session, vehicle_id: int, driver_id: int) -> Optional[models.Vehicle]:
    """Retrieve a specific vehicle only if it belongs to the given user."""
    return db.query(models.Vehicle).filter(
        models.Vehicle.vehicle_id == vehicle_id,
        models.Vehicle.driver_id == driver_id
    ).first()

def delete_vehicle(db: Session, vehicle: models.Vehicle):
    """Delete a specific vehicle."""
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle successfully deleted"}

 # === RIDES ===

def create_ride(db: Session, ride: schemas.RideCreate, driver_id: int):
    """
    Creates a new ride after verifying the vehicle belongs to the driver.
    """
    # Verification: Does the vehicle exist and belong to the driver?
    vehicle = get_vehicle_by_id_and_owner(db, vehicle_id=ride.vehicle_id, driver_id=driver_id)
    
    if not vehicle:
        return None  # Vehicle not found or not owned by user

    # Create the ride
    db_ride = models.Ride(
        driver_id=driver_id,
        vehicle_id=ride.vehicle_id,
        address_from=ride.address_from,
        address_to=ride.address_to,
        departure=ride.departure,
        max_seats=ride.max_seats,
        price=ride.price,
        status="active",
        creation_time=datetime.now()
    )
    
    db.add(db_ride)
    db.commit()
    db.refresh(db_ride)
    return db_ride

def get_rides(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    departure_address: Optional[str] = None, 
    arrival_address: Optional[str] = None, 
    departure_date: Optional[date] = None
):
    """
    Retrieves active rides with optional filters.
    """
    query = db.query(models.Ride).filter(models.Ride.status == 'active')
    
    # Case-insensitive filters (ilike)
    if departure_address:
        query = query.filter(models.Ride.address_from.ilike(f"%{departure_address}%"))
    if arrival_address:
        query = query.filter(models.Ride.address_to.ilike(f"%{arrival_address}%"))
    if departure_date:
        # Filter rides departing on or after the specified date
        query = query.filter(models.Ride.departure >= departure_date)
        
    return query.order_by(models.Ride.departure.asc()).offset(skip).limit(limit).all()

def get_ride_by_id(db: Session, ride_id: int):
    """
    Retrieves a ride by its ID.
    """
    return db.query(models.Ride).filter(models.Ride.ride_id == ride_id).first()

def cancel_ride(db: Session, ride: models.Ride):
    """
    Deletes a ride from the database.
    """
    ride.status = "canceled"
    db.commit()
    db.refresh(ride)
    return ride

# === RESERVATIONS ===

def get_remaining_seats(db: Session, ride_id: int) -> int:
    """
    Calculates the number of available seats for a specific ride.
    """
    # Get the ride to know max_seats
    ride = db.query(models.Ride).filter(models.Ride.ride_id == ride_id).first()
    if not ride:
        return 0
    
    # Sum all seats booked in 'waiting' or 'confirmed' status
    seats_taken = db.query(func.sum(models.Reservation.seats_booked))\
        .filter(
            models.Reservation.ride_id == ride_id,
            models.Reservation.status.in_(['waiting', 'confirmed'])
        ).scalar() or 0 # .scalar() returns None if no reservations, so we use 'or 0'
        
    return ride.max_seats - seats_taken

def create_reservation(db: Session, reservation: schemas.ReservationCreate, passenger_id: int):
    """
    Creates a reservation ONLY if there are enough seats.
    """
    # Check availability
    remaining_seats = get_remaining_seats(db, ride_id=reservation.ride_id)
    
    if remaining_seats < reservation.seats_booked:
        return None # Not enough seats
    
    # Create reservation
    # We set status to 'confirmed' immediately if seats are available
    db_reservation = models.Reservation(
        ride_id=reservation.ride_id,
        passenger_id=passenger_id,
        seats_booked=reservation.seats_booked,
        status='confirmed',
        reservation_date=datetime.now()
    )
    
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

def get_reservations_by_passenger(db: Session, passenger_id: int):
    """
    Returns all reservations made by a specific user.
    """
    return db.query(models.Reservation)\
             .filter(models.Reservation.passenger_id == passenger_id)\
             .order_by(models.Reservation.reservation_date.desc())\
             .all()

def get_reservation_by_id(db: Session, reservation_id: int):
    return db.query(models.Reservation).filter(models.Reservation.reservation_id == reservation_id).first()

def cancel_reservation(db: Session, reservation: models.Reservation):
    """
    Updates status to 'canceled' to release seats.
    """
    reservation.status = 'canceled'
    db.commit()
    db.refresh(reservation)
    return reservation