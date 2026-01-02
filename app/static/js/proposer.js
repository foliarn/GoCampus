// ============================================
// PAGE PROPOSER UN TRAJET
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Vérifier que l'utilisateur est connecté
    if (!isLoggedIn()) {
        return; // La redirection est gérée par auth.js
    }

    // Charger les infos de l'utilisateur
    await loadUserInfo();

    // Charger les véhicules
    await loadVehicles();

    // Définir la date minimum (aujourd'hui)
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
});

// ============================================
// CHARGER LES INFOS UTILISATEUR
// ============================================

async function loadUserInfo() {
    try {
        const response = await fetchWithAuth('/users/me');
        if (response.ok) {
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

    try {
        const response = await fetchWithAuth('/api/vehicles/me');
        
        if (response.ok) {
            const vehicles = await response.json();

            // Vider le select (garder l'option par défaut)
            select.innerHTML = '<option value="">-- Sélectionnez un véhicule --</option>';

            if (vehicles.length === 0) {
                // Afficher le message pour ajouter un véhicule
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
    }
}

// ============================================
// FORMULAIRE DE CRÉATION DE TRAJET
// ============================================

const rideForm = document.getElementById('rideForm');

if (rideForm) {
    rideForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';

        // Récupérer les valeurs
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const departure = `${date}T${time}:00`;

        const data = {
            address_from: document.getElementById('addressFrom').value,
            address_to: document.getElementById('addressTo').value,
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
            const response = await fetchWithAuth('/api/rides/', {
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

// ============================================
// MODAL AJOUT VÉHICULE
// ============================================

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

    // Fermer en cliquant à l'extérieur
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
            const response = await fetchWithAuth('/api/vehicles/', {
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
                
                // Recharger la liste des véhicules
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