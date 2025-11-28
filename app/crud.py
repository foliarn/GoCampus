from sqlalchemy.orm import Session
from app import models, schemas, utils
from typing import List, Optional

# === USER ===

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