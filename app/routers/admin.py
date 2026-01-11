from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(deps.get_current_admin)] # Sécurité globale pour ce router
)

# === USERS ===

@router.get("/users", response_model=List[schemas.UserOut])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    return crud.get_all_users(db, skip=skip, limit=limit)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db)
):
    user = crud.delete_user_force(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return

# === RIDES ===

@router.get("/rides", response_model=List[schemas.RideOut])
def get_all_rides(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    return crud.get_all_rides_admin(db, skip=skip, limit=limit)

@router.delete("/rides/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ride(
    ride_id: int,
    db: Session = Depends(database.get_db)
):
    ride = crud.delete_ride_force(db, ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    return

# === RESERVATIONS ===

@router.get("/reservations", response_model=List[schemas.ReservationOut])
def get_all_reservations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    return crud.get_all_reservations_admin(db, skip=skip, limit=limit)

@router.delete("/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: int,
    db: Session = Depends(database.get_db)
):
    res = crud.delete_reservation_force(db, reservation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    return