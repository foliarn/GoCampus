from typing import List, Optional
from datetime import date, datetime, time
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app import crud, schemas, database, deps
from app.config import settings
from app.services import get_google_maps_service, GoogleMapsError

router = APIRouter(
    prefix="/rides",
    tags=["Rides"]
)


@router.post("/", response_model=schemas.RideOut, status_code=status.HTTP_201_CREATED)
async def create_ride(
    ride: schemas.RideCreate,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Publie un nouveau trajet.
    
    - L'une des deux adresses est forcément l'IUT d'Amiens
    - from_iut=False : le trajet VA vers l'IUT (adresse fournie = départ)
    - from_iut=True : le trajet PART de l'IUT (adresse fournie = arrivée)
    """
    # Coordonnées de l'IUT (fixes)
    iut_lat = settings.IUT_AMIENS_LAT
    iut_lng = settings.IUT_AMIENS_LNG
    iut_address = settings.IUT_AMIENS_ADDRESS
    
    # Déterminer les adresses et coordonnées selon la direction
    if ride.from_iut:
        # Départ depuis l'IUT → l'adresse fournie est l'arrivée
        address_from = iut_address
        lat_from = iut_lat
        lng_from = iut_lng
        address_to = ride.address
        lat_to = ride.lat
        lng_to = ride.lng
    else:
        # Arrivée à l'IUT → l'adresse fournie est le départ
        address_from = ride.address
        lat_from = ride.lat
        lng_from = ride.lng
        address_to = iut_address
        lat_to = iut_lat
        lng_to = iut_lng
    
    # Calculer la distance et la durée via Google Maps
    distance_km = None
    duration_min = None
    
    try:
        google_maps = get_google_maps_service()
        route = await google_maps.calculate_route(lat_from, lng_from, lat_to, lng_to)
        if route:
            distance_km = route.distance_km
            duration_min = route.duration_min
    except GoogleMapsError as e:
        # Log l'erreur mais continue la création sans les infos de route
        print(f"Erreur Google Maps: {e}")
    except Exception as e:
        print(f"Erreur inattendue Google Maps: {e}")
    
    # Créer le trajet
    db_ride = crud.create_ride(
        db=db,
        ride=ride,
        driver_id=current_user.user_id,
        address_from=address_from,
        address_to=address_to,
        lat_from=lat_from,
        lng_from=lng_from,
        lat_to=lat_to,
        lng_to=lng_to,
        distance_km=distance_km,
        duration_min=duration_min
    )
    
    if db_ride is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Véhicule non trouvé ou ne vous appartient pas."
        )
    
    return db_ride


@router.get("/", response_model=List[schemas.RideOut])
def list_rides(
    skip: int = 0,
    limit: int = 20,
    departure: Optional[str] = Query(None, description="Filtrer par adresse de départ"),
    arrival: Optional[str] = Query(None, description="Filtrer par adresse d'arrivée"),
    ride_date: Optional[date] = Query(None, description="Filtrer par date (YYYY-MM-DD)"),
    from_iut: Optional[bool] = Query(None, description="Direction: true=depuis l'IUT, false=vers l'IUT"),
    db: Session = Depends(database.get_db)
):
    """
    Recherche publique de trajets (sans authentification requise).
    Filtres basiques par texte et date.
    """
    rides = crud.get_rides(
        db=db, 
        skip=skip, 
        limit=limit, 
        departure_address=departure, 
        arrival_address=arrival, 
        departure_date=ride_date,
        from_iut=from_iut
    )
    return rides


@router.get("/search", response_model=List[schemas.RideSearchResult])
def search_rides_by_proximity(
    lat: float = Query(..., description="Latitude du point de recherche"),
    lng: float = Query(..., description="Longitude du point de recherche"),
    from_iut: Optional[bool] = Query(None, description="Direction: true=depuis l'IUT, false=vers l'IUT"),
    ride_date: Optional[date] = Query(None, description="Date souhaitée (YYYY-MM-DD)"),
    ride_time: Optional[str] = Query(None, description="Heure souhaitée (HH:MM)"),
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(database.get_db)
):
    """
    Recherche de trajets par proximité géographique.
    
    - Trouve les trajets dont le point de départ/arrivée est à moins de 5km du point de recherche
    - Si une heure est fournie, filtre les trajets dans une plage de ±30min
    """
    # Parser l'heure si fournie
    search_time = None
    if ride_time and ride_date:
        try:
            parsed_time = datetime.strptime(ride_time, "%H:%M").time()
            search_time = datetime.combine(ride_date, parsed_time)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format d'heure invalide. Utilisez HH:MM"
            )
    
    results = crud.search_rides_by_proximity(
        db=db,
        search_lat=lat,
        search_lng=lng,
        from_iut=from_iut,
        search_date=ride_date,
        search_time=search_time,
        radius_km=settings.PROXIMITY_RADIUS_KM,
        time_window_minutes=settings.TIME_WINDOW_MINUTES,
        skip=skip,
        limit=limit
    )
    
    # Convertir en schema de réponse
    response = []
    for result in results:
        ride = result["ride"]
        ride_data = schemas.RideSearchResult.model_validate(ride)
        ride_data.distance_from_search = round(result["distance_from_search"], 2)
        response.append(ride_data)
    
    return response


@router.get("/user/me", response_model=List[schemas.RideOut])
def get_my_rides(
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Récupère les trajets proposés par l'utilisateur connecté.
    """
    return crud.get_user_rides(db=db, user_id=current_user.user_id)


@router.get("/{ride_id}", response_model=schemas.RideOut)
def get_ride(
    ride_id: int,
    db: Session = Depends(database.get_db)
):
    """
    Récupère les détails d'un trajet spécifique.
    """
    ride = crud.get_ride_by_id(db, ride_id=ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
    return ride


@router.delete("/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_ride(
    ride_id: int,
    current_user: schemas.UserOut = Depends(deps.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Annule un trajet. Seul le conducteur qui l'a créé peut l'annuler.
    """
    ride = crud.get_ride_by_id(db, ride_id=ride_id)
    if not ride:
        raise HTTPException(status_code=404, detail="Trajet non trouvé")
        
    if ride.driver_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Vous n'êtes pas autorisé à annuler ce trajet"
        )
        
    crud.cancel_ride(db, ride)
    return