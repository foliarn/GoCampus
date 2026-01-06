// ============================================
// PAGE PROPOSER UN TRAJET
// Utilise la nouvelle API PlaceAutocompleteElement (Mars 2025+)
// ============================================

let placeAutocomplete = null;
let selectedPlace = null;
let currentDirection = false; // false = vers l'IUT, true = depuis l'IUT
let googleMapsLoaded = false;

// Coordonnées de l'IUT Amiens (définies aussi dans le HTML)
const IUT_COORDS = { lat: 49.8847, lng: 2.2637 };
const IUT_ADDRESS = "IUT Amiens - Avenue des Facultés, 80000 Amiens";

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Cacher le message d'erreur API par défaut
    const apiError = document.getElementById('apiError');
    if (apiError) apiError.style.display = 'none';
    
    // Cacher l'affichage de l'adresse sélectionnée par défaut
    const selectedDisplay = document.getElementById('selectedAddressDisplay');
    if (selectedDisplay) selectedDisplay.style.display = 'none';
    
    // Définir la date minimum (aujourd'hui)
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
    
    // Charger les infos utilisateur et véhicules
    loadUserInfo();
    loadVehicles();
    
    // Initialiser le formulaire
    initRideForm();
    initVehicleModal();
});

// ============================================
// INITIALISATION GOOGLE PLACES AUTOCOMPLETE (NOUVELLE API)
// ============================================

function initAutocomplete() {
    googleMapsLoaded = true;
    createAutocompleteElement();
    console.log('Google Maps initialisé avec succès');
}

function createAutocompleteElement() {
    const container = document.getElementById('autocompleteContainerFrom') || document.getElementById('autocompleteContainerTo');
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
            
            onPlaceSelected(place);
        });
        
        console.log('PlaceAutocompleteElement créé avec succès');
        
    } catch (error) {
        console.error('Erreur lors de la création de PlaceAutocompleteElement:', error);
        googleMapsLoaded = false;
        document.getElementById('apiError').style.display = 'block';
    }
}

function onPlaceSelected(place) {
    if (!place || !place.location) {
        console.error("Aucune géométrie pour cette adresse");
        selectedPlace = null;
        return;
    }
    
    selectedPlace = {
        address: place.formattedAddress || place.displayName,
        lat: place.location.lat(),
        lng: place.location.lng()
    };
    
    // Mettre à jour les champs cachés
    document.getElementById('addressLat').value = selectedPlace.lat;
    document.getElementById('addressLng').value = selectedPlace.lng;
    document.getElementById('addressFormatted').value = selectedPlace.address;
    
    // Afficher l'adresse sélectionnée
    showSelectedAddress(selectedPlace.address);
    
    console.log('Adresse sélectionnée:', selectedPlace);
    
    // Calculer et afficher la route
    calculateRoute();
}

function showSelectedAddress(address) {
    const display = document.getElementById('selectedAddressDisplay');
    if (display) {
        display.innerHTML = `<span class="selected-icon">✓</span> ${address}`;
        display.style.display = 'block';
    }
}

function hideSelectedAddress() {
    const display = document.getElementById('selectedAddressDisplay');
    if (display) {
        display.style.display = 'none';
        display.innerHTML = '';
    }
}

// ============================================
// CALCUL DE LA ROUTE (Distance & Durée)
// ============================================

function calculateRoute() {
    if (!selectedPlace || !googleMapsLoaded) return;
    
    const directionsService = new google.maps.DirectionsService();
    
    let origin, destination;
    
    if (currentDirection) {
        // Depuis l'IUT → adresse sélectionnée
        origin = new google.maps.LatLng(IUT_COORDS.lat, IUT_COORDS.lng);
        destination = new google.maps.LatLng(selectedPlace.lat, selectedPlace.lng);
    } else {
        // Vers l'IUT
        origin = new google.maps.LatLng(selectedPlace.lat, selectedPlace.lng);
        destination = new google.maps.LatLng(IUT_COORDS.lat, IUT_COORDS.lng);
    }
    
    directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    }, (response, status) => {
        if (status === 'OK') {
            const route = response.routes[0].legs[0];
            displayRouteInfo(route.distance.text, route.duration.text);
        } else {
            console.error('Erreur calcul route:', status);
            hideRouteInfo();
        }
    });
}

function displayRouteInfo(distance, duration) {
    const routeInfo = document.getElementById('routeInfo');
    document.getElementById('routeDistance').textContent = distance;
    document.getElementById('routeDuration').textContent = duration;
    routeInfo.style.display = 'block';
}

function hideRouteInfo() {
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) routeInfo.style.display = 'none';
}

// ============================================
// TOGGLE DIRECTION (Aller à / Partir de l'IUT)
// ============================================

function setDirection(fromIut) {
    currentDirection = fromIut;
    document.getElementById('fromIut').value = fromIut;
    
    // Mettre à jour les boutons
    document.getElementById('toIutBtn').classList.toggle('active', !fromIut);
    document.getElementById('fromIutBtn').classList.toggle('active', fromIut);
    
    // Mettre à jour les labels et sections
    const departureSection = document.getElementById('departureSection');
    const arrivalSection = document.getElementById('arrivalSection');
    
    if (fromIut) {
        // Départ depuis l'IUT
        departureSection.innerHTML = `
            <label id="departureLabel">Départ (IUT Amiens)</label>
            <input type="text" class="iut-address" value="${IUT_ADDRESS}" disabled>
        `;
        
        arrivalSection.innerHTML = `
            <label id="arrivalLabel">Arrivée</label>
            <div class="autocomplete-container" id="autocompleteContainerTo"></div>
            <div id="selectedAddressDisplay" class="selected-address" style="display: none;"></div>
        `;
        
    } else {
        // Arrivée à l'IUT
        departureSection.innerHTML = `
            <label id="departureLabel">Départ</label>
            <div class="autocomplete-container" id="autocompleteContainerFrom"></div>
            <div id="selectedAddressDisplay" class="selected-address" style="display: none;"></div>
        `;
        
        arrivalSection.innerHTML = `
            <label id="arrivalLabel">Arrivée (IUT Amiens)</label>
            <input type="text" id="iutAddressDisplay" class="iut-address" value="${IUT_ADDRESS}" disabled>
        `;
    }
    
    // Recréer l'autocomplete dans le nouveau container
    setTimeout(() => {
        if (googleMapsLoaded) {
            createAutocompleteElement();
        }
    }, 100);
    
    // Réinitialiser la sélection
    selectedPlace = null;
    document.getElementById('addressLat').value = '';
    document.getElementById('addressLng').value = '';
    document.getElementById('addressFormatted').value = '';
    hideRouteInfo();
}

// ============================================
// CHARGEMENT DES INFOS UTILISATEUR
// ============================================

async function loadUserInfo() {
    // Vérifier que l'utilisateur est connecté
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        return;
    }

    try {
        const response = await fetchWithAuth('/users/me');
        if (response && response.ok) {
            const user = await response.json();
            const driverName = document.getElementById('driverName');
            if (driverName) {
                driverName.textContent = `Conducteur : ${user.name} ${user.surname}`;
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des infos utilisateur:', error);
    }
}

// ============================================
// CHARGER LES VÉHICULES
// ============================================

async function loadVehicles() {
    const select = document.getElementById('vehicleId');
    const noVehicleMsg = document.getElementById('noVehicleMsg');
    
    if (!select) return;

    // Vérifier si connecté
    if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
        if (noVehicleMsg) noVehicleMsg.style.display = 'block';
        return;
    }

    try {
        const response = await fetchWithAuth('/vehicles/');
        
        if (response && response.ok) {
            const vehicles = await response.json();

            select.innerHTML = '<option value="">-- Sélectionnez un véhicule --</option>';

            if (vehicles.length === 0) {
                if (noVehicleMsg) noVehicleMsg.style.display = 'block';
            } else {
                if (noVehicleMsg) noVehicleMsg.style.display = 'none';
                
                vehicles.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.vehicle_id;
                    option.textContent = `${vehicle.model} - ${vehicle.license_plate} (${vehicle.max_seats} places)`;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des véhicules:', error);
        if (noVehicleMsg) noVehicleMsg.style.display = 'block';
    }
}

// ============================================
// FORMULAIRE DE CRÉATION DE TRAJET
// ============================================

function initRideForm() {
    const rideForm = document.getElementById('rideForm');

    if (rideForm) {
        rideForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const errorDiv = document.getElementById('errorMessage');
            const successDiv = document.getElementById('successMessage');
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            // Vérifier qu'une adresse a été sélectionnée
            const lat = document.getElementById('addressLat').value;
            const lng = document.getElementById('addressLng').value;
            const addressFormatted = document.getElementById('addressFormatted').value;
            
            if (!lat || !lng || !selectedPlace) {
                errorDiv.textContent = 'Veuillez sélectionner une adresse dans la liste de suggestions';
                errorDiv.style.display = 'block';
                return;
            }

            // Récupérer les valeurs
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            
            if (!date || !time) {
                errorDiv.textContent = 'Veuillez remplir la date et l\'heure';
                errorDiv.style.display = 'block';
                return;
            }
            
            const departure = `${date}T${time}:00`;
            const fromIut = document.getElementById('fromIut').value === 'true';

            const data = {
                address: addressFormatted,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                from_iut: fromIut,
                departure: departure,
                max_seats: parseInt(document.getElementById('maxSeats').value),
                price: parseFloat(document.getElementById('price').value),
                vehicle_id: parseInt(document.getElementById('vehicleId').value)
            };

            // Validation
            if (!data.vehicle_id) {
                errorDiv.textContent = 'Veuillez sélectionner un véhicule';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                const response = await fetchWithAuth('/rides/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    successDiv.textContent = 'Trajet publié avec succès !';
                    successDiv.style.display = 'block';
                    
                    // Réinitialiser le formulaire
                    rideForm.reset();
                    selectedPlace = null;
                    hideSelectedAddress();
                    hideRouteInfo();
                    
                    // Rediriger vers mes annonces après 2 secondes
                    setTimeout(() => {
                        window.location.href = '/annonces';
                    }, 2000);
                } else {
                    const error = await response.json();
                    errorDiv.textContent = error.detail || 'Erreur lors de la publication du trajet';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Erreur de connexion au serveur';
                errorDiv.style.display = 'block';
            }
        });
    }
}

// ============================================
// MODAL AJOUT VÉHICULE
// ============================================

function initVehicleModal() {
    const addVehicleLink = document.getElementById('addVehicleLink');
    const vehicleModal = document.getElementById('vehicleModal');
    const closeModal = document.getElementById('closeModal');
    const vehicleForm = document.getElementById('vehicleForm');

    if (addVehicleLink && vehicleModal) {
        addVehicleLink.addEventListener('click', function(e) {
            e.preventDefault();
            vehicleModal.style.display = 'flex';
        });
    }

    if (closeModal && vehicleModal) {
        closeModal.addEventListener('click', function() {
            vehicleModal.style.display = 'none';
        });

        // Fermer en cliquant en dehors
        vehicleModal.addEventListener('click', function(e) {
            if (e.target === vehicleModal) {
                vehicleModal.style.display = 'none';
            }
        });
    }

    if (vehicleForm) {
        vehicleForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const data = {
                model: document.getElementById('vehicleModel').value,
                license_plate: document.getElementById('licensePlate').value,
                color: document.getElementById('vehicleColor').value || 'Non spécifié',
                max_seats: parseInt(document.getElementById('vehicleSeats').value)
            };

            try {
                const response = await fetchWithAuth('/vehicles/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('Véhicule ajouté avec succès !');
                    vehicleModal.style.display = 'none';
                    vehicleForm.reset();
                    
                    await loadVehicles();
                } else {
                    const error = await response.json();
                    alert('Erreur: ' + (error.detail || 'Impossible d\'ajouter le véhicule'));
                }
            } catch (error) {
                alert('Erreur de connexion au serveur');
            }
        });
    }
}

// Exposer les fonctions globalement pour le HTML
window.initAutocomplete = initAutocomplete;
window.setDirection = setDirection;