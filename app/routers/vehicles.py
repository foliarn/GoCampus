from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app import crud, schemas, deps
from app.database import get_db

router = APIRouter(
    prefix="/vehicles",
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

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: int,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a vehicle, ensuring it belongs to the authenticated user.
    """
    # 1. Check if the vehicle exists AND belongs to the current user
    vehicle = crud.get_vehicle_by_id_and_owner(db, vehicle_id=vehicle_id, driver_id=current_user.user_id)
    
    if not vehicle:
        # We return 404/403 to hide whether the vehicle exists or not for security
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Vehicle not found or you don't have permission to delete it"
        )
        
    # 2. Delete the vehicle
    crud.delete_vehicle(db, vehicle=vehicle)
    
    # 3. Return 204 No Content
    return