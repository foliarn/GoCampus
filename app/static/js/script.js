// JS gere affichage / masquage mot de passe
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');

togglePassword.addEventListener('click', function () {
    // Vérifie le type actuel et l'inverse
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Change l'icône en fonction du type
    this.style.opacity = type === 'text' ? '0.6' : '1';
});