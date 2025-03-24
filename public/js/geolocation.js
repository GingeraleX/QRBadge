// geolocation.js

// Import or ensure you have access to i18next (depending on your setup):
// If i18next is globally available or injected, you may not need an import.
// import i18next from 'i18next';

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandaloneMode() {
    return (
        window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches
    );
}

function requestGeolocation(retry = false) {
    const getCurrentPositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000, // 15s geolocation timeout
        maximumAge: 0,
    };

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        // Use i18next for user-facing messages:
        alert(i18next.t("geo.notSupported"));
        return Promise.reject("No geolocation support");
    }

    return new Promise(async (resolve, reject) => {
        // Check cached location (if < 60s old)
        const cached = JSON.parse(localStorage.getItem("geoLocation"));
        const lastUpdated = parseInt(localStorage.getItem("geoLastUpdated"), 10) || 0;
        const now = Date.now();

        if (cached && now - lastUpdated < 60 * 1000) {
            console.log("[Geolocation] Using cached location:", cached);
            return resolve(cached);
        }

        // Attempt to check permission via Permissions API
        let permissionState = null;
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const result = await navigator.permissions.query({ name: "geolocation" });
                permissionState = result.state; // 'granted', 'prompt', or 'denied'
                console.log("[Geolocation] permission state:", permissionState);
            } catch (err) {
                console.warn("[Geolocation] Permissions API query failed or not supported:", err);
            }
        }

        // If explicitly denied, short-circuit with user guidance
        if (permissionState === "denied") {
            userGuidanceForDenied();
            return reject("User previously denied geolocation");
        }

        // Prepare fallback timer in case iOS never responds
        let timer = null;
        const customTimeoutMs = 20000; // 20s fallback

        const onSuccess = (position) => {
            clearTimeout(timer);

            if (!position.coords) {
                // i18next translation
                alert(i18next.t("geo.noCoordsError"));
                return reject("No coords");
            }

            const geoData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            };
            localStorage.setItem("geoLocation", JSON.stringify(geoData));
            localStorage.setItem("geoLastUpdated", now.toString());

            console.log("[Geolocation] Success:", geoData);
            resolve(geoData);
        };

        const onError = (error) => {
            clearTimeout(timer);
            console.error("[Geolocation] Error callback:", error);

            // If it's the first time, do one retry
            if (!retry) {
                console.log("[Geolocation] Will retry in 5s...");
                setTimeout(() => {
                    requestGeolocation(true).then(resolve).catch(reject);
                }, 5000);
            } else {
                // If second failure, inform user
                if (permissionState === "prompt" || permissionState === null) {
                    userGuidanceForPromptIssue();
                }
                reject("Geolocation failed after retry");
            }
        };

        // Fallback timer for iOS bug
        timer = setTimeout(() => {
            console.warn("[Geolocation] Fallback timer fired - likely iOS Safari bug");
            userGuidanceForPromptIssue();
            reject("Geolocation request timed out/fell into iOS Safari bug");
        }, customTimeoutMs);

        console.log("[Geolocation] Calling getCurrentPosition...");
        navigator.geolocation.getCurrentPosition(onSuccess, onError, getCurrentPositionOptions);
    });
}

/**
 * Called if user or iOS explicitly denied location (Permissions API = 'denied').
 */
function userGuidanceForDenied() {
    const msg = i18next.t("geo.deniedMessage", {
        // If you want to pass dynamic info or placeholders, do so here:
        // e.g. pwaName: "My PWA"
    });

    alert(msg);
}

/**
 * Called if iOS Safari never showed the prompt or the permission state remains "prompt"
 * but getCurrentPosition() just hangs.
 */
function userGuidanceForPromptIssue() {
    let standaloneMsg = "";

    if (isIOS() && isStandaloneMode()) {
        // Extra message for iOS in PWA
        standaloneMsg = i18next.t("geo.pwaStandaloneMsg");
    }

    // Main guidance
    const msg = i18next.t("geo.promptIssueMsg", { standaloneMsg });
    alert(msg);
}
