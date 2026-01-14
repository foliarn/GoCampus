from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import db

class Review(db):
    __tablename__ = "reviews"

    review_id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(Integer, ForeignKey('reservations.reservation_id', ondelete='CASCADE'), nullable=False)
    reviewer_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    driver_id = Column(Integer, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False)

    # Relationships
    reservation = relationship("Reservation", backref="review")
    reviewer = relationship("User", foreign_keys=[reviewer_id], backref="reviews_written")
    driver = relationship("User", foreign_keys=[driver_id], backref="reviews_received")

    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='chk_rating_range'),
        UniqueConstraint('reservation_id', name='uq_one_review_per_reservation'),
    )
