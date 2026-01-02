from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)

@router.post("/", response_model=schemas.VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    vehicle: schemas.VehicleCreate,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Adds a new vehicle and links it to the currently authenticated user.
    """
    # Use user_id from the authenticated user
    return crud.create_vehicle(db=db, vehicle=vehicle, driver_id=current_user.user_id)

@router.get("/", response_model=List[schemas.VehicleOut])
def list_vehicles(
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Retrieves all vehicles owned by the currently authenticated user.
    """
    vehicles = crud.get_vehicles_by_user(db=db, driver_id=current_user.user_id)
    return vehicles

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: int,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
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