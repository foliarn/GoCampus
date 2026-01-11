// ============================================
// PAGE RECHERCHER UN TRAJET
// ============================================

let selectedSearchPlace = null;
let currentSearchDirection = false; // false = vers l'IUT, true = depuis l'IUT
let googleMapsLoaded = false;
let PlaceAutocompleteElement = null;

// Coordonnées par défaut (non utilisées pour le calcul ici mais utiles en ref)
const IUT_COORDS = { lat: 49.8847, lng: 2.2637 };
const IUT_ADDRESS = "IUT Amiens - Avenue des Facultés, 80000 Amiens";


document.addEventListener('DOMContentLoaded', function() {
    initDateTimeDefaults();
    
    // Initialiser le formulaire
    initSearchForm();
    
    // Pas de loadUserInfo() ici car la page est publique et n'a pas de champ #driverName
});

function initDateTimeDefaults() {
    const dateInput = document.getElementById('searchDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
        dateInput.value = today;
    }
    
    const timeInput = document.getElementById('searchTime');
    if (timeInput) {
        const now = new Date();
        const h = now.getHours() + 1;
        timeInput.value = `${h < 10 ? '0'+h : h}:00`;
    }
}

// ============================================
// GOOGLE MAPS INIT
// ============================================

async function initSearchAutocomplete() {
    console.log("Rechercher: Maps API Callback fired.");
    try {
        const placesLib = await google.maps.importLibrary("places");
        PlaceAutocompleteElement = placesLib.PlaceAutocompleteElement;
        
        googleMapsLoaded = true;
        const errDiv = document.getElementById('apiError');
        if(errDiv) errDiv.style.display = 'none';
        
        createSearchAutocompleteElement();
        
    } catch (e) {
        console.error("Erreur import Maps:", e);
        const errDiv = document.getElementById('apiError');
        if(errDiv) {
            errDiv.style.display = 'block';
            errDiv.textContent = "Erreur chargement carte.";
        }
    }
}

function createSearchAutocompleteElement() {
    const container = document.getElementById('autocompleteContainer');
    
    if (!container || !PlaceAutocompleteElement) return;
    
    container.innerHTML = '';
    
    const placeAutocomplete = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'fr' },
    });
    
    container.appendChild(placeAutocomplete);
    
    placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
        // 1. Convertir la prédiction en objet Place
        const place = placePrediction.toPlace();
        
        // 2. Fetcher les champs nécessaires
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        
        // 3. Stocker et afficher
        if (place.location) {
            selectedSearchPlace = {
                address: place.formattedAddress || place.displayName,
                lat: place.location.lat(),
                lng: place.location.lng()
            };
            
            // Remplir champs cachés
            document.getElementById('searchLat').value = selectedSearchPlace.lat;
            document.getElementById('searchLng').value = selectedSearchPlace.lng;
            document.getElementById('searchAddressFormatted').value = selectedSearchPlace.address;
            
            console.log("✅ Lieu recherche sélectionné:", selectedSearchPlace);
        }
    });
}

// ============================================
// TOGGLE DIRECTION
// ============================================

function setSearchDirection(fromIut) {
    currentSearchDirection = fromIut;
    const inputFromIut = document.getElementById('searchFromIut');
    if (inputFromIut) inputFromIut.value = fromIut;
    
    // UI Boutons
    const btnTo = document.getElementById('toIutBtn');
    const btnFrom = document.getElementById('fromIutBtn');
    
    if (btnTo) btnTo.classList.toggle('active', !fromIut);
    if (btnFrom) btnFrom.classList.toggle('active', fromIut);
    
    // Label
    const lbl = document.getElementById('addressLabel');
    if (lbl) {
        lbl.textContent = fromIut ? "Mon adresse d'arrivée" : "Mon adresse de départ";
    }
}

// ============================================
// FORMULAIRE DE RECHERCHE
// ============================================

function initSearchForm() {
    const form = document.getElementById('searchForm');
    if (!form) return; // Sécurité si le formulaire n'existe pas
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const lat = document.getElementById('searchLat').value;
        const lng = document.getElementById('searchLng').value;
        const searchDate = document.getElementById('searchDate').value;
        const searchTime = document.getElementById('searchTime').value;
        // Conversion string "true"/"false" en boolean
        const fromIut = document.getElementById('searchFromIut').value === 'true';
        
        if (!lat || !lng) {
            alert("Veuillez sélectionner une adresse valide dans la liste déroulante.");
            return;
        }
        
        // Cacher le feedback d'adresse une fois la recherche lancée
        const feedback = document.getElementById('searchAddressFeedback');
        if (feedback) {
            feedback.style.display = 'none';
        }
        
        // Afficher l'info de recherche
        updateSearchInfoUI(searchTime);
        
        // Lancer recherche
        showLoading();
        await searchRides(lat, lng, fromIut, searchDate, searchTime);
    });
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
        
        if (!response.ok) throw new Error('Erreur réseau');
        
        const rides = await response.json();
        displayResults(rides);
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Impossible de récupérer les trajets. Veuillez réessayer.');
    }
}

// ============================================
// AFFICHAGE RÉSULTATS
// ============================================

function showLoading() {
    const area = document.getElementById('resultsArea');
    if (!area) return;
    area.innerHTML = `
        <div class="no-results">
            <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
            <p>Recherche des meilleurs covoiturages...</p>
        </div>
    `;
}

function showError(msg) {
    const area = document.getElementById('resultsArea');
    if (!area) return;
    area.innerHTML = `
        <div class="no-results">
            <h3 style="color: #EF4444;">Oups !</h3>
            <p>${msg}</p>
        </div>
    `;
}

function updateSearchInfoUI(time) {
    const info = document.getElementById('searchInfo');
    const range = document.getElementById('timeRange');
    if(info && range) {
        range.textContent = `${time} (±30 min)`;
        info.style.display = 'block';
    }
}

function displayResults(rides) {
    const area = document.getElementById('resultsArea');
    if (!area) return;
    
    if (rides.length === 0) {
        area.innerHTML = `
            <div class="no-results">
                <h3>😕 Aucun trajet trouvé</h3>
                <p>Aucun conducteur ne passe près de chez vous à cette heure-ci.</p>
                <p style="margin-top:15px; font-size:0.9rem;">Essayez de modifier légèrement l'heure ou la date.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="margin-bottom: 20px; color: var(--text-gray);">
            <strong>${rides.length}</strong> trajet(s) trouvé(s)
        </div>
        <div class="results-grid">
    `;
    
    rides.forEach(ride => html += createRideCardHTML(ride));
    
    html += '</div>';
    area.innerHTML = html;
    
    // Attacher listeners boutons
    document.querySelectorAll('.btn-reserve').forEach(btn => {
        btn.addEventListener('click', function() {
            bookRide(this.dataset.rideId, this);
        });
    });
}

function createRideCardHTML(ride) {
    const dep = new Date(ride.departure);
    const dateStr = dep.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
    const timeStr = dep.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
    const price = parseFloat(ride.price).toFixed(2);
    const distText = ride.distance_km ? `${ride.distance_km} km` : '--';
    const durText = ride.duration_min ? `${ride.duration_min} min` : '--';
    
    const prox = ride.distance_from_search 
        ? `<div class="distance-badge">📍 À ${ride.distance_from_search} km de vous</div>` 
        : '';

    // --- LOGIQUE PLACES DYNAMIQUES ---
    const reservations = ride.reservations || [];
    const seatsTaken = reservations
        .filter(r => ['waiting', 'confirmed'].includes(r.status))
        .reduce((sum, r) => sum + r.seats_booked, 0);
    
    const remainingSeats = Math.max(0, ride.max_seats - seatsTaken);
    
    // Style et texte pour les places
    const seatColor = remainingSeats === 0 ? '#EF4444' : '#1F2937'; // Rouge si complet
    const seatLabel = remainingSeats > 1 ? 'places' : 'place';
    
    // Désactiver le bouton si complet
    const isFull = remainingSeats === 0;
    const btnDisabled = isFull ? 'disabled style="background-color: #9CA3AF; cursor: not-allowed;"' : '';
    const btnText = isFull ? 'Complet' : 'Réserver';

    return `
        <article class="ride-card">
            <div class="ride-card-header">
                <div class="price">${price} €</div>
                <div class="date-time">
                    <div class="date">${dateStr}</div>
                    <div class="time">${timeStr}</div>
                </div>
            </div>
            <div class="ride-card-body">
                <div class="ride-route">
                    <div class="point start">
                        <div class="dot-container"><div class="dot"></div><div class="line"></div></div>
                        <div><div class="label">Départ</div><div class="address">${ride.address_from}</div></div>
                    </div>
                    <div class="point end">
                        <div class="dot-container"><div class="dot"></div></div>
                        <div><div class="label">Arrivée</div><div class="address">${ride.address_to}</div></div>
                    </div>
                </div>
                
                <div class="ride-info">
                    <div class="info-item">
                        <span>🚗</span>
                        <strong>${distText}</strong>
                    </div>
                    <div class="info-item">
                        <span>⏱️</span>
                        <strong>${durText}</strong>
                    </div>
                    <div class="info-item" style="color: ${seatColor};">
                        <span>💺</span>
                        <strong>${remainingSeats} ${seatLabel}</strong>
                    </div>
                </div>
                ${prox}
            </div>
            <div class="ride-card-footer">
                <button class="btn-reserve" data-ride-id="${ride.ride_id}" ${btnDisabled}>${btnText}</button>
            </div>
        </article>
    `;
}

async function bookRide(rideId, btn) {
    // Vérification globale isLoggedIn
    if (typeof window.isLoggedIn === 'function' && !window.isLoggedIn()) {
        window.location.href = '/connexion';
        return;
    } else if (!localStorage.getItem('access_token')) {
        // Fallback manuel si isLoggedIn n'est pas chargé
        window.location.href = '/connexion';
        return;
    }
    
    // Afficher la modal de confirmation
    const modal = document.getElementById('confirmModal');
    const btnYes = document.getElementById('confirmYes');
    const btnNo = document.getElementById('confirmNo');
    const modalBody = modal.querySelector('.modal-box p');
    const modalTitle = modal.querySelector('.modal-box h3');
    const modalButtons = modal.querySelector('.modal-buttons');
    
    if (!modal || !btnYes || !btnNo) {
        console.error("Modal elements not found");
        return;
    }
    
    // Reset modal state (au cas où elle a été utilisée pour un succès avant)
    modalTitle.textContent = "Confirmation";
    modalBody.textContent = "Souhaitez-vous réserver une place pour ce trajet ?";
    modalButtons.style.display = "flex";
    
    // Nettoyer les anciens event listeners
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    
    const newBtnNo = btnNo.cloneNode(true);
    btnNo.parentNode.replaceChild(newBtnNo, btnNo);
    
    // Ouvrir la modal
    modal.style.display = 'flex';
    
    // Gestion du Non
    newBtnNo.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Gestion du Oui
    newBtnYes.addEventListener('click', async () => {
        // État de chargement dans la modal
        newBtnYes.textContent = "Envoi...";
        newBtnYes.disabled = true;
        newBtnNo.disabled = true;
        
        try {
            const res = await fetchWithAuth('/reservations/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ride_id: parseInt(rideId), seats_booked: 1 })
            });
            
            if (res.ok) {
                // Modification de la modal pour afficher le succès
                modalTitle.textContent = "Succès !";
                modalBody.innerHTML = `<span style="color: #059669; font-weight: bold;">✓ Demande de réservation envoyée.</span><br>En attente de la validation du conducteur.`;
                
                // Remplacer les boutons par un seul bouton "Compris"
                modalButtons.innerHTML = ''; // Vider les boutons
                const btnCompris = document.createElement('button');
                btnCompris.textContent = "Compris";
                btnCompris.className = "btn-confirm-yes"; // Style vert
                btnCompris.onclick = () => {
                    modal.style.display = 'none';
                    window.location.href = '/reservations';
                };
                modalButtons.appendChild(btnCompris);
                
                // Fermeture automatique optionnelle (désactivée pour laisser le temps de lire)
                // setTimeout(() => { ... }, 3000);
            } else {
                const err = await res.json();
                modalTitle.textContent = "Information";
                
                // Si c'est une erreur "déjà réservé" (status 400 ou 409 selon l'implémentation backend)
                // On affiche un bouton "Compris" au lieu de réessayer
                if (res.status === 400 || res.status === 409) {
                    modalBody.textContent = err.detail || 'Vous avez déjà une réservation pour ce trajet.';
                    
                    modalButtons.innerHTML = ''; // Vider les boutons Oui/Non
                    const btnCompris = document.createElement('button');
                    btnCompris.textContent = "Compris";
                    btnCompris.className = "btn-confirm-no"; // Style gris ou neutre
                    btnCompris.onclick = () => {
                        modal.style.display = 'none';
                    };
                    modalButtons.appendChild(btnCompris);
                } else {
                    // Erreur générique, on laisse réessayer
                    modalBody.textContent = err.detail || 'Echec réservation';
                    newBtnYes.textContent = "Oui";
                    newBtnYes.disabled = false;
                    newBtnNo.disabled = false;
                }
            }
        } catch (e) {
            modalTitle.textContent = "Erreur";
            modalBody.textContent = "Erreur de connexion au serveur.";
            // Reset boutons
            newBtnYes.textContent = "Oui";
            newBtnYes.disabled = false;
            newBtnNo.disabled = false;
        }
    });
    
    // Fermeture clic extérieur
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
}

// === EXPOSITION GLOBALE (CRITIQUE) ===
window.initSearchAutocomplete = initSearchAutocomplete;
window.setSearchDirection = setSearchDirection;