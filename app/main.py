from fastapi import FastAPI, Depends
from app.routers import auth, vehicles, rides, reservations
from app import deps, schemas

app = FastAPI(title="GoCampus API")

app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(rides.router)
app.include_router(reservations.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API GoCampus !"}

# Users/me route
@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: schemas.UserOut = Depends(deps.get_current_user)):
    return current_user