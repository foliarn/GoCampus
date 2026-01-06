// ============================================
// PAGE PROPOSER UN TRAJET (Version Simplifiée & Corrigée)
// ============================================

let placeAutocomplete = null;
let currentDirection = false; 
let googleMapsLoaded = false;
let PlaceAutocompleteElement = null;

const IUT_COORDS = { lat: 49.8847, lng: 2.2637 };
const IUT_ADDRESS = "IUT Amiens - Avenue des Facultés, 80000 Amiens";

document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    
    // Heure par défaut +1h
    const timeInput = document.getElementById('time');
    if(timeInput) {
        const h = new Date().getHours() + 1;
        timeInput.value = `${h < 10 ? '0'+h : h}:00`;
    }

    checkAuthAndLoadData();
    initRideForm();
    initVehicleModal();
});

async function checkAuthAndLoadData() {
    if (!localStorage.getItem('access_token')) {
        window.location.href = '/connexion';
        return;
    }
    await loadUserInfo();
    await loadVehicles();
}

// === GOOGLE MAPS INIT ===

async function initAutocomplete() {
    console.log("Maps API Callback fired. Importing libraries...");
    try {
        const placesLib = await google.maps.importLibrary("places");
        PlaceAutocompleteElement = placesLib.PlaceAutocompleteElement;
        
        googleMapsLoaded = true;
        const errDiv = document.getElementById('apiError');
        if(errDiv) errDiv.style.display = 'none';
        
        createAutocompleteElement();
        
    } catch (e) {
        console.error("Erreur import Maps:", e);
    }
}

function createAutocompleteElement() {
    const containerId = currentDirection ? 'autocompleteContainerTo' : 'autocompleteContainerFrom';
    const container = document.getElementById(containerId);
    
    if (!container || !PlaceAutocompleteElement) return;
    
    container.innerHTML = '';
    
    placeAutocomplete = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'fr' },
    });
    
    container.appendChild(placeAutocomplete);
    
    // --- LISTENER STRICTEMENT CONFORME A LA DOC ---
    placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
        // 1. Convertir la prédiction en objet Place
        const place = placePrediction.toPlace();
        
        // 2. Récupérer les champs
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        
        // 3. Attribuer les valeurs aux champs cachés
        if (place.location) {
            document.getElementById('addressLat').value = place.location.lat();
            document.getElementById('addressLng').value = place.location.lng();
            document.getElementById('addressFormatted').value = place.formattedAddress || place.displayName;
            
            console.log("✅ Lieu récupéré via gmp-select:", place.formattedAddress);
            
            // Calcul itinéraire optionnel pour l'affichage
            calculateRoute(place.location.lat(), place.location.lng());
        }
    });
}

function calculateRoute(lat, lng) {
    if (!lat || !lng || !googleMapsLoaded) return;
    
    const ds = new google.maps.DirectionsService();
    const userLoc = new google.maps.LatLng(lat, lng);
    const iutLoc = new google.maps.LatLng(IUT_COORDS.lat, IUT_COORDS.lng);
    
    ds.route({
        origin: currentDirection ? iutLoc : userLoc,
        destination: currentDirection ? userLoc : iutLoc,
        travelMode: google.maps.TravelMode.DRIVING
    }, (response, status) => {
        const infoDiv = document.getElementById('routeInfo');
        if (status === 'OK') {
            const leg = response.routes[0].legs[0];
            document.getElementById('routeDistance').textContent = leg.distance.text;
            document.getElementById('routeDuration').textContent = leg.duration.text;
            infoDiv.style.display = 'block';
        }
    });
}

function setDirection(isFromIut) {
    currentDirection = isFromIut;
    document.getElementById('fromIut').value = isFromIut;
    document.getElementById('toIutBtn').classList.toggle('active', !isFromIut);
    document.getElementById('fromIutBtn').classList.toggle('active', isFromIut);
    
    const depSection = document.getElementById('departureSection');
    const arrSection = document.getElementById('arrivalSection');
    
    // Reset valeurs
    document.getElementById('addressLat').value = '';
    document.getElementById('routeInfo').style.display = 'none';
    const confirmDiv = document.getElementById('selectedAddressDisplay');
    if(confirmDiv) confirmDiv.style.display = 'none';

    if (isFromIut) {
        depSection.innerHTML = `<label id="departureLabel">Point de départ (IUT)</label><input type="text" class="iut-address" value="${IUT_ADDRESS}" disabled>`;
        arrSection.innerHTML = `<label id="arrivalLabel">Point d'arrivée</label><div class="autocomplete-container" id="autocompleteContainerTo"></div>`;
    } else {
        depSection.innerHTML = `<label id="departureLabel">Point de départ</label><div class="autocomplete-container" id="autocompleteContainerFrom"></div>`;
        arrSection.innerHTML = `<label id="arrivalLabel">Point d'arrivée (IUT)</label><input type="text" class="iut-address" value="${IUT_ADDRESS}" disabled>`;
    }
    
    if (googleMapsLoaded && PlaceAutocompleteElement) {
        setTimeout(createAutocompleteElement, 50);
    }
}

// === DATA LOADING ===
async function loadUserInfo() {
    try {
        const res = await fetchWithAuth('/users/me');
        if (res.ok) {
            const user = await res.json();
            document.getElementById('driverName').textContent = `Conducteur : ${user.name} ${user.surname}`;
        }
    } catch (e) { console.error(e); }
}

async function loadVehicles() {
    const select = document.getElementById('vehicleId');
    if (!select) return;
    try {
        const res = await fetchWithAuth('/vehicles/me');
        if (res.ok) {
            const vehicles = await res.json();
            select.innerHTML = vehicles.length ? '<option value="">-- Sélectionnez --</option>' : '<option value="">Aucun véhicule</option>';
            vehicles.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.vehicle_id;
                opt.textContent = `${v.model} (${v.license_plate})`;
                select.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

// === FORMS ===
function initVehicleModal() {
    const modal = document.getElementById('vehicleModal');
    const form = document.getElementById('vehicleForm');
    
    document.getElementById('addVehicleLink').onclick = (e) => { e.preventDefault(); modal.style.display = 'flex'; };
    document.getElementById('closeModal').onclick = () => modal.style.display = 'none';
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            model: document.getElementById('vehicleModel').value,
            license_plate: document.getElementById('licensePlate').value,
            color: document.getElementById('vehicleColor').value || 'Non spécifié',
            max_seats: parseInt(document.getElementById('vehicleSeats').value)
        };
        const res = await fetchWithAuth('/vehicles/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        if (res.ok) {
            modal.style.display = 'none';
            form.reset();
            await loadVehicles();
        }
    };
}

function initRideForm() {
    const form = document.getElementById('rideForm');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        errorDiv.style.display = 'none';
        
        let lat = document.getElementById('addressLat').value;
        let lng = document.getElementById('addressLng').value;
        let address = document.getElementById('addressFormatted').value;

        if (!lat) {
            errorDiv.textContent = "L'adresse n'est pas valide. Veuillez cliquer sur une suggestion dans la liste.";
            errorDiv.style.display = 'block';
            return;
        }

        const vehicleId = document.getElementById('vehicleId').value;
        if (!vehicleId) {
            errorDiv.textContent = "Veuillez sélectionner un véhicule.";
            errorDiv.style.display = 'block';
            return;
        }

        const data = {
            address: address,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            from_iut: document.getElementById('fromIut').value === 'true',
            departure: `${document.getElementById('date').value}T${document.getElementById('time').value}:00`,
            max_seats: parseInt(document.getElementById('maxSeats').value),
            price: parseFloat(document.getElementById('price').value),
            vehicle_id: parseInt(vehicleId)
        };

        try {
            const res = await fetchWithAuth('/rides/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });

            if (res.ok) {
                successDiv.textContent = "Trajet publié avec succès !";
                successDiv.style.display = 'block';
                setTimeout(() => window.location.href = '/annonces', 1500);
            } else {
                const err = await res.json();
                errorDiv.textContent = err.detail || "Erreur lors de la publication.";
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            errorDiv.textContent = "Erreur serveur ou de connexion.";
            errorDiv.style.display = 'block';
        }
    };
}

window.initAutocomplete = initAutocomplete;
window.setDirection = setDirection;