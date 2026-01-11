from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from app import models, schemas
from app.services import calculate_distance_km
from app.config import settings
from typing import List, Optional
from datetime import date, datetime, timedelta

# === USER ===

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_password_hash(password: str) -> str:
    from app.utils import get_password_hash as hash_pwd
    return hash_pwd(password)

def create_user(db: Session, user: schemas.UserCreate):
    from app.utils import get_password_hash
    hashed_password = get_password_hash(user.password)
    
    db_user = models.User(
        name=user.name,
        surname=user.surname,
        email=user.email,   
        password=hashed_password, 
        phone_number=user.phone_number,
        address=user.address,
        role=user.role
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# === VEHICLE MANAGEMENT ===

def get_user_vehicles(db: Session, user_id: int):
    """Récupère les véhicules d'un utilisateur"""
    return db.query(models.Vehicle)\
        .filter(models.Vehicle.driver_id == user_id)\
        .all()

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate, driver_id: int):
    db_vehicle = models.Vehicle(
        driver_id=driver_id,
        license_plate=vehicle.license_plate,
        model=vehicle.model,
        color=vehicle.color,
        max_seats=vehicle.max_seats
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def get_vehicles_by_user(db: Session, driver_id: int) -> List[models.Vehicle]:
    """Return all vehicles owned by a specific user."""
    return db.query(models.Vehicle).filter(models.Vehicle.driver_id == driver_id).all()

def get_vehicle_by_id_and_owner(db: Session, vehicle_id: int, driver_id: int) -> Optional[models.Vehicle]:
    """Retrieve a specific vehicle only if it belongs to the given user."""
    return db.query(models.Vehicle).filter(
        models.Vehicle.vehicle_id == vehicle_id,
        models.Vehicle.driver_id == driver_id
    ).first()

def delete_vehicle(db: Session, vehicle: models.Vehicle):
    """Delete a specific vehicle."""
    db.delete(vehicle)
    db.commit()
    return {"message": "Vehicle successfully deleted"}

# === RIDES ===

def create_ride(
    db: Session, 
    ride: schemas.RideCreate, 
    driver_id: int,
    address_from: str,
    address_to: str,
    lat_from: float,
    lng_from: float,
    lat_to: float,
    lng_to: float,
    distance_km: Optional[float] = None,
    duration_min: Optional[int] = None
) -> Optional[models.Ride]:
    """
    Crée un nouveau trajet avec toutes les informations de géolocalisation.
    """
    # Vérifier que le véhicule appartient au conducteur
    vehicle = get_vehicle_by_id_and_owner(db, vehicle_id=ride.vehicle_id, driver_id=driver_id)
    
    if not vehicle:
        return None
    
    db_ride = models.Ride(
        driver_id=driver_id,
        vehicle_id=ride.vehicle_id,
        address_from=address_from,
        address_to=address_to,
        lat_from=lat_from,
        lng_from=lng_from,
        lat_to=lat_to,
        lng_to=lng_to,
        distance_km=distance_km,
        duration_min=duration_min,
        from_iut=ride.from_iut,
        departure=ride.departure,
        max_seats=ride.max_seats,
        price=ride.price,
        status="active",
        creation_time=datetime.now()
    )
    
    db.add(db_ride)
    db.commit()
    db.refresh(db_ride)
    return db_ride

def get_rides(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    departure_address: Optional[str] = None, 
    arrival_address: Optional[str] = None, 
    departure_date: Optional[date] = None,
    from_iut: Optional[bool] = None
) -> List[models.Ride]:
    """
    Récupère les trajets actifs avec filtres optionnels.
    """
    query = db.query(models.Ride).filter(models.Ride.status == 'active')
    
    # Filtre par direction
    if from_iut is not None:
        query = query.filter(models.Ride.from_iut == from_iut)
    
    # Filtres textuels (recherche approximative)
    if departure_address:
        query = query.filter(models.Ride.address_from.ilike(f"%{departure_address}%"))
    if arrival_address:
        query = query.filter(models.Ride.address_to.ilike(f"%{arrival_address}%"))
    
    # Filtre par date
    if departure_date:
        start_of_day = datetime.combine(departure_date, datetime.min.time())
        end_of_day = datetime.combine(departure_date, datetime.max.time())
        query = query.filter(
            and_(
                models.Ride.departure >= start_of_day,
                models.Ride.departure <= end_of_day
            )
        )
        
    return query.order_by(models.Ride.departure.asc()).offset(skip).limit(limit).all()

def search_rides_by_proximity(
    db: Session,
    search_lat: float,
    search_lng: float,
    from_iut: Optional[bool] = None,
    search_date: Optional[date] = None,
    search_time: Optional[datetime] = None,
    radius_km: float = 5.0,
    time_window_minutes: int = 30,
    skip: int = 0,
    limit: int = 20
) -> List[dict]:
    """
    Recherche des trajets par proximité géographique.
    
    Args:
        search_lat, search_lng: Coordonnées du point de recherche
        from_iut: Direction souhaitée (None = les deux)
        search_date: Date souhaitée
        search_time: Heure souhaitée (une plage ±time_window_minutes sera appliquée)
        radius_km: Rayon de recherche en km
        time_window_minutes: Tolérance horaire en minutes
        
    Returns:
        Liste de dicts avec le trajet et la distance depuis le point de recherche
    """
    query = db.query(models.Ride).filter(models.Ride.status == 'active')
    
    # Filtre par direction
    if from_iut is not None:
        query = query.filter(models.Ride.from_iut == from_iut)
    
    # Filtre par date
    if search_date:
        start_of_day = datetime.combine(search_date, datetime.min.time())
        end_of_day = datetime.combine(search_date, datetime.max.time())
        query = query.filter(
            and_(
                models.Ride.departure >= start_of_day,
                models.Ride.departure <= end_of_day
            )
        )
    
    # Filtre par plage horaire
    if search_time:
        time_min = search_time - timedelta(minutes=time_window_minutes)
        time_max = search_time + timedelta(minutes=time_window_minutes)
        query = query.filter(
            and_(
                models.Ride.departure >= time_min,
                models.Ride.departure <= time_max
            )
        )
    
    # Récupérer les trajets qui ont des coordonnées
    query = query.filter(
        models.Ride.lat_from.isnot(None),
        models.Ride.lng_from.isnot(None)
    )
    
    rides = query.order_by(models.Ride.departure.asc()).all()
    
    # Filtrer par proximité et calculer la distance
    results = []
    for ride in rides:
        # Si from_iut=True, le passager cherche un trajet QUI PART de l'IUT
        # → on compare la position de recherche avec l'ARRIVÉE du trajet (là où il veut aller)
        # Si from_iut=False, le passager cherche un trajet QUI VA à l'IUT
        # → on compare la position de recherche avec le DÉPART du trajet (là où il veut être pris)
        
        if ride.from_iut:
            # Trajet depuis l'IUT → comparer avec l'arrivée
            compare_lat = ride.lat_to
            compare_lng = ride.lng_to
        else:
            # Trajet vers l'IUT → comparer avec le départ
            compare_lat = ride.lat_from
            compare_lng = ride.lng_from
        
        if compare_lat is None or compare_lng is None:
            continue
            
        distance = calculate_distance_km(search_lat, search_lng, compare_lat, compare_lng)
        
        if distance <= radius_km:
            results.append({
                "ride": ride,
                "distance_from_search": distance
            })
    
    # Trier par distance
    results.sort(key=lambda x: x["distance_from_search"])
    
    # Pagination
    return results[skip:skip + limit]

def get_ride_by_id(db: Session, ride_id: int):
    """Récupère un trajet par son ID."""
    return db.query(models.Ride).filter(models.Ride.ride_id == ride_id).first()

def get_user_rides(db: Session, user_id: int):
    """
    Récupère les trajets proposés par un utilisateur,
    avec chargement optimisé des réservations et des passagers pour l'affichage conducteur.
    """
    return db.query(models.Ride)\
        .options(
            joinedload(models.Ride.reservations)
            .joinedload(models.Reservation.passenger)
        )\
        .filter(models.Ride.driver_id == user_id)\
        .order_by(models.Ride.departure.desc())\
        .all()

def cancel_ride(db: Session, ride: models.Ride):
    """Annule un trajet."""
    ride.status = "canceled"
    db.commit()
    db.refresh(ride)
    return ride

# === RESERVATIONS ===

def get_remaining_seats(db: Session, ride_id: int) -> int:
    """Calcule le nombre de places disponibles pour un trajet."""
    ride = db.query(models.Ride).filter(models.Ride.ride_id == ride_id).first()
    if not ride:
        return 0
    
    seats_taken = db.query(func.sum(models.Reservation.seats_booked))\
        .filter(
            models.Reservation.ride_id == ride_id,
            models.Reservation.status.in_(['waiting', 'confirmed'])
        ).scalar() or 0
        
    return ride.max_seats - seats_taken

def create_reservation(db: Session, reservation: schemas.ReservationCreate, passenger_id: int):
    """Crée une réservation en mode waiting si des places sont disponibles."""
    remaining_seats = get_remaining_seats(db, ride_id=reservation.ride_id)
    
    if remaining_seats < reservation.seats_booked:
        return None
    
    db_reservation = models.Reservation(
        ride_id=reservation.ride_id,
        passenger_id=passenger_id,
        seats_booked=reservation.seats_booked,
        status='waiting',
        reservation_date=datetime.now()
    )
    
    db.add(db_reservation)
    db.commit()
    db.refresh(db_reservation)
    return db_reservation

def get_reservations_by_passenger(db: Session, passenger_id: int):
    """Retourne toutes les réservations d'un passager."""
    return db.query(models.Reservation)\
             .filter(models.Reservation.passenger_id == passenger_id)\
             .order_by(models.Reservation.reservation_date.desc())\
             .all()

def get_reservation_by_id(db: Session, reservation_id: int):
    return db.query(models.Reservation).filter(models.Reservation.reservation_id == reservation_id).first()

def get_reservation_by_passenger_and_ride(db: Session, passenger_id: int, ride_id: int):
    """Vérifie si un passager a déjà réservé un trajet spécifique."""
    return db.query(models.Reservation).filter(
        models.Reservation.passenger_id == passenger_id,
        models.Reservation.ride_id == ride_id
    ).first()

def cancel_reservation(db: Session, reservation: models.Reservation):
    """Annule une réservation."""
    reservation.status = 'canceled'
    db.commit()
    db.refresh(reservation)
    return reservation

def update_reservation_status(db: Session, reservation: models.Reservation, new_status: str):
    reservation.status = new_status
    db.commit()
    db.refresh(reservation)
    return reservation