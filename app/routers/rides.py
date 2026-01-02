from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas, deps
from app.database import get_db

router = APIRouter(
    prefix="/api/rides",
    tags=["Trajets"]
)

@router.get("/", response_model=List[schemas.RideOut])
def get_rides(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """Récupère la liste des trajets actifs"""
    return crud.get_rides(db, skip=skip, limit=limit)

@router.get("/{ride_id}", response_model=schemas.RideOut)
def get_ride(ride_id: int, db: Session = Depends(get_db)):
    """Récupère un trajet par son ID"""
    ride = crud.get_ride_by_id(db, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    return ride

@router.post("/", response_model=schemas.RideOut)
def create_ride(
    ride: schemas.RideCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Crée un nouveau trajet (authentification requise)"""
    return crud.create_ride(db, ride, current_user.user_id)

@router.get("/user/me", response_model=List[schemas.RideOut])
def get_my_rides(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Récupère les trajets de l'utilisateur connecté"""
    return crud.get_user_rides(db, current_user.user_id)