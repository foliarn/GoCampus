from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas, deps
from app.database import get_db

router = APIRouter(
    prefix="/api/reservations",
    tags=["Réservations"]
)

@router.get("/me", response_model=List[schemas.ReservationOut])
def get_my_reservations(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Récupère les réservations de l'utilisateur connecté"""
    return crud.get_user_reservations(db, current_user.user_id)

@router.post("/", response_model=schemas.ReservationOut)
def create_reservation(
    reservation: schemas.ReservationCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Crée une nouvelle réservation"""
    # Vérifier que le trajet existe
    ride = crud.get_ride_by_id(db, reservation.ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    
    # Vérifier que l'utilisateur n'est pas le conducteur
    if ride.driver_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas réserver votre propre trajet")
    
    return crud.create_reservation(db, reservation, current_user.user_id)