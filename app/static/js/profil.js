// ============================================
// PAGE PROFIL - GESTION DES INFORMATIONS UTILISATEUR
// ============================================

let currentUserData = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'authentification
    if (!isLoggedIn()) {
        window.location.href = '/connexion';
        return;
    }

    // Charger les données
    loadUserProfile();
    loadUserVehicles();
    
    // Initialiser les événements
    initProfileEvents();
    initVehicleEvents();
});

// ============================================
// CHARGEMENT DES DONNÉES UTILISATEUR
// ============================================

async function loadUserProfile() {
    try {
        const response = await fetchWithAuth('/users/me');
        
        if (!response.ok) {
            throw new Error('Erreur de chargement du profil');
        }
        
        currentUserData = await response.json();
        displayUserProfile(currentUserData);
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Impossible de charger vos informations');
    }
}

function displayUserProfile(user) {
    document.getElementById('name').value = user.name || '';
    document.getElementById('surname').value = user.surname || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone_number').value = user.phone_number || '';
    document.getElementById('address').value = user.address || '';
}

// ============================================
// ÉDITION DES INFORMATIONS PERSONNELLES
// ============================================

function initProfileEvents() {
    const editBtn = document.getElementById('editInfoBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const profileForm = document.getElementById('profileForm');
    
    // Bouton "Modifier"
    editBtn.addEventListener('click', function() {
        enableEditMode();
    });
    
    // Bouton "Annuler"
    cancelBtn.addEventListener('click', function() {
        disableEditMode();
        displayUserProfile(currentUserData); // Restaurer les données originales
    });
    
    // Soumission du formulaire
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveProfileChanges();
    });
}

function enableEditMode() {
    isEditMode = true;
    
    // Activer les champs
    document.getElementById('name').disabled = false;
    document.getElementById('surname').disabled = false;
    document.getElementById('email').disabled = false;
    document.getElementById('phone_number').disabled = false;
    document.getElementById('address').disabled = false;
    
    // Changer le bouton "Modifier" en mode édition
    const editBtn = document.getElementById('editInfoBtn');
    editBtn.style.display = 'none';
    
    // Afficher les boutons d'action
    const editActions = document.getElementById('editActions');
    editActions.style.display = 'flex';
}

function disableEditMode() {
    isEditMode = false;
    
    // Désactiver les champs
    document.getElementById('name').disabled = true;
    document.getElementById('surname').disabled = true;
    document.getElementById('email').disabled = true;
    document.getElementById('phone_number').disabled = true;
    document.getElementById('address').disabled = true;
    
    // Restaurer le bouton "Modifier"
    const editBtn = document.getElementById('editInfoBtn');
    editBtn.style.display = 'block';
    
    // Masquer les boutons d'action
    const editActions = document.getElementById('editActions');
    editActions.style.display = 'none';
}

async function saveProfileChanges() {
    const updatedData = {
        name: document.getElementById('name').value,
        surname: document.getElementById('surname').value,
        email: document.getElementById('email').value,
        phone_number: document.getElementById('phone_number').value || null,
        address: document.getElementById('address').value || null,
        role: currentUserData.role // Conserver le rôle actuel
    };
    
    try {
        const response = await fetchWithAuth('/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });
        
        if (response.ok) {
            currentUserData = await response.json();
            disableEditMode();
            showSuccess('Vos informations ont été mises à jour avec succès');
        } else {
            const error = await response.json();
            showError(error.detail || 'Erreur lors de la mise à jour');
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

// ============================================
// GESTION DES VÉHICULES
// ============================================

async function loadUserVehicles() {
    const vehiclesList = document.getElementById('vehiclesList');
    
    try {
        const response = await fetchWithAuth('/vehicles/me');
        
        if (!response.ok) {
            throw new Error('Erreur de chargement des véhicules');
        }
        
        const vehicles = await response.json();
        displayVehicles(vehicles);
        
    } catch (error) {
        console.error('Erreur:', error);
        vehiclesList.innerHTML = `
            <div class="empty-state">
                <p style="color: #EF4444;">Erreur de chargement des véhicules</p>
            </div>
        `;
    }
}

function displayVehicles(vehicles) {
    const vehiclesList = document.getElementById('vehiclesList');
    
    if (vehicles.length === 0) {
        vehiclesList.innerHTML = `
            <div class="empty-state">
                <p>Vous n'avez pas encore ajouté de véhicule.</p>
                <p style="font-size: 0.85rem; margin-top: 10px;">Cliquez sur "Ajouter un véhicule" pour commencer.</p>
            </div>
        `;
        return;
    }
    
    vehiclesList.innerHTML = vehicles.map(vehicle => createVehicleCard(vehicle)).join('');
    
    // Attacher les événements de suppression
    vehicles.forEach(vehicle => {
        const deleteBtn = document.getElementById(`delete-vehicle-${vehicle.vehicle_id}`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteVehicle(vehicle.vehicle_id));
        }
    });
}

function createVehicleCard(vehicle) {
    const colorDisplay = vehicle.color || 'Non spécifié';
    
    return `
        <div class="vehicle-card">
            <div class="vehicle-header">
                <div class="vehicle-icon">🚗</div>
                <div>
                    <div class="vehicle-name">${vehicle.model}</div>
                </div>
            </div>
            <div class="vehicle-details">
                <div class="vehicle-detail">
                    <span class="vehicle-detail-label">Immatriculation</span>
                    <span class="vehicle-detail-value">${vehicle.license_plate}</span>
                </div>
                <div class="vehicle-detail">
                    <span class="vehicle-detail-label">Couleur</span>
                    <span class="vehicle-detail-value">${colorDisplay}</span>
                </div>
                <div class="vehicle-detail">
                    <span class="vehicle-detail-label">Places</span>
                    <span class="vehicle-detail-value">${vehicle.max_seats}</span>
                </div>
            </div>
            <div class="vehicle-actions">
                <button class="btn-delete-vehicle" id="delete-vehicle-${vehicle.vehicle_id}">
                    Supprimer
                </button>
            </div>
        </div>
    `;
}

// ============================================
// MODAL VÉHICULE
// ============================================

function initVehicleEvents() {
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const vehicleModal = document.getElementById('vehicleModal');
    const vehicleForm = document.getElementById('vehicleForm');
    
    // Ouvrir la modal
    addVehicleBtn.addEventListener('click', function() {
        vehicleModal.style.display = 'flex';
        vehicleForm.reset();
    });
    
    // Fermer la modal
    closeModalBtn.addEventListener('click', function() {
        vehicleModal.style.display = 'none';
    });
    
    // Fermer en cliquant en dehors
    vehicleModal.addEventListener('click', function(e) {
        if (e.target === vehicleModal) {
            vehicleModal.style.display = 'none';
        }
    });
    
    // Soumission du formulaire
    vehicleForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await addVehicle();
    });
}

async function addVehicle() {
    const vehicleData = {
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
            body: JSON.stringify(vehicleData)
        });
        
        if (response.ok) {
            // Fermer la modal
            document.getElementById('vehicleModal').style.display = 'none';
            
            // Recharger la liste des véhicules
            await loadUserVehicles();
            
            showSuccess('Véhicule ajouté avec succès');
        } else {
            const error = await response.json();
            showError(error.detail || 'Erreur lors de l\'ajout du véhicule');
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

async function deleteVehicle(vehicleId) {
    const confirmed = await showConfirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?', {
        title: 'Supprimer le véhicule',
        type: 'warning',
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetchWithAuth(`/vehicles/${vehicleId}`, {
            method: 'DELETE'
        });
        
        if (response.ok || response.status === 204) {
            await loadUserVehicles();
            showSuccess('Véhicule supprimé avec succès');
        } else {
            const error = await response.json();
            showError(error.detail || 'Erreur lors de la suppression');
        }
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion au serveur');
    }
}

// ============================================
// MESSAGES DE FEEDBACK
// ============================================

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Masquer le message d'erreur
    document.getElementById('errorMessage').style.display = 'none';
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Masquer après 5 secondes
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Masquer le message de succès
    document.getElementById('successMessage').style.display = 'none';
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Masquer après 5 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}