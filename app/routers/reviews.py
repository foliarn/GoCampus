from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps

router = APIRouter(
    prefix="/reviews",
    tags=["Reviews"]
)

@router.post("/", response_model=schemas.ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    review: schemas.ReviewCreate,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Créer un avis pour un conducteur après un trajet.

    Conditions :
    - L'utilisateur doit être le passager de la réservation
    - La réservation doit être confirmée
    - Le trajet doit être passé
    - Un seul avis par réservation
    - Note entre 1 et 5 étoiles
    """
    # Valider la note
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La note doit être entre 1 et 5 étoiles."
        )

    # Valider la longueur du commentaire
    if review.comment and len(review.comment) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le commentaire ne peut pas dépasser 500 caractères."
        )

    # Créer l'avis
    db_review = crud.create_review(
        db=db,
        review=review,
        reviewer_id=current_user.user_id
    )

    if db_review is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de créer cet avis. Vérifiez que la réservation existe, "
                   "est confirmée, que le trajet est passé et qu'aucun avis n'existe déjà."
        )

    return db_review

@router.get("/driver/{driver_id}", response_model=List[schemas.ReviewOut])
def get_driver_reviews(
    driver_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    """
    Récupère tous les avis pour un conducteur donné.
    """
    reviews = crud.get_reviews_for_driver(db, driver_id=driver_id, skip=skip, limit=limit)
    return reviews

@router.get("/reservation/{reservation_id}", response_model=schemas.ReviewOut)
def get_review_by_reservation(
    reservation_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Vérifie si un avis existe pour une réservation donnée.
    """
    review = crud.get_review_by_reservation(db, reservation_id=reservation_id)

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun avis trouvé pour cette réservation."
        )

    return review
