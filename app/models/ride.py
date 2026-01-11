from sqlalchemy import Column, Integer, Float, Boolean,  String, DECIMAL, TIMESTAMP, CheckConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.database import db

class Ride(db): 
    __tablename__ = "rides"
    
    ride_id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    vehicle_id = Column(Integer, ForeignKey('vehicles.vehicle_id', ondelete='RESTRICT'))

    address_from = Column(String(255), nullable=False)
    address_to = Column(String(255), nullable=False)

    lat_from = Column(Float, nullable=True)
    lng_from = Column(Float, nullable=True)
    lat_to = Column(Float, nullable=True)
    lng_to = Column(Float, nullable=True)
    
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Integer, nullable=True)

    from_iut = Column(Boolean, nullable=False, default=False)

    departure = Column(TIMESTAMP, nullable=False)
    max_seats = Column(Integer, nullable=False)
    price = Column(DECIMAL(4, 2), nullable=False)
    status = Column(String(20), nullable=False, default='active')
    creation_time = Column(TIMESTAMP, nullable=False)

    __table_args__ = (
        CheckConstraint(max_seats > 0, name='chk_trajet_places'),
        CheckConstraint(price >= 0, name='chk_trajet_prix'),
        CheckConstraint(status.in_(['active', 'full', 'canceled', 'finished']), name='chk_ride_status'),
    )

    # Relationships
    # 1. Links to User.rides_driven
    driver = relationship("User", back_populates="rides_driven")
    
    # 2. Links to Vehicle.rides
    vehicle = relationship("Vehicle", back_populates="rides")
    
    # 3. Links to Reservation.ride
    reservations = relationship("Reservation", back_populates="ride")