from fastapi import FastAPI, Depends
from app.routers import auth
from app import deps, schemas

app = FastAPI(title="GoCampus API")

# Inclusion du routeur d'authentification
app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API GoCampus !"}

# Test route
@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: schemas.UserOut = Depends(deps.get_current_user)):
    return current_user