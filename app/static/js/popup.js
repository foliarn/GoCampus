// ============================================
// CUSTOM POPUP SYSTEM
// Replaces browser alert() and confirm() dialogs
// ============================================

(function() {
    // Create popup container once on load
    const popupHTML = `
        <div id="customPopup" class="popup-overlay">
            <div class="popup-box">
                <div class="popup-header">
                    <div class="popup-icon" id="popupIcon"></div>
                    <h3 class="popup-title" id="popupTitle"></h3>
                </div>
                <div class="popup-body">
                    <p class="popup-message" id="popupMessage"></p>
                </div>
                <div class="popup-buttons" id="popupButtons"></div>
            </div>
        </div>
    `;

    document.addEventListener('DOMContentLoaded', function() {
        document.body.insertAdjacentHTML('beforeend', popupHTML);
    });

    // Icon mappings
    const icons = {
        success: '&#10003;',
        error: '&#10007;',
        warning: '&#9888;',
        info: '&#8505;'
    };

    /**
     * Show a popup message (replacement for alert())
     * @param {string} message - The message to display
     * @param {Object} options - Optional configuration
     * @param {string} options.title - Popup title (default: based on type)
     * @param {string} options.type - 'success', 'error', 'warning', 'info' (default: 'info')
     * @param {string} options.buttonText - Text for OK button (default: 'OK')
     * @returns {Promise} - Resolves when popup is closed
     */
    window.showPopup = function(message, options = {}) {
        return new Promise((resolve) => {
            const popup = document.getElementById('customPopup');
            const iconEl = document.getElementById('popupIcon');
            const titleEl = document.getElementById('popupTitle');
            const messageEl = document.getElementById('popupMessage');
            const buttonsEl = document.getElementById('popupButtons');

            const type = options.type || 'info';
            const defaultTitles = {
                success: 'Succès',
                error: 'Erreur',
                warning: 'Attention',
                info: 'Information'
            };

            const title = options.title || defaultTitles[type];
            const buttonText = options.buttonText || 'OK';

            iconEl.innerHTML = icons[type];
            iconEl.className = 'popup-icon ' + type;
            titleEl.textContent = title;
            messageEl.textContent = message;

            buttonsEl.innerHTML = `
                <button class="popup-btn popup-btn-confirm" id="popupOkBtn">${buttonText}</button>
            `;

            popup.classList.add('show');

            const okBtn = document.getElementById('popupOkBtn');

            const closePopup = () => {
                popup.classList.remove('show');
                resolve();
            };

            okBtn.addEventListener('click', closePopup, { once: true });

            // Close on overlay click
            popup.addEventListener('click', function(e) {
                if (e.target === popup) {
                    closePopup();
                }
            }, { once: true });
        });
    };

    /**
     * Show a confirmation popup (replacement for confirm())
     * @param {string} message - The message to display
     * @param {Object} options - Optional configuration
     * @param {string} options.title - Popup title (default: 'Confirmation')
     * @param {string} options.type - 'warning', 'info' (default: 'warning')
     * @param {string} options.confirmText - Text for confirm button (default: 'Confirmer')
     * @param {string} options.cancelText - Text for cancel button (default: 'Annuler')
     * @param {boolean} options.danger - Use red color for confirm button (default: false)
     * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
     */
    window.showConfirm = function(message, options = {}) {
        return new Promise((resolve) => {
            const popup = document.getElementById('customPopup');
            const iconEl = document.getElementById('popupIcon');
            const titleEl = document.getElementById('popupTitle');
            const messageEl = document.getElementById('popupMessage');
            const buttonsEl = document.getElementById('popupButtons');

            const type = options.type || 'warning';
            const title = options.title || 'Confirmation';
            const confirmText = options.confirmText || 'Confirmer';
            const cancelText = options.cancelText || 'Annuler';
            const danger = options.danger || false;

            iconEl.innerHTML = icons[type];
            iconEl.className = 'popup-icon ' + type;
            titleEl.textContent = title;
            messageEl.textContent = message;

            buttonsEl.innerHTML = `
                <button class="popup-btn popup-btn-cancel" id="popupCancelBtn">${cancelText}</button>
                <button class="popup-btn popup-btn-confirm ${danger ? 'danger' : ''}" id="popupConfirmBtn">${confirmText}</button>
            `;

            popup.classList.add('show');

            const confirmBtn = document.getElementById('popupConfirmBtn');
            const cancelBtn = document.getElementById('popupCancelBtn');

            let resolved = false;

            const closePopup = (result) => {
                if (resolved) return;
                resolved = true;
                popup.classList.remove('show');
                resolve(result);
            };

            confirmBtn.addEventListener('click', () => closePopup(true), { once: true });
            cancelBtn.addEventListener('click', () => closePopup(false), { once: true });

            // Close on overlay click (cancel)
            popup.addEventListener('click', function(e) {
                if (e.target === popup) {
                    closePopup(false);
                }
            }, { once: true });
        });
    };
})();
