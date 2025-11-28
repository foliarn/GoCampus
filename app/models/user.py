from sqlalchemy import Column, Integer, String, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import db

class User(db):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True) 
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False) 
    phone_number = Column(String(20))
    address = Column(String(255))
    role = Column(String(20), default='normal', nullable=False)

    __table_args__ = (
        CheckConstraint(role.in_(['normal', 'admin']), name='chk_role'),
    )

    # Relationships
    # 1. Links to Vehicle.owner
    vehicles = relationship("Vehicle", back_populates="owner")
    
    # 2. Links to Ride.driver (This fixes your error)
    rides_driven = relationship("Ride", back_populates="driver")
    
    # 3. Links to Reservation.passenger
    reservations_made = relationship("Reservation", back_populates="passenger")
