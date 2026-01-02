from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps

router = APIRouter(
    prefix="/reservations",
    tags=["Reservations"]
)

@router.post("/", response_model=schemas.ReservationOut, status_code=status.HTTP_201_CREATED)
def book_ride(
    reservation: schemas.ReservationCreate,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Book a seat on a ride.
    Checks if there are enough seats available before confirming.
    """
    # 1. Prevent user from booking their own ride
    ride = crud.get_ride_by_id(db, ride_id=reservation.ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    if ride.driver_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="You cannot book your own ride.")

    # 2. Attempt to create reservation
    db_reservation = crud.create_reservation(db=db, reservation=reservation, passenger_id=current_user.user_id)
    
    if db_reservation is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Not enough seats available for this ride."
        )
        
    return db_reservation

@router.get("/me", response_model=List[schemas.ReservationOut])
def get_my_reservations(
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    List all reservations made by the current user.
    """
    return crud.get_reservations_by_passenger(db=db, passenger_id=current_user.user_id)

@router.post("/{reservation_id}/cancel", response_model=schemas.ReservationOut)
def cancel_reservation(
    reservation_id: int,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Cancel a reservation. 
    Seats are released (logic handled in future availability checks by ignoring 'canceled' status).
    """
    reservation = crud.get_reservation_by_id(db, reservation_id=reservation_id)
    
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    # Security check: Only the passenger can cancel their own reservation
    if reservation.passenger_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this reservation")
        
    if reservation.status == 'canceled':
        raise HTTPException(status_code=400, detail="Reservation is already canceled")

    return crud.cancel_reservation(db=db, reservation=reservation)