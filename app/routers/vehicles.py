from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas, deps
from app.database import get_db

router = APIRouter(
    prefix="/api/vehicles",
    tags=["Véhicules"]
)

@router.get("/me", response_model=List[schemas.VehicleOut])
def get_my_vehicles(
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Récupère les véhicules de l'utilisateur connecté"""
    return crud.get_user_vehicles(db, current_user.user_id)

@router.post("/", response_model=schemas.VehicleOut)
def create_vehicle(
    vehicle: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_user)
):
    """Ajoute un véhicule pour l'utilisateur connecté"""
    return crud.create_vehicle(db, vehicle, current_user.user_id)