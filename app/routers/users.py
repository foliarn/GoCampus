from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import schemas, deps, crud
from app.database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: schemas.UserOut = Depends(deps.get_current_user)):
    """Get current user information"""
    return current_user

@router.put("/me", response_model=schemas.UserOut)
def update_user_profile(
    user_update: schemas.UserUpdate, # <--- REMPLACEZ UserCreate PAR UserUpdate
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile information"""
    
    # Vérifier que l'email n'est pas déjà utilisé par un autre utilisateur
    if user_update.email != current_user.email:
        existing_user = crud.get_user_by_email(db, email=user_update.email)
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Cet email est déjà utilisé par un autre compte"
            )
    
    # Mettre à jour l'utilisateur
    updated_user = crud.update_user(db, current_user.user_id, user_update)
    
    if not updated_user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur non trouvé"
        )
    
    return updated_user

@router.get("/{user_id}/info", response_model=schemas.UserOut)
def get_user_info(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get public user information including rating"""
    user = crud.get_user_by_id(db, user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Utilisateur non trouvé"
        )

    # Calculate average rating and count for drivers
    average_rating = crud.calculate_driver_average_rating(db, driver_id=user_id)
    review_count = crud.get_driver_review_count(db, driver_id=user_id)

    # Create response with rating info
    user_dict = {
        "user_id": user.user_id,
        "name": user.name,
        "surname": user.surname,
        "email": user.email,
        "phone_number": user.phone_number,
        "address": user.address,
        "role": user.role,
        "average_rating": average_rating,
        "review_count": review_count
    }

    return user_dict