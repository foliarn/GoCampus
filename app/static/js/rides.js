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
                 // Formatage de la date et de l'heure
                 const dateObj = new Date(ride.departure);
                 const date = dateObj.toLocaleDateString('fr-FR', {weekday: 'short', day:'numeric', month:'short'});
                 const time = dateObj.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});

                 // Détermination du texte de direction
                 const destinationText = ride.from_iut ? `Vers ${ride.address_to}` : `Vers IUT Amiens`;
                 const departText = ride.from_iut ? "Départ IUT Amiens" : ride.address_from;

                 // Driver info
                 const driverName = ride.driver ? `${ride.driver.name} ${ride.driver.surname}` : 'Conducteur';

                 return `
                    <article class="trip-card" onclick="window.location.href='/rechercher'">
                        <span class="price-badge">${parseFloat(ride.price).toFixed(2)} €</span>

                        <div class="trip-card-body">
                            <div class="trip-time">${time}</div>

                            <div class="trip-route">
                                <span class="trip-from">${departText}</span>
                                <div class="trip-to">
                                    <span>➔</span> ${destinationText}
                                </div>
                            </div>

                            <div class="trip-date">📅 ${date}</div>

                            <div class="trip-driver">
                                <span class="driver-label">Conducteur:</span>
                                <span class="driver-name-link" onclick="event.stopPropagation(); showUserInfo(${ride.driver_id})">${driverName}</span>
                            </div>
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
            `<span class="passenger-badge" onclick="showUserInfo(${r.passenger.user_id})">${r.passenger.name} ${r.passenger.surname}</span>`
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
                            <span class="passenger-name-link" onclick="showUserInfo(${req.passenger.user_id})">${req.passenger.name} ${req.passenger.surname}</span>
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

        // Check for existing reviews for each reservation
        const reservationsWithReviewStatus = await Promise.all(
            reservations.map(async (res) => {
                const hasReview = await checkReviewExists(res.reservation_id);
                return { ...res, hasReview };
            })
        );

        container.innerHTML = reservationsWithReviewStatus.map(res => {
            const statusMap = {
                'waiting': {t:'En attente', c:'status-waiting'},
                'confirmed': {t:'Confirmé', c:'status-confirmed'},
                'canceled': {t:'Annulé', c:'status-canceled'},
                'finished': {t:'Terminé', c:'status-finished'}
            };
            const st = statusMap[res.status] || {t:res.status, c:''};
            const date = new Date(res.ride.departure).toLocaleDateString('fr-FR');
            const time = new Date(res.ride.departure).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

            // Check if ride is in the past
            const isPast = new Date(res.ride.departure) < new Date();

            // Show review button if: ride is past, reservation is confirmed, and no review exists
            const canReview = isPast && res.status === 'confirmed' && !res.hasReview;

            return `
                <div class="reservation-card">
                    <div class="card-header">
                        <span class="date">${date} à ${time}</span>
                        <span class="status-badge ${st.c}">${st.t}</span>
                    </div>
                    <div class="card-body">
                        <div class="ride-info">
                            <div><strong>De:</strong> ${res.ride.address_from}</div>
                            <div><strong>Vers:</strong> ${res.ride.address_to}</div>
                            <div><strong>Places réservées:</strong> ${res.seats_booked}</div>
                            <div>
                                <strong>Conducteur:</strong>
                                <span class="driver-name-link" onclick="showUserInfo(${res.ride.driver_id})">${res.ride.driver.name} ${res.ride.driver.surname}</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            ${res.status === 'waiting' && !isPast ? `<button onclick="cancelMyReservation(${res.reservation_id})" class="btn-cancel">Annuler</button>` : ''}
                            ${canReview ? `<button onclick="openReviewModal(${res.reservation_id}, '${res.ride.driver.name} ${res.ride.driver.surname}')" class="btn-review">Laisser un avis</button>` : ''}
                            ${res.hasReview ? `<span class="review-status">✓ Avis laissé</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="error-msg">Erreur lors du chargement des réservations.</div>';
    }
}

async function checkReviewExists(reservationId) {
    try {
        const response = await fetch(`/reviews/reservation/${reservationId}`);
        return response.ok; // Returns true if review exists (200), false if not (404)
    } catch (e) {
        return false;
    }
}

window.cancelMyReservation = async function(id) {
    if(confirm("Annuler ?")) {
        await fetchWithAuth(`/reservations/${id}/cancel`, {method:'POST'});
        loadMyReservations('reservations-container');
    }
}

// ============================================
// REVIEW MODAL & FUNCTIONALITY
// ============================================

let currentReservationId = null;
let selectedRating = 0;

window.openReviewModal = function(reservationId, driverName) {
    currentReservationId = reservationId;
    selectedRating = 0;

    // Set driver name
    document.getElementById('driverNameDisplay').textContent = driverName;

    // Reset form
    document.getElementById('reviewComment').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('ratingValue').textContent = '0/5';

    // Reset stars
    document.querySelectorAll('.star').forEach(star => {
        star.classList.remove('selected');
    });

    // Hide messages
    document.getElementById('reviewError').style.display = 'none';
    document.getElementById('reviewSuccess').style.display = 'none';

    // Show modal
    const modal = document.getElementById('reviewModal');
    modal.classList.add('show');
    modal.style.display = 'flex';
}

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);

    currentReservationId = null;
    selectedRating = 0;
}

// Star rating functionality
document.addEventListener('DOMContentLoaded', function() {
    const stars = document.querySelectorAll('.star');
    const ratingValue = document.getElementById('ratingValue');
    const commentTextarea = document.getElementById('reviewComment');
    const charCount = document.getElementById('charCount');

    // Star hover effect
    stars.forEach(star => {
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating, true);
        });

        star.addEventListener('click', function() {
            selectedRating = parseInt(this.getAttribute('data-rating'));
            selectStars(selectedRating);
            if (ratingValue) {
                ratingValue.textContent = `${selectedRating}/5`;
            }
        });
    });

    // Reset stars on mouse leave
    const starRating = document.getElementById('starRating');
    if (starRating) {
        starRating.addEventListener('mouseleave', function() {
            selectStars(selectedRating);
        });
    }

    // Character count for comment
    if (commentTextarea && charCount) {
        commentTextarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }

    // Close modal on outside click
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeReviewModal();
            }
        });
    }
});

function highlightStars(rating, hover = false) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            if (hover) {
                star.classList.add('hovered');
            }
        } else {
            if (hover) {
                star.classList.remove('hovered');
            }
        }
    });
}

function selectStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        star.classList.remove('hovered');
        if (starRating <= rating) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

window.submitReview = async function() {
    const errorDiv = document.getElementById('reviewError');
    const successDiv = document.getElementById('reviewSuccess');
    const submitBtn = document.getElementById('submitReviewBtn');

    // Hide previous messages
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    // Validate rating
    if (selectedRating === 0) {
        errorDiv.textContent = 'Veuillez sélectionner une note.';
        errorDiv.style.display = 'block';
        return;
    }

    // Get comment
    const comment = document.getElementById('reviewComment').value.trim();

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    try {
        const response = await fetchWithAuth('/reviews/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reservation_id: currentReservationId,
                rating: selectedRating,
                comment: comment || null
            })
        });

        if (response.ok) {
            successDiv.textContent = 'Votre avis a été enregistré avec succès !';
            successDiv.style.display = 'block';

            // Close modal after 2 seconds and reload reservations
            setTimeout(() => {
                closeReviewModal();
                if (document.getElementById('reservations-container')) {
                    loadMyReservations('reservations-container');
                }
            }, 2000);
        } else {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Une erreur est survenue.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer l\'avis';
        }
    } catch (e) {
        console.error(e);
        errorDiv.textContent = 'Erreur de connexion au serveur.';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer l\'avis';
    }
}

// ============================================
// USER INFO MODAL
// ============================================

window.showUserInfo = async function(userId) {
    const modal = document.getElementById('userInfoModal');
    const content = document.getElementById('userInfoContent');

    // Show modal with loading state
    content.innerHTML = '<div class="loading-spinner">Chargement...</div>';
    modal.classList.add('show');

    try {
        const response = await fetch(`/users/${userId}/info`);

        if (!response.ok) {
            throw new Error('Utilisateur non trouvé');
        }

        const user = await response.json();

        // Render user info
        const initial = user.name.charAt(0).toUpperCase();
        const fullName = `${user.name} ${user.surname}`;

        // Rating display
        let ratingHtml = '';
        if (user.average_rating && user.review_count > 0) {
            const fullStars = Math.floor(user.average_rating);
            const hasHalfStar = user.average_rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

            const starsHtml =
                '★'.repeat(fullStars) +
                (hasHalfStar ? '⯨' : '') +
                '☆'.repeat(emptyStars);

            ratingHtml = `
                <div class="user-rating-display">
                    <div class="rating-stars" style="color: #F59E0B;">${starsHtml}</div>
                    <div class="rating-stats">
                        ${user.average_rating.toFixed(1)}/5
                        <span class="rating-count">(${user.review_count} avis)</span>
                    </div>
                </div>
            `;
        } else {
            ratingHtml = `
                <div class="no-rating-message">
                    Aucun avis pour le moment
                </div>
            `;
        }

        content.innerHTML = `
            <div class="user-info-card">
                <div class="user-info-header">
                    <div class="user-avatar-large">${initial}</div>
                    <div class="user-info-name">${fullName}</div>
                    <div class="user-info-role">${user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
                    ${ratingHtml}
                </div>
                <div class="user-info-details">
                    <div class="info-row">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${user.email}</span>
                    </div>
                    ${user.phone_number ? `
                        <div class="info-row">
                            <span class="info-label">Téléphone:</span>
                            <span class="info-value">${user.phone_number}</span>
                        </div>
                    ` : ''}
                    ${user.address ? `
                        <div class="info-row">
                            <span class="info-label">Adresse:</span>
                            <span class="info-value">${user.address}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching user info:', error);
        content.innerHTML = `
            <div class="error-message">
                Impossible de charger les informations de l'utilisateur.
            </div>
        `;
    }
}

window.closeUserInfoModal = function() {
    const modal = document.getElementById('userInfoModal');
    modal.classList.remove('show');
}

// Close modal on outside click
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('userInfoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeUserInfoModal();
            }
        });
    }
});

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