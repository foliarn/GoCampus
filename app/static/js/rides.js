// ============================================
// CHARGEMENT DES TRAJETS (PUBLIC)
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

        // Pour la page d'accueil, format simple
        if(window.location.pathname === '/') {
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
        } else {
            // Autres pages (si nécessaire)
            container.innerHTML = rides.map(ride => createRideCard(ride)).join('');
        }

    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<p class="no-results-msg">Erreur lors du chargement des trajets.</p>';
    }
}

function createRideCard(ride) {
    // Cette fonction sert à l'affichage générique des trajets pour les passagers
    const departure = new Date(ride.departure);
    const date = departure.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const timeStart = departure.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const initial = 'U'; // Placeholder

    return `
        <article class="trip-card">
            <span class="price-badge">${parseFloat(ride.price).toFixed(2)}€</span>
            <div class="card-top">
                <div class="avatar">
                    <span style="color:white;">${initial}</span>
                </div>
                <div class="driver-details">
                    <span class="driver-name">Conducteur</span>
                </div>
            </div>
            <div class="card-body">
                <div class="timeline">
                    <div class="timeline-item">
                        <span class="time">${timeStart}</span>
                        <span class="place">${ride.address_from}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                 <a href="#" class="btn-reserve-full" data-ride-id="${ride.ride_id}">RÉSERVER</a>
            </div>
        </article>
    `;
}


// ============================================
// MES ANNONCES (VUE CONDUCTEUR)
// ============================================

async function loadMyRides(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/rides/user/me');
        if (!response.ok) throw new Error('Erreur chargement');
        const rides = await response.json();

        if (rides.length === 0) {
            container.innerHTML = '<p class="no-results-msg">Vous n\'avez pas encore proposé de trajet.</p>';
            return;
        }

        container.innerHTML = rides.map(ride => createMyAdCard(ride)).join('');
        
        attachAdActionListeners();

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="no-results-msg">Erreur de chargement.</p>';
    }
}

function createMyAdCard(ride) {
    const dateObj = new Date(ride.departure);
    const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Statut
    let badgeClass = 'badge-active';
    let statusText = 'Actif';
    if(ride.status === 'canceled') { badgeClass = 'badge-finished'; statusText = 'Annulé'; }
    else if(ride.status === 'finished') { badgeClass = 'badge-finished'; statusText = 'Terminé'; }
    else if(ride.status === 'full') { badgeClass = 'badge-full'; statusText = 'Complet'; }

    // Titre dynamique (Destination principale)
    const title = ride.from_iut ? `Vers ${ride.address_to}` : `Vers IUT Amiens`;
    const subTitle = ride.from_iut ? "Départ IUT" : `Départ ${ride.address_from}`;

    // --- LOGIQUE PLACES & PASSAGERS ---
    const reservations = ride.reservations || [];
    
    // Calculer les places prises (En attente + Confirmé)
    const seatsTaken = reservations
        .filter(r => ['waiting', 'confirmed'].includes(r.status))
        .reduce((sum, r) => sum + r.seats_booked, 0);
    
    const remainingSeats = Math.max(0, ride.max_seats - seatsTaken);

    // Liste des passagers acceptés
    const confirmedPassengers = reservations.filter(r => r.status === 'confirmed');
    let passengersHtml = '';
    
    if (confirmedPassengers.length > 0) {
        // Liste des noms
        const names = confirmedPassengers.map(r => 
            `<span style="background:#ECFDF5; color:#065F46; padding:2px 8px; border-radius:12px; font-size:0.85rem;">${r.passenger.name} ${r.passenger.surname}</span>`
        ).join(' ');
        
        passengersHtml = `
            <div style="padding: 0 20px 15px 20px; border-top: 1px solid #F3F4F6; margin-top:10px; padding-top:15px;">
                <div style="font-size: 0.8rem; text-transform:uppercase; color:#6B7280; font-weight:700; margin-bottom:8px;">Passagers acceptés</div>
                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                    ${names}
                </div>
            </div>
        `;
    } else {
        passengersHtml = `
            <div style="padding: 0 20px 15px 20px; font-size: 0.85rem; color: #9CA3AF; font-style: italic; border-top: 1px solid #F3F4F6; margin-top:10px; padding-top:15px;">
                Aucun passager accepté pour le moment.
            </div>
        `;
    }

    // Filtrer les demandes en attente
    const pendingRequests = reservations.filter(r => r.status === 'waiting');
    
    // Générer le bloc demandes
    let requestsHtml = '';
    if (pendingRequests.length > 0) {
        requestsHtml = `
            <div class="annonce-requests">
                <div class="requests-title">${pendingRequests.length} demande(s) en attente</div>
                ${pendingRequests.map(req => `
                    <div class="request-row">
                        <div class="user">
                            <div class="avatar">${req.passenger.name.charAt(0)}</div>
                            <span>${req.passenger.name} ${req.passenger.surname}</span>
                        </div>
                        <div class="actions">
                            <button class="accept" onclick="handleReservationAction(${req.reservation_id}, 'confirm')" title="Accepter">✓</button>
                            <button class="refuse" onclick="handleReservationAction(${req.reservation_id}, 'refuse')" title="Refuser">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Bouton supprimer (si actif)
    let footerHtml = '';
    if(ride.status === 'active') {
        footerHtml = `
            <div class="annonce-footer">
                <button class="btn-delete" onclick="deleteRide(${ride.ride_id})">Supprimer ce trajet</button>
            </div>
        `;
    }

    // Style dynamique pour le compteur de places
    const seatColor = remainingSeats === 0 ? '#EF4444' : '#059669'; // Rouge si 0, Vert sinon
    // Gestion du pluriel pour l'affichage
    const seatLabel = remainingSeats > 1 ? 'places restantes' : 'place restante';

    return `
        <article class="annonce-card">
            <div class="annonce-header">
                <div class="annonce-header-content">
                    <h3>${title}</h3>
                    <p>${subTitle}</p>
                </div>
                <span class="badge ${badgeClass}">${statusText}</span>
            </div>
            
            <div class="annonce-info">
                <p>
                    <strong>📅 ${capitalize(dateStr)}</strong> à ${timeStr}
                </p>
                <p>
                    💰 ${parseFloat(ride.price).toFixed(2)}€ / pers • <span style="color:${seatColor}; font-weight:700;">💺 ${remainingSeats} ${seatLabel}</span>
                </p>
            </div>

            ${passengersHtml}
            ${requestsHtml}
            ${footerHtml}
        </article>
    `;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================
// ACTIONS CONDUCTEUR
// ============================================

window.handleReservationAction = async function(reservationId, action) {
    // Petit délai UX pour que l'utilisateur voit qu'il a cliqué
    if(!confirm(action === 'confirm' ? "Accepter ce passager ?" : "Refuser ce passager ?")) return;

    try {
        const response = await fetchWithAuth(`/reservations/${reservationId}/${action}`, {
            method: 'PUT'
        });

        if(response.ok) {
            // Recharger la liste pour mettre à jour l'affichage
            loadMyRides('annonces-container');
        } else {
            const err = await response.json();
            alert("Erreur: " + err.detail);
        }
    } catch(e) {
        console.error(e);
        alert("Erreur réseau");
    }
};

window.deleteRide = async function(rideId) {
    if(!confirm("Voulez-vous vraiment supprimer ce trajet ? Cette action annulera toutes les réservations.")) return;

    try {
        const response = await fetchWithAuth(`/rides/${rideId}`, {
            method: 'DELETE'
        });

        if(response.ok || response.status === 204) {
            loadMyRides('annonces-container');
        } else {
            alert("Impossible de supprimer le trajet.");
        }
    } catch(e) {
        alert("Erreur réseau");
    }
};

function attachAdActionListeners() {
    // Les onclick sont définis directement dans le HTML généré pour simplifier la portée des variables
}

// ============================================
// RÉSERVATIONS PASSAGER (COPIE MODIFIÉE)
// ============================================
// (Le code existant pour loadMyReservations reste fonctionnel)

async function loadMyReservations(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetchWithAuth('/reservations/me');
        if (!response.ok) throw new Error('Erreur');
        const reservations = await response.json();

        if (reservations.length === 0) {
            container.innerHTML = '<div class="no-results-msg">Aucune réservation.</div>';
            return;
        }

        container.innerHTML = reservations.map(res => {
            // Logique d'affichage simplifiée pour l'exemple
            const statusMap = {
                'waiting': {t:'En attente', c:'status-waiting'},
                'confirmed': {t:'Confirmé', c:'status-confirmed'},
                'canceled': {t:'Annulé', c:'status-canceled'}
            };
            const st = statusMap[res.status] || {t:res.status, c:''};
            const date = new Date(res.ride.departure).toLocaleDateString('fr-FR');
            
            return `
                <div class="reservation-card">
                    <div class="card-header">
                        <span class="date">${date}</span>
                        <span class="status-badge ${st.c}">${st.t}</span>
                    </div>
                    <div class="card-body">
                        <div>Trajet vers ${res.ride.address_to}</div>
                        ${res.status === 'waiting' ? `<button onclick="cancelMyReservation(${res.reservation_id})" class="btn-cancel">Annuler</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
    }
}

window.cancelMyReservation = async function(id) {
    if(confirm("Annuler ?")) {
        await fetchWithAuth(`/reservations/${id}/cancel`, {method:'POST'});
        loadMyReservations('reservations-container');
    }
}

// Initialisation globale
window.loadRides = loadRides;
window.loadMyRides = loadMyRides;
window.loadMyReservations = loadMyReservations;

// Auto-init
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('rides-grid')) loadRides('rides-grid', 3);
    if (document.getElementById('reservations-container')) loadMyReservations('reservations-container');
    if (document.getElementById('annonces-container')) loadMyRides('annonces-container');
});