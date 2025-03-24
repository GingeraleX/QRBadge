

// ========== USER NAV BAR LOGIC ==========
function showUserDashboard() {
    // Toggle pages
    document.getElementById("user-dashboard-page").classList.remove("hidden");
    document.getElementById("user-history-page").classList.add("hidden");
    document.getElementById("user-settings-page").classList.add("hidden");

    // Toggle nav button 'active' states
    document.getElementById("btn-user-dashboard").classList.add("active");
    document.getElementById("btn-user-history").classList.remove("active");
    document.getElementById("btn-user-settings").classList.remove("active");
}

function showUserHistory() {
    hideGoToReportButton();
    
    document.getElementById("user-dashboard-page").classList.add("hidden");
    document.getElementById("user-history-page").classList.remove("hidden");
    document.getElementById("user-settings-page").classList.add("hidden");

    document.getElementById("btn-user-dashboard").classList.remove("active");
    document.getElementById("btn-user-history").classList.add("active");
    document.getElementById("btn-user-settings").classList.remove("active");
    showUserHistoryPage();
}

function showUserSettings() {
    document.getElementById("user-dashboard-page").classList.add("hidden");
    document.getElementById("user-history-page").classList.add("hidden");
    document.getElementById("user-settings-page").classList.remove("hidden");

    document.getElementById("btn-user-dashboard").classList.remove("active");
    document.getElementById("btn-user-history").classList.remove("active");
    document.getElementById("btn-user-settings").classList.add("active");
}

function showAdminUsers() {
    // Show the Users page
    document.getElementById("admin-users-page").classList.remove("hidden");
    // Hide the others
    document.getElementById("admin-sessions-page").classList.add("hidden");
    document.getElementById("admin-locations-page").classList.add("hidden");
    document.getElementById("admin-settings-page").classList.add("hidden");

    // Update nav button states
    document.getElementById("btn-admin-users").classList.add("active");
    document.getElementById("btn-admin-sessions").classList.remove("active");
    document.getElementById("btn-admin-locations").classList.remove("active");
    document.getElementById("btn-admin-settings").classList.remove("active");
}

function showAdminSessions() {
    document.getElementById("admin-users-page").classList.add("hidden");
    document.getElementById("admin-sessions-page").classList.remove("hidden");
    document.getElementById("admin-locations-page").classList.add("hidden");
    document.getElementById("admin-settings-page").classList.add("hidden");

    document.getElementById("btn-admin-users").classList.remove("active");
    document.getElementById("btn-admin-sessions").classList.add("active");
    document.getElementById("btn-admin-locations").classList.remove("active");
    document.getElementById("btn-admin-settings").classList.remove("active");
}

function showAdminLocations() {
    document.getElementById("admin-users-page").classList.add("hidden");
    document.getElementById("admin-sessions-page").classList.add("hidden");
    document.getElementById("admin-locations-page").classList.remove("hidden");
    document.getElementById("admin-settings-page").classList.add("hidden");

    document.getElementById("btn-admin-users").classList.remove("active");
    document.getElementById("btn-admin-sessions").classList.remove("active");
    document.getElementById("btn-admin-locations").classList.add("active");
    document.getElementById("btn-admin-settings").classList.remove("active");
}

function showAdminSettings() {
    document.getElementById("admin-users-page").classList.add("hidden");
    document.getElementById("admin-sessions-page").classList.add("hidden");
    document.getElementById("admin-locations-page").classList.add("hidden");
    document.getElementById("admin-settings-page").classList.remove("hidden");

    document.getElementById("btn-admin-users").classList.remove("active");
    document.getElementById("btn-admin-sessions").classList.remove("active");
    document.getElementById("btn-admin-locations").classList.remove("active");
    document.getElementById("btn-admin-settings").classList.add("active");
}

function showAdminUserPage(userType) {
    document.getElementById("home").classList.add("hidden");

    if (userType === "admin") {
        document.getElementById("admin-section").classList.remove("hidden");
        document.getElementById("admin-btm-nav").classList.remove("hidden");
    } else {
        document.getElementById("user-section").classList.remove("hidden");
        document.getElementById("user-btm-nav").classList.remove("hidden");
    }
}

function hideGoToReportButton() {
    const btnGo    = document.getElementById("btn-goto-report");
    btnGo.classList.add("hidden");
}

function showGoToReportButton() {
    const btnGo    = document.getElementById("btn-goto-report");
    btnGo.classList.remove("hidden");
}