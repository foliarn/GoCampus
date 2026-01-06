from fastapi import FastAPI, Depends, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.routers import auth, pages, rides, reservations, vehicles
from app import deps, schemas
from app.config import settings

app = FastAPI(title="GoCampus API")

# Mount static directory
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Jinja config  
templates = Jinja2Templates(directory="app/templates")

# Routers
app.include_router(auth.router)
app.include_router(pages.router)
app.include_router(rides.router)
app.include_router(reservations.router)
app.include_router(vehicles.router)

# Test route API - Get current user
@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: schemas.UserOut = Depends(deps.get_current_user)):
    return current_user

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "GoCampus API is running"}

# Endpoint pour récupérer la clé API Google Maps (côté client)
@app.get("/api/config/maps")
def get_maps_config():
    """
    Retourne la clé API Google Maps pour le frontend.
    Note: Dans un environnement de production, utilisez des restrictions sur la clé.
    """
    return {"api_key": settings.GOOGLE_MAPS_API_KEY}