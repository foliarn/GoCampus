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
    localStorage.removeItem('user_role'); // Nettoyage rôle
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
// Pages réservées Admin
const adminPages = ['/admin/dashboard'];

// Pages accessibles uniquement si NON connecté
const guestOnlyPages = ['/connexion', '/inscription'];

async function checkPageAccess() {
    const currentPath = window.location.pathname;
    
    if (guestOnlyPages.includes(currentPath) && isLoggedIn()) {
        window.location.href = '/';
        return false;
    }

    if (protectedPages.includes(currentPath) && !isLoggedIn()) {
        window.location.href = '/connexion';
        return false;
    }
    
    // Vérification basique admin (la vraie vérif est faite par l'API)
    if (currentPath.startsWith('/admin') && !isLoggedIn()) {
        window.location.href = '/connexion';
        return false;
    }
    
    return true;
}

// ============================================
// MISE À JOUR DE L'INTERFACE
// ============================================

async function updateUI() {
    const logged = isLoggedIn();
    
    // 1. Mettre à jour la navbar
    await updateNavbar(logged);
    
    // 2. Masquer/afficher les éléments selon l'état de connexion
    updateVisibility(logged);
}

async function updateNavbar(logged) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    const loginLink = document.getElementById('loginLink');
    const userMenu = document.getElementById('userMenu');
    const userNameSpan = document.getElementById('userName');
    const adminLink = document.getElementById('adminLink');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logged) {
        // Récupérer les infos utilisateur
        try {
            const res = await fetchWithAuth('/users/me');
            if(res.ok) {
                const user = await res.json();
                
                // Afficher le nom de l'utilisateur
                if (userNameSpan) {
                    userNameSpan.textContent = user.name;
                }
                
                // Afficher/masquer le lien admin
                if (adminLink && user.role === 'admin') {
                    adminLink.style.display = 'block';
                }
                
                // Afficher le menu utilisateur
                if (userMenu) {
                    userMenu.style.display = 'block';
                }
                
                // Masquer le lien connexion
                if (loginLink) {
                    loginLink.style.display = 'none';
                }
            }
        } catch(e) {
            console.error("Erreur récupération utilisateur", e);
        }
    } else {
        // Utilisateur non connecté
        if (userMenu) {
            userMenu.style.display = 'none';
        }
        if (loginLink) {
            loginLink.style.display = 'block';
        }
    }
}

function updateVisibility(logged) {
    const guestElements = document.querySelectorAll('.guest-only');
    guestElements.forEach(el => el.style.display = logged ? 'none' : '');
}

function handleLogout(e) {
    e.preventDefault();
    removeToken();
    window.location.href = '/';
}

// ============================================
// FORMULAIRES (INSCRIPTION / CONNEXION)
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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                alert('Inscription réussie !');
                window.location.href = '/connexion';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Erreur inscription';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Erreur serveur';
            errorDiv.style.display = 'block';
        }
    });
}

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
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                saveToken(data.access_token);
                window.location.href = '/';
            } else {
                const error = await response.json();
                errorDiv.textContent = error.detail || 'Erreur connexion';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Erreur serveur';
            errorDiv.style.display = 'block';
        }
    });
}

// ============================================
// INITIALISATION
// ============================================

// Initialiser le menu déroulant
document.addEventListener('DOMContentLoaded', function() {
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Toggle du menu au clic
    if (userMenuToggle && userMenu) {
        userMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!userMenu.contains(e.target)) {
                userMenu.classList.remove('active');
            }
        });
    }
    
    // Gestion de la déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            removeToken();
            window.location.href = '/';
        });
    }
    
    checkPageAccess();
    updateUI();
});