/*********************************************
 * modalService.js
 * Reusable modal system for displaying errors or any message.
 *********************************************/

// We can store references to a single <dialog> and its elements
let modalElement = null;
let modalTitleEl = null;
let modalMessageEl = null;

/**
 * Initialize the modal references.
 * Call this once, for example on DOMContentLoaded.
 *
 * @param {string} modalId - The id of the <dialog>, e.g. "global-error-modal"
 * @param {string} titleId - The id of the <h3> or heading element
 * @param {string} messageId - The id of the <p> or container for messages
 */
function initModalService({ modalId, titleId, messageId }) {
    modalElement = document.getElementById(modalId);
    modalTitleEl = document.getElementById(titleId);
    modalMessageEl = document.getElementById(messageId);

    if (!modalElement) {
        console.error(`Modal with id="${modalId}" not found.`);
        return;
    }

    // Optionally set up a popstate listener if you want "back" to close
    window.addEventListener("popstate", () => {
        if (modalElement.open) {
            closeModal();
        }
    });
}

/**
 * Show a modal with a given title/message.
 * If you want a specific "error" style, pass a relevant title or use a separate function.
 */
function showModal(title, message) {
    if (!modalElement) {
        console.warn("Modal not initialized. Call initModalService first.");
        return;
    }

    if (modalTitleEl) modalTitleEl.innerText = title || "Message";
    if (modalMessageEl) modalMessageEl.innerText = message || "";

    // push a state so user can press back to close
    history.pushState({ modalOpen: true }, "");

    modalElement.showModal();
}

/**
 * Close the modal, revert history if desired
 */
function closeModal() {
    if (modalElement && modalElement.open) {
        modalElement.close();
    }
    // Optionally revert history
    // history.back() or history.replaceState({}, "");
}

/**
 * Helper: show error modal with i18n-based title + message key.
 *  titleKey, msgKey: the i18n keys for title/message
 *  data: optional interpolation object
 */
function showErrorModal(titleKey, msgKey, data = {}) {
    // If you have a real modal system, adapt it here. 
    // For example:
    const title = i18next.t(titleKey, data);
    const msg   = i18next.t(msgKey, data);

    showModal(title, msg);
}