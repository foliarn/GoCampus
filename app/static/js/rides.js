// ============================================
// CHARGEMENT DES TRAJETS
// ============================================

async function loadRides(containerId, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`/rides/?limit=${limit}`);
        
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
            const response = await fetchWithAuth('/reservations/', {
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
// GESTION DES TRAJETS ET RÉSERVATIONS
// ============================================

// --- CHARGEMENT DES RÉSERVATIONS PASSAGER ---

async function loadMyReservations(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/reservations/me');
        
        if (!response.ok) throw new Error('Erreur lors du chargement');

        const reservations = await response.json();

        if (reservations.length === 0) {
            container.innerHTML = `
                <div class="no-results-msg">
                    <h3 style="margin-bottom:10px; color:#1F2937;">Aucune réservation</h3>
                    <p style="color:#6B7280;">Vous n'avez pas encore réservé de trajet.</p>
                    <a href="/rechercher" style="display:inline-block; margin-top:15px; color:#0072CE; font-weight:600; text-decoration:underline;">Rechercher un trajet</a>
                </div>
            `;
            return;
        }

        container.innerHTML = reservations.map(res => createReservationCard(res)).join('');
        
        attachCancelListeners();

    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="no-results-msg" style="color:#EF4444;">Impossible de charger vos réservations.</div>';
    }
}

function createReservationCard(reservation) {
    const ride = reservation.ride || {}; 
    
    // Dates
    const dateObj = new Date(ride.departure || reservation.reservation_date);
    const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Arrivée estimée
    const durationMin = ride.duration_min || 60;
    const arrivalDate = new Date(dateObj.getTime() + durationMin * 60000);
    const arrivalTimeStr = arrivalDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Statut
    const statusConfig = {
        'waiting': { label: 'En attente', class: 'status-waiting' },
        'confirmed': { label: 'Confirmé', class: 'status-confirmed' },
        'canceled': { label: 'Annulé', class: 'status-canceled' },
        'finished': { label: 'Terminé', class: 'status-finished' }
    };
    const statusInfo = statusConfig[reservation.status] || { label: reservation.status, class: '' };

    // Conducteur
    const driverName = ride.driver ? `${ride.driver.name} ${ride.driver.surname ? ride.driver.surname[0] + '.' : ''}` : 'Conducteur';
    const driverInitial = ride.driver && ride.driver.name ? ride.driver.name[0] : 'C';

    // Prix
    const price = ride.price !== undefined ? parseFloat(ride.price).toFixed(2) : '--';

    // Bouton Annuler
    let actionBtn = '';
    if (reservation.status === 'waiting' || reservation.status === 'confirmed') {
        actionBtn = `
            <div class="card-footer">
                <button class="btn-cancel" data-id="${reservation.reservation_id}">Annuler la réservation</button>
            </div>
        `;
    }

    return `
        <article class="reservation-card">
            <div class="card-header">
                <span class="date">
                    📅 ${capitalizeFirstLetter(dateStr)}
                </span>
                <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
            </div>
            
            <div class="card-body">
                <div class="timeline">
                    <div class="timeline-item start">
                        <div class="point-dot"></div>
                        <div class="timeline-content">
                            <span class="time">${timeStr}</span>
                            <span class="place">${ride.address_from || 'Départ inconnu'}</span>
                        </div>
                    </div>
                    <div class="timeline-item end">
                        <div class="point-dot"></div>
                        <div class="timeline-content">
                            <span class="time">${arrivalTimeStr}</span>
                            <span class="place">${ride.address_to || 'IUT Amiens'}</span>
                        </div>
                    </div>
                </div>

                <div class="card-info-side">
                    <div class="price-tag">${price} €</div>
                    <div class="driver-info">
                        <div class="avatar-mini">${driverInitial}</div>
                        <span>${driverName}</span>
                    </div>
                </div>
            </div>

            ${actionBtn}
        </article>
    `;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function attachCancelListeners() {
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const resId = e.target.dataset.id;
            if(!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;

            try {
                const res = await fetchWithAuth(`/reservations/${resId}/cancel`, { method: 'POST' });
                if(res.ok) {
                    alert("Réservation annulée.");
                    loadMyReservations('reservations-container'); 
                } else {
                    alert("Impossible d'annuler.");
                }
            } catch(err) {
                console.error(err);
                alert("Erreur réseau.");
            }
        });
    });
}

// --- CHARGEMENT DES OFFRES (ACCUEIL) ---
async function loadRides(containerId, limit = 4) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`/rides/?limit=${limit}`);
        if (!response.ok) throw new Error('Erreur chargement');
        const rides = await response.json();

        if (rides.length === 0) {
            container.innerHTML = '<p class="no-results-msg">Aucun trajet disponible.</p>';
            return;
        }
        // Utilisation d'un format simple pour l'accueil
        container.innerHTML = rides.map(ride => {
             const date = new Date(ride.departure).toLocaleDateString('fr-FR', {day:'numeric', month:'short'});
             const time = new Date(ride.departure).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
             return `
                <article class="trip-card">
                    <span class="price-badge">${parseFloat(ride.price).toFixed(2)}€</span>
                    <div class="card-body" style="padding:15px;">
                        <div class="time" style="font-size:1.1rem; font-weight:700;">${time}</div>
                        <div class="place" style="font-size:0.9rem;">${ride.address_from}</div>
                        <div style="margin-top:5px; font-size:0.8rem; color:#6B7280;">Vers ${ride.address_to}</div>
                        <div style="margin-top:10px; font-weight:600; color:#0072CE;">${date}</div>
                    </div>
                </article>
             `;
        }).join('');

    } catch (error) {
        console.error(error);
    }
}

// --- CHARGEMENT MES ANNONCES (CONDUCTEUR) ---
async function loadMyRides(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/rides/user/me');
        if (!response.ok) throw new Error('Erreur chargement');
        const rides = await response.json();

        if (rides.length === 0) {
            container.innerHTML = '<p class="no-results-msg">Vous n\'avez pas proposé de trajet.</p>';
            return;
        }

        container.innerHTML = rides.map(ride => {
            const date = new Date(ride.departure).toLocaleDateString('fr-FR');
            const status = ride.status === 'active' ? 'Actif' : 'Terminé';
            return `
                <div class="reservation-card" style="margin-bottom:20px;">
                    <div class="card-header">
                        <span class="date">${date}</span>
                        <span class="status-badge status-confirmed">${status}</span>
                    </div>
                    <div class="card-body">
                        <div>
                            <strong>${ride.address_from}</strong> → ${ride.address_to}<br>
                            <small>${ride.max_seats} places - ${parseFloat(ride.price).toFixed(2)}€</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error(error);
    }
}

// Initialisation globale si nécessaire
window.loadRides = loadRides;
window.loadMyReservations = loadMyReservations;
window.loadMyRides = loadMyRides;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Page d'accueil - charger les derniers trajets
    if (document.getElementById('rides-grid')) {
        loadRides('rides-grid', 3);
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