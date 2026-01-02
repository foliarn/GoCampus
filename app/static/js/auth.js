// ============================================
// GESTION DU TOKEN JWT
// ============================================

function saveToken(token) {
    localStorage.setItem('access_token', token);
}

function getToken() {
    return localStorage.getItem('access_token');
}

function removeToken() {
    localStorage.removeItem('access_token');
}

function isLoggedIn() {
    return getToken() !== null;
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    
    return fetch(url, options);
}

// ============================================
// PROTECTION DES PAGES
// ============================================

// Pages qui nécessitent d'être connecté
const protectedPages = ['/reservations', '/annonces', '/proposer'];

// Pages accessibles uniquement si NON connecté
const guestOnlyPages = ['/connexion', '/inscription'];

function checkPageAccess() {
    const currentPath = window.location.pathname;
    
    if (protectedPages.includes(currentPath) && !isLoggedIn()) {
        // Rediriger vers la connexion si non connecté
        window.location.href = '/connexion';
        return false;
    }
    
    if (guestOnlyPages.includes(currentPath) && isLoggedIn()) {
        // Rediriger vers l'accueil si déjà connecté
        window.location.href = '/';
        return false;
    }
    
    return true;
}

// ============================================
// MISE À JOUR DE L'INTERFACE
// ============================================

function updateUI() {
    const logged = isLoggedIn();
    
    // 1. Mettre à jour la navbar
    updateNavbar(logged);
    
    // 2. Masquer/afficher les éléments selon l'état de connexion
    updateVisibility(logged);
}

function updateNavbar(logged) {
    const navLinks = document.querySelector('.nav-links');
    
    if (!navLinks) return;
    
    // Trouver le lien Connexion
    const connexionLink = navLinks.querySelector('a[href="/connexion"]');
    
    if (logged && connexionLink) {
        // Remplacer par Déconnexion
        connexionLink.textContent = 'Déconnexion';
        connexionLink.href = '#';
        connexionLink.classList.remove('active');
        connexionLink.addEventListener('click', handleLogout);
    }
    
    // Si déconnecté et qu'on a un bouton déconnexion, le remettre en Connexion
    const logoutLink = navLinks.querySelector('a[href="#"]');
    if (!logged && logoutLink && logoutLink.textContent === 'Déconnexion') {
        logoutLink.textContent = 'Connexion';
        logoutLink.href = '/connexion';
        logoutLink.removeEventListener('click', handleLogout);
    }
}

function updateVisibility(logged) {
    // Éléments visibles uniquement si NON connecté
    const guestElements = document.querySelectorAll('.guest-only');
    guestElements.forEach(el => {
        el.style.display = logged ? 'none' : '';
    });
    
    // Éléments visibles uniquement si connecté
    const authElements = document.querySelectorAll('.auth-only');
    authElements.forEach(el => {
        el.style.display = logged ? '' : 'none';
    });
}

function handleLogout(e) {
    e.preventDefault();
    removeToken();
    window.location.href = '/';
}

// ============================================
// FORMULAIRE D'INSCRIPTION
// ============================================

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
        
        const data = {
            name: document.getElementById('name').value,
            surname: document.getElementById('surname').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            phone_number: document.getElementById('phone').value,
            address: null,
            role: "normal"
        };
        
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
                window.location.href = '/connexion';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Erreur lors de l\'inscription';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Erreur de connexion au serveur';
            errorDiv.style.display = 'block';
        }
    });
}

// ============================================
// FORMULAIRE DE CONNEXION
// ============================================

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
        
        const formData = new URLSearchParams();
        formData.append('username', document.getElementById('email').value);
        formData.append('password', document.getElementById('password').value);
        
        try {
            const response = await fetch('/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                saveToken(data.access_token);
                window.location.href = '/';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Email ou mot de passe incorrect';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Erreur de connexion au serveur';
            errorDiv.style.display = 'block';
        }
    });
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier l'accès à la page
    if (checkPageAccess()) {
        // Mettre à jour l'interface
        updateUI();
    }
});