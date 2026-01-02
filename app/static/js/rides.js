// ============================================
// CHARGEMENT DES TRAJETS
// ============================================

async function loadRides(containerId, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`/api/rides/?limit=${limit}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement des trajets');
        }

        const rides = await response.json();

        if (rides.length === 0) {
            container.innerHTML = '<p class="no-results-msg">Aucun trajet disponible pour le moment.</p>';
            return;
        }

        container.innerHTML = rides.map(ride => createRideCard(ride)).join('');

    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="no-results-msg">Erreur lors du chargement des trajets.</p>';
    }
}

function createRideCard(ride) {
    const departure = new Date(ride.departure);
    const date = departure.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const timeStart = departure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Calculer l'heure d'arrivée estimée (+ 1h par défaut)
    const arrival = new Date(departure.getTime() + 60 * 60 * 1000);
    const timeEnd = arrival.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Première lettre du nom du conducteur (à améliorer avec les vraies données)
    const initial = 'U';

    return `
        <article class="trip-card">
            <span class="price-badge">${parseFloat(ride.price).toFixed(2)}€</span>
            <div class="card-top">
                <div class="avatar">
                    <span style="color:white;">${initial}</span>
                </div>
                <div class="driver-details">
                    <span class="driver-name">Conducteur</span>
                    <div class="rating">
                        <img src="/static/images/icon-star.svg" alt="Star">
                        <span>(--)</span>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="timeline">
                    <div class="timeline-item">
                        <span class="time">${timeStart}</span>
                        <span class="place">${ride.address_from}</span>
                    </div>
                    <div class="timeline-item">
                        <span class="time">${timeEnd}</span>
                        <span class="place">${ride.address_to}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="trip-info-row">
                    <span style="display:flex; align-items:center; gap:5px;">
                        <img src="/static/images/icon-calendar.svg" alt="Cal" class="icon-img"> ${date}
                    </span>
                    <span class="seats-info">${ride.max_seats} place(s) <img src="/static/images/icon-chair.svg" alt="Chair" class="icon-img"></span>
                </div>
                <a href="#" class="btn-reserve-full" data-ride-id="${ride.ride_id}">RÉSERVER</a>
            </div>
        </article>
    `;
}

// ============================================
// RÉSERVATION D'UN TRAJET
// ============================================

document.addEventListener('click', async function(e) {
    if (e.target.classList.contains('btn-reserve-full')) {
        e.preventDefault();
        
        if (!isLoggedIn()) {
            alert('Vous devez être connecté pour réserver un trajet.');
            window.location.href = '/connexion';
            return;
        }

        const rideId = e.target.dataset.rideId;
        if (!rideId) return;

        try {
            const response = await fetchWithAuth('/api/reservations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ride_id: parseInt(rideId),
                    seats_booked: 1
                })
            });

            if (response.ok) {
                alert('Réservation effectuée avec succès !');
                window.location.href = '/reservations';
            } else {
                const error = await response.json();
                alert('Erreur: ' + (error.detail || 'Impossible de réserver ce trajet'));
            }
        } catch (error) {
            alert('Erreur de connexion au serveur');
        }
    }
});

// ============================================
// CHARGEMENT DES RÉSERVATIONS DE L'UTILISATEUR
// ============================================

async function loadMyReservations(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/api/reservations/me');
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement');
        }

        const reservations = await response.json();

        if (reservations.length === 0) {
            container.innerHTML = `
                <div class="content-card">
                    <img src="/static/images/logo.svg" alt="Vide" class="empty-icon">
                    <h2 class="empty-message">Aucune réservation</h2>
                </div>
            `;
            return;
        }

        container.innerHTML = reservations.map(res => createReservationCard(res)).join('');

    } catch (error) {
        console.error('Erreur:', error);
    }
}

function createReservationCard(reservation) {
    const statusLabels = {
        'waiting': 'En attente',
        'confirmed': 'Confirmé',
        'canceled': 'Annulé',
        'finished': 'Terminé'
    };

    const statusClasses = {
        'waiting': 'status-pending',
        'confirmed': 'status-confirmed',
        'canceled': 'status-canceled',
        'finished': 'status-finished'
    };

    const date = new Date(reservation.reservation_date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return `
        <div class="reservation-card">
            <div class="card-header">
                <span class="date">${date}</span>
                <span class="status ${statusClasses[reservation.status] || ''}">${statusLabels[reservation.status] || reservation.status}</span>
            </div>
            <div class="card-body">
                <p>Places réservées: ${reservation.seats_booked}</p>
            </div>
        </div>
    `;
}

// ============================================
// CHARGEMENT DES ANNONCES DE L'UTILISATEUR
// ============================================

async function loadMyRides(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/api/rides/user/me');
        
        if (!response.ok) {
            throw new Error('Erreur lors du chargement');
        }

        const rides = await response.json();

        if (rides.length === 0) {
            container.innerHTML = '<p class="no-results-msg">Vous n\'avez pas encore proposé de trajet.</p>';
            return;
        }

        container.innerHTML = rides.map(ride => createMyRideCard(ride)).join('');

    } catch (error) {
        console.error('Erreur:', error);
    }
}

function createMyRideCard(ride) {
    const departure = new Date(ride.departure);
    const date = departure.toLocaleDateString('fr-FR');
    const time = departure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return `
        <div class="annonce-card">
            <div class="annonce-header">
                <div>
                    <h3>${ride.address_to}</h3>
                    <p>Départ : ${ride.address_from} à ${time}</p>
                    <span>Le ${date}</span>
                </div>
                <span class="badge">${ride.max_seats} place(s)</span>
            </div>
            <div class="annonce-info">
                <strong>${parseFloat(ride.price).toFixed(2)}€</strong> / Pers.
            </div>
        </div>
    `;
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Page d'accueil - charger les derniers trajets
    if (document.getElementById('rides-grid')) {
        loadRides('rides-grid', 4);
    }

    // Page réservations
    if (document.getElementById('reservations-container')) {
        loadMyReservations('reservations-container');
    }

    // Page annonces
    if (document.getElementById('annonces-container')) {
        loadMyRides('annonces-container');
    }
});