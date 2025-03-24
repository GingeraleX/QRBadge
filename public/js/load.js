document.addEventListener("DOMContentLoaded", async () => {
    // Determine which page we’re on
    const path = window.location.pathname;
    // e.g., "/setup", "/setup.html", or "/some-other"

    // Decide which partials to load
    let partialFiles;
    if (path.includes("setup")) {
        partialFiles = [
            "modal.html",
            "setup.html"
        ];
    } else {
        partialFiles = [
            "home.html",
            "user.html",
            "admin.html",
            "modal.html"
        ];
    }

    const partialCache = {};

    // Fetch each partial
    for (const file of partialFiles) {
        try {
            if (path.includes("setup")) {
                const res = await fetch(`../pages/${file}`);
                partialCache[file] = await res.text();
            }
            else
            {
                const res = await fetch(`pages/${file}`);
                partialCache[file] = await res.text();
            }
        } catch (err) {
            console.error(`Failed to load partial ${file}:`, err);
            partialCache[file] = `<p class="text-red-500">Error loading ${file}</p>`;
        }
    }

    // Insert partials into #app container
    const container = document.getElementById("app");
    partialFiles.forEach((file) => {
        container.insertAdjacentHTML("beforeend", partialCache[file]);
    });

    // Initialize modal service
    initModalService({
        modalId: "global-error-modal",
        titleId: "modal-error-title",
        messageId: "modal-error-message",
    });

    // Sync theme
    syncTheme();
    
    // starts the localization
    await initLocalization();
    syncLanguage();

    // Additional logic unique to each route
    if (path.includes("setup")) {
        // Behavior specific to the setup page
        // e.g., ...
    } else {
        // Behavior for main site
        const deviceId = localStorage.getItem("device-id");
        const userId   = localStorage.getItem("userId");
        const adminId  = localStorage.getItem("adminId");
        const contactNumber = localStorage.getItem("contactNumber");

        if (deviceId && adminId) {
            loadAllAdminData();
            document.getElementById("my-admin-phone-display").innerText = contactNumber;

            showAdminUserPage("admin");
            return;
        }
        if (deviceId && userId) {
            getLocation();
            document.getElementById("my-phone-display").innerText = contactNumber;

            showAdminUserPage("user");
            return;
        }

        hideDownloadButtonsIfNative();
        
        // If neither, run phoneInit
        phoneInit();
    }
});
