from sqlalchemy import Column, Integer, String, TIMESTAMP, CheckConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.database import db

class Reservation(db): 
    __tablename__ = "reservations"
    
    reservation_id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey('rides.ride_id', ondelete='CASCADE'), nullable=False)
    passenger_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    seats_booked = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default='waiting')
    reservation_date = Column(TIMESTAMP, nullable=False)

    # Relationships
    # 1. Links to Ride.reservations
    ride = relationship("Ride", back_populates="reservations")
    
    # 2. Links to User.reservations_made
    passenger = relationship("User", back_populates="reservations_made") 

    __table_args__ = (
        CheckConstraint(seats_booked > 0, name='chk_seats_booked'),
        CheckConstraint(status.in_(['waiting', 'confirmed', 'canceled', 'finished']), name='chk_status_reservation'),
    )