from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps

router = APIRouter(
    prefix="/rides",
    tags=["Rides"]
)

@router.post("/", response_model=schemas.RideOut, status_code=status.HTTP_201_CREATED)
def create_ride(
    ride: schemas.RideCreate,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Publish a new ride.
    Automatically verifies that the vehicle belongs to the authenticated user.
    """
    db_ride = crud.create_ride(db=db, ride=ride, driver_id=current_user.user_id)
    
    if db_ride is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Vehicle not found or does not belong to you."
        )
    return db_ride

@router.get("/", response_model=List[schemas.RideOut])
def list_rides(
    skip: int = 0,
    limit: int = 20,
    departure: Optional[str] = Query(None, description="Filter by departure"),
    arrival: Optional[str] = Query(None, description="Filter by arrival"),
    ride_date: Optional[date] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db)
):
    """
    Public search for rides (no authentication required).
    """
    rides = crud.get_rides(
        db=db, 
        skip=skip, 
        limit=limit, 
        departure_address=departure, 
        arrival_address=arrival, 
        departure_date=ride_date
    )
    return rides

@router.delete("/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_ride(
    ride_id: int,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Cancel a ride. Only the driver who created it can cancel it.
    """
    ride = crud.get_ride_by_id(db, ride_id=ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    # Check permission
    if ride.driver_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You are not authorized to cancel this ride"
        )
        
    crud.cancel_ride(db, ride)
    return