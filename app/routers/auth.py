from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app import crud, schemas, utils
from app.config import settings
from app.database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Authentification"]
)

@router.post("/register", response_model=schemas.UserOut) 
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Creates a new user in the database
    """
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="This email has already been used.")
        
    return crud.create_user(db=db, user=user)

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Checks (username=email) and sends a JWT Token
    """
    user = crud.get_user_by_email(db, email=form_data.username)
    
    # 2. Checks if the user exists and if the password is correct
    if not user or not utils.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}