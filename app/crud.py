from sqlalchemy.orm import Session
from app import models, schemas, utils
from datetime import datetime

# === USER MANAGEMENT ===

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = utils.get_password_hash(user.password[:72])
    
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

# === RIDE MANAGEMENT ===

def get_rides(db: Session, skip: int = 0, limit: int = 10):
    """Récupère les trajets actifs avec leurs relations"""
    return db.query(models.Ride)\
        .filter(models.Ride.status == 'active')\
        .order_by(models.Ride.departure.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

def get_ride_by_id(db: Session, ride_id: int):
    return db.query(models.Ride).filter(models.Ride.ride_id == ride_id).first()

def create_ride(db: Session, ride: schemas.RideCreate, driver_id: int):
    from datetime import datetime
    db_ride = models.Ride(
        driver_id=driver_id,
        vehicle_id=ride.vehicle_id,
        address_from=ride.address_from,
        address_to=ride.address_to,
        departure=ride.departure,
        max_seats=ride.max_seats,
        price=ride.price,
        status='active',
        creation_time=datetime.utcnow()
    )
    db.add(db_ride)
    db.commit()
    db.refresh(db_ride)
    return db_ride

def get_user_rides(db: Session, user_id: int):
    """Récupère les trajets proposés par un utilisateur"""
    return db.query(models.Ride)\
        .filter(models.Ride.driver_id == user_id)\
        .order_by(models.Ride.departure.desc())\
        .all()

# === RESERVATION MANAGEMENT ===

def get_user_reservations(db: Session, user_id: int):
    """Récupère les réservations d'un utilisateur"""
    return db.query(models.Reservation)\
        .filter(models.Reservation.passenger_id == user_id)\
        .order_by(models.Reservation.reservation_date.desc())\
        .all()

def create_reservation(db: Session, reservation: schemas.ReservationCreate, user_id: int):
    from datetime import datetime
    db_reservation = models.Reservation(
        ride_id=reservation.ride_id,
        passenger_id=user_id,
        seats_booked=reservation.seats_booked,
        status='waiting',
        reservation_date=datetime.utcnow()
    )
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation