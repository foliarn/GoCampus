// ============================================
// PAGE RECHERCHER UN TRAJET
// Utilise la nouvelle API PlaceAutocompleteElement (Mars 2025+)
// ============================================

let selectedSearchPlace = null;
let currentSearchDirection = false; // false = vers l'IUT, true = depuis l'IUT
let googleMapsLoaded = false;
let placeAutocomplete = null;

// ============================================
// INITIALISATION AU CHARGEMENT DE LA PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initDateTimeDefaults();
    initSearchForm();
});

function initDateTimeDefaults() {
    // Définir la date minimum (aujourd'hui)
    const dateInput = document.getElementById('searchDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
    
    // Définir l'heure par défaut (heure actuelle arrondie)
    const timeInput = document.getElementById('searchTime');
    if (timeInput) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = now.getMinutes() < 30 ? '00' : '30';
        timeInput.value = `${hours}:${minutes}`;
    }
}

// ============================================
// INITIALISATION GOOGLE PLACES AUTOCOMPLETE (NOUVELLE API)
// ============================================

function initSearchAutocomplete() {
    googleMapsLoaded = true;
    
    const container = document.getElementById('autocompleteContainer');
    if (!container) return;
    
    try {
        // Créer le nouvel élément PlaceAutocompleteElement
        placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
            componentRestrictions: { country: 'fr' },
        });
        
        // Vider le container et ajouter l'élément
        container.innerHTML = '';
        container.appendChild(placeAutocomplete);
        
        // Écouter la sélection d'une adresse
        placeAutocomplete.addEventListener('gmp-placeselect', async (event) => {
            const place = event.place;
            
            // Récupérer les détails du lieu
            await place.fetchFields({ 
                fields: ['displayName', 'formattedAddress', 'location'] 
            });
            
            onSearchPlaceSelected(place);
        });
        
        console.log('PlaceAutocompleteElement initialisé avec succès');
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de PlaceAutocompleteElement:', error);
        googleMapsLoaded = false;
        showApiError();
    }
}

function onSearchPlaceSelected(place) {
    if (!place || !place.location) {
        console.error("Aucune géométrie pour cette adresse");
        selectedSearchPlace = null;
        return;
    }
    
    selectedSearchPlace = {
        address: place.formattedAddress || place.displayName,
        lat: place.location.lat(),
        lng: place.location.lng()
    };
    
    // Mettre à jour les champs cachés
    document.getElementById('searchLat').value = selectedSearchPlace.lat;
    document.getElementById('searchLng').value = selectedSearchPlace.lng;
    document.getElementById('searchAddressFormatted').value = selectedSearchPlace.address;
    
    console.log('Adresse sélectionnée:', selectedSearchPlace);
}

function showApiError() {
    const errorDiv = document.getElementById('apiError');
    if (errorDiv) {
        errorDiv.style.display = 'block';
    }
}

// ============================================
// TOGGLE DIRECTION
// ============================================

function setSearchDirection(fromIut) {
    currentSearchDirection = fromIut;
    document.getElementById('searchFromIut').value = fromIut;
    
    // Mettre à jour les boutons
    document.getElementById('toIutBtn').classList.toggle('active', !fromIut);
    document.getElementById('fromIutBtn').classList.toggle('active', fromIut);
    
    // Mettre à jour le label
    const addressLabel = document.getElementById('addressLabel');
    if (fromIut) {
        addressLabel.textContent = "Mon adresse d'arrivée";
    } else {
        addressLabel.textContent = "Mon adresse de départ";
    }
}

// ============================================
// FORMULAIRE DE RECHERCHE
// ============================================

function initSearchForm() {
    const searchForm = document.getElementById('searchForm');
    
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const lat = document.getElementById('searchLat').value;
            const lng = document.getElementById('searchLng').value;
            const searchDate = document.getElementById('searchDate').value;
            const searchTime = document.getElementById('searchTime').value;
            const fromIut = document.getElementById('searchFromIut').value === 'true';
            
            // Validation
            if (!googleMapsLoaded) {
                alert('Google Maps n\'est pas chargé. Vérifiez votre clé API dans le fichier .env');
                return;
            }
            
            if (!lat || !lng) {
                alert('Veuillez sélectionner une adresse dans la liste de suggestions.\n\nTapez votre adresse et cliquez sur une suggestion dans la liste déroulante.');
                return;
            }
            
            if (!searchDate || !searchTime) {
                alert('Veuillez sélectionner une date et une heure');
                return;
            }
            
            // Afficher le loader
            showLoading();
            
            // Afficher l'info de recherche
            updateSearchInfo(searchTime);
            
            // Lancer la recherche
            await searchRides(lat, lng, fromIut, searchDate, searchTime);
        });
    }
}

async function searchRides(lat, lng, fromIut, date, time) {
    try {
        const params = new URLSearchParams({
            lat: lat,
            lng: lng,
            from_iut: fromIut,
            ride_date: date,
            ride_time: time
        });
        
        const response = await fetch(`/rides/search?${params}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la recherche');
        }
        
        const rides = await response.json();
        displayResults(rides);
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Une erreur est survenue lors de la recherche. Veuillez réessayer.');
    }
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================

function showLoading() {
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Recherche des trajets en cours...</p>
        </div>
    `;
}

function showError(message) {
    const resultsArea = document.getElementById('resultsArea');
    resultsArea.innerHTML = `
        <div class="no-results">
            <h3>❌ Erreur</h3>
            <p>${message}</p>
        </div>
    `;
}

function updateSearchInfo(time) {
    const searchInfo = document.getElementById('searchInfo');
    const timeRange = document.getElementById('timeRange');
    
    // Calculer la plage horaire (±30 min)
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    
    const minTime = new Date(date.getTime() - 30 * 60 * 1000);
    const maxTime = new Date(date.getTime() + 30 * 60 * 1000);
    
    const formatTime = (d) => `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    
    timeRange.textContent = `${formatTime(minTime)} et ${formatTime(maxTime)}`;
    searchInfo.classList.add('visible');
}

function displayResults(rides) {
    const resultsArea = document.getElementById('resultsArea');
    
    if (rides.length === 0) {
        resultsArea.innerHTML = `
            <div class="no-results">
                <h3>😕 Aucun trajet trouvé</h3>
                <p>Aucun trajet ne correspond à vos critères dans un rayon de 5 km.</p>
                <p style="margin-top: 15px;">
                    <a href="/proposer" style="color: #0072CE; text-decoration: underline;">Proposer un trajet ?</a>
                </p>
            </div>
        `;
        return;
    }
    
    let html = `
        <p class="results-count"><strong>${rides.length}</strong> trajet(s) trouvé(s) près de votre adresse</p>
        <div class="results-grid">
    `;
    
    rides.forEach(ride => {
        html += createRideCard(ride);
    });
    
    html += '</div>';
    resultsArea.innerHTML = html;
    
    // Ajouter les event listeners pour les boutons de réservation
    addReservationListeners();
}

function createRideCard(ride) {
    const departure = new Date(ride.departure);
    
    const dateStr = departure.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
    });
    
    const timeStr = departure.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const price = parseFloat(ride.price).toFixed(2);
    
    // Distance et durée
    const distanceText = ride.distance_km ? `${ride.distance_km} km` : '--';
    const durationText = ride.duration_min ? `${ride.duration_min} min` : '--';
    
    // Distance depuis le point de recherche
    const proximityText = ride.distance_from_search !== null && ride.distance_from_search !== undefined
        ? `À ${ride.distance_from_search} km de vous` 
        : '';
    
    return `
        <article class="ride-card">
            <div class="ride-card-header">
                <div class="price">${price} €</div>
                <div class="date-time">
                    <div class="date">${dateStr}</div>
                    <div class="time">Départ à ${timeStr}</div>
                </div>
            </div>
            
            <div class="ride-card-body">
                <div class="ride-route">
                    <div class="point start">
                        <div class="dot-container">
                            <div class="dot"></div>
                            <div class="line"></div>
                        </div>
                        <div>
                            <div class="label">Départ</div>
                            <div class="address">${ride.address_from}</div>
                        </div>
                    </div>
                    <div class="point end">
                        <div class="dot-container">
                            <div class="dot"></div>
                        </div>
                        <div>
                            <div class="label">Arrivée</div>
                            <div class="address">${ride.address_to}</div>
                        </div>
                    </div>
                </div>
                
                <div class="ride-info">
                    <div class="info-item">
                        <span>🚗</span>
                        <span><strong>${distanceText}</strong></span>
                    </div>
                    <div class="info-item">
                        <span>⏱️</span>
                        <span><strong>${durationText}</strong></span>
                    </div>
                    <div class="info-item">
                        <span>💺</span>
                        <span><strong>${ride.max_seats}</strong> place(s)</span>
                    </div>
                </div>
                
                ${proximityText ? `<div style="margin-top: 12px;"><span class="distance-badge">📍 ${proximityText}</span></div>` : ''}
            </div>
            
            <div class="ride-card-footer">
                <button class="btn-reserve" data-ride-id="${ride.ride_id}">
                    Réserver ce trajet
                </button>
            </div>
        </article>
    `;
}

// ============================================
// RÉSERVATION
// ============================================

function addReservationListeners() {
    document.querySelectorAll('.btn-reserve').forEach(btn => {
        btn.addEventListener('click', async function() {
            const rideId = this.dataset.rideId;
            await bookRide(rideId, this);
        });
    });
}

async function bookRide(rideId, button) {
    // Vérifier si connecté
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        alert('Vous devez être connecté pour réserver un trajet.');
        window.location.href = '/connexion';
        return;
    }
    
    // Désactiver le bouton pendant la requête
    const originalText = button.textContent;
    button.textContent = 'Réservation...';
    button.disabled = true;
    
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
            alert('🎉 Réservation effectuée avec succès !');
            window.location.href = '/reservations';
        } else {
            const error = await response.json();
            alert('Erreur: ' + (error.detail || 'Impossible de réserver ce trajet'));
            button.textContent = originalText;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion au serveur');
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Exposer les fonctions globalement
window.initSearchAutocomplete = initSearchAutocomplete;
window.setSearchDirection = setSearchDirection;