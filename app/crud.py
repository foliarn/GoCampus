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