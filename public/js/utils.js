/**
 * commonUtils.js
 * Shared front-end utility functions.
 */

// Adjust to your server's address:
//const BASE_API_URL = "https://localhost:3000/api";
const BASE_API_URL = "https://badge.arcanode.io/api";

// At the top or somewhere globally
window.adminLimits = {
    approvedUserCount: 0,
    userLimit: 10,
    locationCount: 0,
    locationLimit: 50
};

// Example doLogin() function: read full phone value
async function doLogin() {
    const fullNumber = iti.getNumber();
    const sanitized = sanitizeContactNumber(fullNumber);
    if (!sanitized) return;
    
    localStorage.setItem("contactNumber", sanitized);
    const deviceId = localStorage.getItem("device-id");
    let userType = "";
    try {
        const data = await verifyAdmin(sanitized, deviceId);

        console.log("Admin verified:", data);
        userType = "admin";
        localStorage.setItem("adminId", data.adminId);
        
        document.getElementById("my-admin-phone-display").innerText = sanitized;

        loadAllAdminData()
    } catch (err) {
        console.warn("Not admin. Assuming user role:", err.message);
        userType = "user";
        
        document.getElementById("my-phone-display").innerText = sanitized;

        getLocation();
    }

    showAdminUserPage(userType);
}

function generateRandomHexString(size = 4) {
    const randomValues = new Uint8Array(size);
    window.crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Helper: sets the #status element to a localized string.
 *  key: the i18n key, e.g. "user.errors.invalidContactNumber"
 *  data: optional object for interpolation, e.g. { err: "..." }
 */
function setStatusMessage(key, data = {}) {
    const statusEl = document.getElementById("status");
    statusEl.innerText = i18next.t(key, data);
}

function hideDownloadButtonsIfNative() {
    // Check if the "Capacitor" global is available
    // and if the "isNativePlatform()" function says true
    if (
        typeof window.Capacitor !== 'undefined' &&
        typeof window.Capacitor.isNativePlatform === 'function' &&
        window.Capacitor.isNativePlatform()
    ) {
        // This means we're in a native Capacitor environment
        document.getElementById('download-buttons').classList.add('hidden');
    } else {
        // Probably in a plain web/PWA environment
    }
}