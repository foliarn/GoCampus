from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import db

class Vehicle(db):
    __tablename__ = "vehicles"

    vehicle_id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey('users.user_id'), nullable=False) 
    license_plate = Column(String(20), nullable=False, unique=True)
    max_seats = Column(Integer, nullable=False)
    color = Column(String(100))
    model = Column(String(100), nullable=False)

    # Relationships
    # 1. Links to User.vehicles
    owner = relationship("User", back_populates="vehicles")
    
    # 2. Links to Ride.vehicle
    rides = relationship("Ride", back_populates="vehicle")
