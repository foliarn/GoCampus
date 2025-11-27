from sqlalchemy import Column, Integer, String, Date, Time, DECIMAL, TIMESTAMP, CheckConstraint, ForeignKey
from sqlalchemy.orm import relationship
from app.database import db

class User(db):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True) 
    name = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    password = Column(String(255), nullable=False) #haché
    phone_number = Column(String(20))
    address = Column(String(255))
    role = Column(String(20), default='normal', nullable=False)

    # Constraints
    __table_args__ = (
        CheckConstraint(role.in_(['normal', 'admin']), name='chk_role'),
    )

    # Relationships
    vehicles = relationship("Vehicle", back_populates="owner")
    rides_driven = relationship("Ride", back_populates="driver")
    reservations_faites = relationship("Reservation", back_populates="passenger")
