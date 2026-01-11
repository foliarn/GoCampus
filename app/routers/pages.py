from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter(
    tags=["Pages"]
)

templates = Jinja2Templates(directory="app/templates")

# Page d'accueil
@router.get("/")
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Connexion
@router.get("/connexion")
def connexion(request: Request):
    return templates.TemplateResponse("connexion.html", {"request": request})

# Inscription
@router.get("/inscription")
def inscription(request: Request):
    return templates.TemplateResponse("inscription.html", {"request": request})

# Rechercher un trajet
@router.get("/rechercher")
def rechercher(request: Request):
    return templates.TemplateResponse("rechercher.html", {"request": request})

# Proposer un trajet
@router.get("/proposer")
def proposer(request: Request):
    return templates.TemplateResponse("proposer.html", {"request": request})

# Mes réservations
@router.get("/reservations")
def reservations(request: Request):
    return templates.TemplateResponse("reservations.html", {"request": request})

# Mes annonces
@router.get("/annonces")
def annonces(request: Request):
    return templates.TemplateResponse("annonces.html", {"request": request})

# Dashboard Admin
@router.get("/admin/dashboard")
def admin_dashboard(request: Request):
    return templates.TemplateResponse("admin_dashboard.html", {"request": request})

# Mon profil
@router.get("/profil")
def profil(request: Request):
    return templates.TemplateResponse("profil.html", {"request": request})

# Test Google Maps API
@router.get("/test-maps")
def test_maps(request: Request):
    return templates.TemplateResponse("test_maps.html", {"request": request})