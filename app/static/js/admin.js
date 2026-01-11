document.addEventListener('DOMContentLoaded', async function() {
    // 1. Vérif Admin
    try {
        const user = await fetchWithAuth('/users/me').then(res => res.json());
        if(user.role !== 'admin') {
            alert("Accès interdit.");
            window.location.href = '/';
            return;
        }
        document.getElementById('adminName').textContent = `Connecté en tant que : ${user.name} ${user.surname}`;
        
        // 2. Charger les utilisateurs par défaut
        loadUsers();
        
    } catch(e) {
        window.location.href = '/connexion';
    }
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if(tabId === 'users') loadUsers();
    if(tabId === 'rides') loadRides();
    if(tabId === 'reservations') loadReservations();
}

// === USERS ===
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Chargement...</td></tr>';
    
    try {
        const res = await fetchWithAuth('/admin/users');
        const users = await res.json();
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>#${u.user_id}</td>
                <td>${u.name} ${u.surname}</td>
                <td>${u.email}</td>
                <td><span class="badge-role ${u.role}">${u.role}</span></td>
                <td>
                    ${u.role !== 'admin' ? 
                    `<button class="btn-action btn-delete" onclick="deleteItem('users', ${u.user_id})">Supprimer</button>` : 
                    ''}
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Erreur chargement</td></tr>'; }
}

// === RIDES ===
async function loadRides() {
    const tbody = document.getElementById('ridesTableBody');
    tbody.innerHTML = '<tr><td colspan="6">Chargement...</td></tr>';
    
    try {
        const res = await fetchWithAuth('/admin/rides');
        const rides = await res.json();
        
        tbody.innerHTML = rides.map(r => `
            <tr>
                <td>#${r.ride_id}</td>
                <td>${r.driver ? r.driver.name : 'Inconnu'}</td>
                <td>${r.address_from} <br>-> ${r.address_to}</td>
                <td>${new Date(r.departure).toLocaleDateString()}</td>
                <td>${r.status}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteItem('rides', ${r.ride_id})">Supprimer</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6">Erreur chargement</td></tr>'; }
}

// === RESERVATIONS ===
async function loadReservations() {
    const tbody = document.getElementById('resTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Chargement...</td></tr>';
    
    try {
        const res = await fetchWithAuth('/admin/reservations');
        const items = await res.json();
        
        tbody.innerHTML = items.map(r => `
            <tr>
                <td>#${r.reservation_id}</td>
                <td>${r.ride && r.ride.driver ? r.ride.driver.name : 'User ' + r.passenger_id}</td>
                <td>Trajet #${r.ride_id}</td>
                <td>${r.status}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteItem('reservations', ${r.reservation_id})">Supprimer</button>
                </td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5">Erreur chargement</td></tr>'; }
}

// === GENERIC DELETE ===
async function deleteItem(type, id) {
    if(!confirm("Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.")) return;
    
    try {
        const res = await fetchWithAuth(`/admin/${type}/${id}`, { method: 'DELETE' });
        if(res.ok) {
            if(type === 'users') loadUsers();
            if(type === 'rides') loadRides();
            if(type === 'reservations') loadReservations();
        } else {
            alert("Erreur lors de la suppression");
        }
    } catch(e) { console.error(e); alert("Erreur réseau"); }
}