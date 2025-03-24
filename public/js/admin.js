/**
 * adminPage.js
 * Logic for the admin dashboard (admin.html).
 */

/**
 * Instead of alert("Missing adminId or location name."),
 * we do showAdminAlert("admin.errors.missingLocationName");
 */

// =====================
//  Verify Admin
// =====================
function verifyAdmin(contactNumber, deviceId = "") {
    return fetch(`${BASE_API_URL}/admin/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactNumber, deviceId }),
    })
        .then((res) => {
            if (!res.ok) {
                return res.json().then((err) => {
                    throw new Error(err.error || "Admin check failed");
                });
            }
            return res.json();
        })
        .then((data) => {
            if (data.error) {
                throw new Error(data.error);
            }
            // success => data: { message: "Admin recognized", adminId: ... }
            return data;
        })
        .catch((err) => {
            console.error("verifyAdmin error:", err);
            throw err;
        });
}

// =====================
//  Load all admin data
// =====================
function loadAllAdminData() {
    loadPendingApprovals();
    loadUsersList();
    loadActiveSessions();
    loadSessionHistory();
    loadAdminLocations();
    syncAdminSettings();

    // Refresh every 15s
    setInterval(() => {
        loadPendingApprovals();
        loadUsersList();
        loadActiveSessions();
        loadSessionHistory();
        loadAdminLocations();
    }, 15000);
}

// =====================
//  Pending Approvals
// =====================
function loadPendingApprovals() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    fetch(`${BASE_API_URL}/admin/pending-approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    })
        .then((res) => res.json())
        .then((data) => {
            const container = document.getElementById("pending-approvals");
            if (!container) return;
            container.innerHTML = "";

            data.forEach((u) => {
                const row = document.createElement("div");
                row.className = "flex items-center justify-between my-1";
                const approveText = i18next.t("admin.usersPage.approve");
                const rejectText = i18next.t("admin.usersPage.reject");

                row.innerHTML = `
                  <span>${u.contactNumber} (ID: ${u.deviceId || "-"})</span>
                  <div>
                    <button
                      class="btn btn-xs btn-success approve-user-button"
                      onclick="approveUser(${u.userId})"
                    >
                      ${approveText}
                    </button>
                    <button
                      class="btn btn-xs btn-error ml-2"
                      onclick="rejectUser(${u.userId})"
                    >
                      ${rejectText}
                    </button>
                  </div>
                `;
                container.appendChild(row);
            });

            // ======= DISABLE APPROVE IF USER LIMIT REACHED =======
            if (window.adminLimits.approvedUserCount >= window.adminLimits.userLimit) {
                const approveButtons = container.querySelectorAll(".approve-user-button");
                approveButtons.forEach((btn) => {
                    btn.disabled = true;
                    btn.title = i18next.t("admin.errors.userLimitReached");
                });
            }
        })
        .catch((err) => console.error("loadPendingApprovals error:", err));
}

function approveUser(userId) {
    // Client-side check
    if (window.adminLimits.approvedUserCount >= window.adminLimits.userLimit) {
        showErrorModal("Error", "admin.errors.userLimitReached");
        return;
    }
    
    const adminId = localStorage.getItem("adminId");
    fetch(`${BASE_API_URL}/admin/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, userId }),
    })
        .then((res) => res.json())
        .then((data) => {
            // The server might return a generic "message" in English.
            // If you want it fully localized, define a key in your JSON
            // or intercept data.message somehow.
            showModal("Success", data.message);
            loadPendingApprovals();
            loadUsersList();
        });
}

function rejectUser(userId) {
    const adminId = localStorage.getItem("adminId");
    fetch(`${BASE_API_URL}/admin/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, userId }),
    })
        .then((res) => res.json())
        .then((data) => {
            showModal("Success", data.message);
            loadPendingApprovals();
            loadUsersList();
        });
}

// =====================
//  Users List
// =====================
function loadUsersList() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    fetch(`${BASE_API_URL}/users/list-for-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    })
        .then((res) => res.json())
        .then((data) => {
            const container = document.getElementById("users-list");
            if (!container) return;
            container.innerHTML = "";

            const renameText = i18next.t("admin.usersPage.rename");
            const revokeText = i18next.t("admin.usersPage.revoke");
            const noNameText = i18next.t("admin.common.noName");

            // 1) Count how many approved
            const approvedUsers = data.filter((user) => user.status === "approved");
            window.adminLimits.approvedUserCount = approvedUsers.length;

            // 2) Render the approved users
            approvedUsers.forEach((u) => {
                const row = document.createElement("div");
                row.className = "flex items-center justify-between my-1";
                row.innerHTML = `
                    <span>${u.displayName || noNameText} | ${u.contactNumber} |
                          (ID: ${u.deviceId || "-"})
                    </span>
                    <div>
                      <button
                        class="btn btn-xs"
                        onclick="promptUpdateName(${u.userId})"
                      >
                        ${renameText}
                      </button>
                      <button
                        class="btn btn-xs btn-warning ml-2"
                        onclick="revokeUser(${u.userId})"
                      >
                        ${revokeText}
                      </button>
                    </div>
                `;
                container.appendChild(row);
            });
        })
        .catch((err) => console.error("loadUsersList error:", err));
}


function promptUpdateName(userId) {
    const newName = prompt(i18next.t("admin.common.enterDisplayName"));
    if (!newName) return;
    const adminId = localStorage.getItem("adminId");
    fetch(`${BASE_API_URL}/users/update-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, userId, newName }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.error) {
                console.error("Update name error: " + data.error);
            } else {
                showModal("Success", data.message);
            }
            loadUsersList();
        });
}

function revokeUser(userId) {
    const adminId = localStorage.getItem("adminId");
    fetch(`${BASE_API_URL}/users/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, userId }),
    })
        .then((res) => res.json())
        .then((data) => {
            showModal("Success", data.message || "Error", data.error);
            loadUsersList();
            loadPendingApprovals();
        });
}

// =====================
//  Create a New Location
// =====================
function createLocation() {
    // Client-side check
    if (window.adminLimits.locationCount >= window.adminLimits.locationLimit) {
        showErrorModal("Error", "admin.errors.locationLimitReached");
        return;
    }
    
    const adminId = localStorage.getItem("adminId");
    const name = document.getElementById("new-location-name").value.trim();
    if (!adminId || !name) {
        // Instead of alert("Missing adminId or location name."),
        // use an i18n key:
        showErrorModal("Error","admin.errors.missingLocationName");
        return;
    }

    requestGeolocation()
        .then((geo) => {
            return fetch(`${BASE_API_URL}/locations/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adminId: parseInt(adminId, 10),
                    name,
                    latitude: geo.latitude,
                    longitude: geo.longitude,
                }),
            });
        })
        .then((res) => res.json())
        .then((data) => {
            if (data.error) {
                // i18n for error:
                showErrorModal("Error", "admin.errors.createLocationError", { error: data.error });
                return;
            }
            // i18n for success:
            showErrorModal("Success", "admin.messages.locationCreated", { locationId: data.locationId });
            generateQRCode(data.locationId);

        })
        .catch((err) => console.error("createLocation error:", err));
}

function generateQRCode(locationId) {
    const container = document.getElementById("qr-container");
    const section = document.getElementById("qr-section");
    if (!container) return;
    container.innerHTML = "";
    
    section.classList.remove("hidden");
    
    const domain = window.location.origin; // e.g. http://localhost:3000
    const qrText = `${domain}?loc=${locationId}`;

    const qrDiv = document.createElement("div");

    new QRCode(container, {
        text: qrText,
        width: 256,
        height: 256,
    });

    const downloadLink = document.getElementById("downloadLink");
    downloadLink.onclick = function () {
        downloadQrForLocation(locationId);
    };
}

// =====================
//  Active Sessions
// =====================
function loadActiveSessions() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;
    fetch(`${BASE_API_URL}/sessions/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    })
        .then((res) => res.json())
        .then((data) => {
            const container = document.getElementById("active-sessions");
            if (!container) return;
            container.innerHTML = "";

            data.forEach((s) => {
                const start = new Date(s.start_time);
                const row = document.createElement("div");
                row.textContent = `${s.displayName || ""} (${s.contactNumber}) at ${
                    s.locationName
                } - started ${start.toLocaleString()}`;
                container.appendChild(row);
            });
        });
}

// =====================
//  Session History
// =====================
function loadSessionHistory() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    const userId = document.getElementById("user-id-input")?.value || null;
    const locationId = document.getElementById("location-id-input")?.value || null;
    const startDate = document.getElementById("admin-start-date-input")?.value || null;
    const endDate = document.getElementById("admin-end-date-input")?.value || null;

    const body = {
        adminId: parseInt(adminId, 10),
        userId: userId ? parseInt(userId, 10) : null,
        locationId: locationId ? parseInt(locationId, 10) : null,
        startDate: startDate,
        endDate: endDate,
    };

    fetch(`${BASE_API_URL}/sessions/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
        .then((res) => res.json())
        .then((data) => {
            // 1) Add a .duration property to each session
            data.forEach((session) => {
                const start = new Date(session.start_time);
                const end   = new Date(session.end_time);
                const diff  = end - start;
                const diffMins = Math.round(diff / 60000);

                if (diffMins <= 0) {
                    // Could do "—" or "0m"
                    session.duration = "0m";
                } else {
                    const hours   = Math.floor(diffMins / 60);
                    const minutes = diffMins % 60;
                    session.duration = (hours > 0)
                        ? `${hours}h ${minutes}m`
                        : `${minutes}m`;
                }
            });
            // 1) store in adminSessionsCache
            window.adminSessionsCache = data || [];
            // 2) render them
            renderAdminSessions(window.adminSessionsCache);
            
            // const tableBody = document.getElementById("session-history-list");
            // if (!tableBody) return;
            //
            // tableBody.innerHTML = "";
            //
            // if (!Array.isArray(data) || data.length === 0) {
            //     const noDataRow = document.createElement("tr");
            //     const noDataCell = document.createElement("td");
            //     noDataCell.colSpan = 5;
            //     noDataCell.className = "text-center italic";
            //     // i18n for "No results found."
            //     noDataCell.textContent = i18next.t("admin.messages.noResultsFound");
            //     noDataRow.appendChild(noDataCell);
            //     tableBody.appendChild(noDataRow);
            //     return;
            // }
            //
            // // Populate table
            // data.forEach((session) => {
            //     const tr = document.createElement("tr");
            //
            //     // Start Time
            //     const startTimeCell = document.createElement("td");
            //     const start = new Date(session.start_time);
            //     startTimeCell.textContent = start.toLocaleString();
            //     tr.appendChild(startTimeCell);
            //
            //     // End Time
            //     const end = new Date(session.end_time);
            //
            //     // Duration
            //     const diffMinutes = Math.round((end - start) / 60000);
            //     const hours = Math.floor(diffMinutes / 60);
            //     const minutes = diffMinutes % 60;
            //     let durationText = `${diffMinutes}m`;
            //     if (hours > 0) {
            //         durationText = `${hours}h ${minutes}m`;
            //     }
            //     const durationCell = document.createElement("td");
            //     durationCell.textContent = durationText;
            //     tr.appendChild(durationCell);
            //
            //     // User ID
            //     const userIdCell = document.createElement("td");
            //     userIdCell.textContent = session.userId || "-";
            //     tr.appendChild(userIdCell);
            //
            //     // Location
            //     const locationCell = document.createElement("td");
            //     locationCell.textContent = session.locationName || "-";
            //     tr.appendChild(locationCell);
            //
            //     tableBody.appendChild(tr);
            //});
        })
        .catch((err) => {
            console.error("loadSessionHistory error:", err);
        });
}

function renderAdminSessions(sessionArray) {
    const tableBody = document.getElementById("session-history-list");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    // If no data, show a "no results" row
    if (!Array.isArray(sessionArray) || sessionArray.length === 0) {
        const noDataRow = document.createElement("tr");
        const noDataCell = document.createElement("td");
        noDataCell.colSpan = 5;
        noDataCell.className = "text-center italic";
        noDataCell.textContent = i18next.t("admin.messages.noResultsFound");
        noDataRow.appendChild(noDataCell);
        tableBody.appendChild(noDataRow);

        // Clear pagination controls
        renderPaginationControls(0);
        return;
    }

    // 1) Calculate slice indexes
    const { currentPage, rowsPerPage } = window.adminSessionsPagination;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    const paginatedData = sessionArray.slice(startIndex, endIndex);

    // 2) Render the slice
    paginatedData.forEach((session) => {
        const tr = document.createElement("tr");

        // Start Time
        const startTimeCell = document.createElement("td");
        const start = new Date(session.start_time);
        startTimeCell.textContent = start.toLocaleString();
        tr.appendChild(startTimeCell);

        // Duration
        const durationCell = document.createElement("td");
        durationCell.textContent = session.duration;
        tr.appendChild(durationCell);

        // User ID
        const userIdCell = document.createElement("td");
        userIdCell.textContent = session.userId || "-";
        tr.appendChild(userIdCell);

        // Location
        const locationCell = document.createElement("td");
        locationCell.textContent = session.locationName || "-";
        tr.appendChild(locationCell);

        tableBody.appendChild(tr);
    });

    // 3) Render pagination controls
    const totalPages = Math.ceil(sessionArray.length / rowsPerPage);
    renderPaginationControls(totalPages);
}




// =====================
//  Admin Locations
// =====================
function loadAdminLocations() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    fetch(`${BASE_API_URL}/locations/by-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (!Array.isArray(data)) {
                console.error("Unexpected locations data:", data);
                return;
            }
            
            // 1) Store the location count
            window.adminLimits.locationCount = data.length;
            
            // If limit reached, disable the button
            const locationForm = document.getElementById("location-form");
            const locationLabel = document.getElementById("location-label");
            if (locationForm) {
                if (window.adminLimits.locationCount >= window.adminLimits.locationLimit) {
                    locationForm.classList.add("hidden");
                    locationLabel.textContent = i18next.t("admin.errors.locationLimitReached");
                } else {
                    locationForm.classList.remove("hidden");
                    locationLabel.textContent = i18next.t("admin.locationsPage.locationNameLabel");
                }
            }
            
            
            const tableContainer = document.getElementById("admin-locations-list");
            if (!tableContainer) return;

            tableContainer.innerHTML = "";

            if (data.length === 0) {
                // i18n for "No locations found."
                tableContainer.textContent = i18next.t("admin.messages.noLocationsFound");
                return;
            }

            // Create a wrapper with overflow
            const wrapper = document.createElement("div");
            wrapper.className = "overflow-x-auto mt-3";

            // Create the table
            const table = document.createElement("table");
            // Use the same classes from your sessions table, e.g.:
            table.className = "table table-compact table-zebra w-full";


            const thId       = i18next.t("admin.tableHeaders.id");
            const thName     = i18next.t("admin.tableHeaders.name");
            const thCreated  = i18next.t("admin.tableHeaders.createdAt");
            const thMap      = i18next.t("admin.tableHeaders.map");
            const thQr       = i18next.t("admin.tableHeaders.qr");

            const thead = document.createElement("thead");
            thead.innerHTML = `
  <tr>
    <th>${thId}</th>
    <th>${thName}</th>
    <th>${thCreated}</th>
    <th>${thMap}</th>
    <th>${thQr}</th>
  </tr>
`;

            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            data.forEach((loc) => {
                const row = document.createElement("tr");

                // ID
                const tdId = document.createElement("td");
                tdId.textContent = loc.id;

                // Name
                const tdName = document.createElement("td");
                tdName.textContent = loc.name || "";

                // Created At
                const tdCreated = document.createElement("td");
                tdCreated.textContent = loc.created_at || "";

                // Map Button
                const tdMap = document.createElement("td");
                tdMap.innerHTML = `
          <button
            class="btn btn-xs btn-square btn-ghost"
            onclick="openLocationMap(${loc.latitude}, ${loc.longitude})"
            title="View on Map"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
</svg>
          </button>
        `;

                // QR Download button column
                const tdQR = document.createElement("td");
                tdQR.innerHTML = `
          <button
            class="btn btn-xs btn-square btn-ghost"
            onclick="downloadQrForLocation(${loc.id})"
            title="Download QR"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
</svg>
          </button>
        `;

                row.appendChild(tdId);
                row.appendChild(tdName);
                row.appendChild(tdCreated);
                row.appendChild(tdMap);
                row.appendChild(tdQR);

                tbody.appendChild(row);
            });
            
            table.appendChild(tbody);
            wrapper.appendChild(table);
            tableContainer.appendChild(table);
        })
        .catch((err) => {
            console.error("loadAdminLocations error:", err);
        });
}

// =====================
//  Helpers
// =====================
function openLocationMap(latitude, longitude) {
    if (!latitude || !longitude) {
        alert("Invalid coordinates.");
        return;
    }
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;
    window.open(url, "_blank");
}

function downloadQrForLocation(locationId) {
    const domain = window.location.origin;
    const qrText = `${domain}?loc=${locationId}`;

    // Hidden div to render the QR code
    const tempDiv = document.createElement("div");
    tempDiv.style.display = "none";
    document.body.appendChild(tempDiv);

    const qr = new QRCode(tempDiv, {
        text: qrText,
        width: 256,
        height: 256,
        correctLevel: QRCode.CorrectLevel.H
    });

    setTimeout(() => {
        const canvas = tempDiv.querySelector("canvas");
        if (!canvas) {
            console.error("QR code not generated.");
            document.body.removeChild(tempDiv);
            return;
        }
        const imgData = canvas.toDataURL("image/png");

        const link = document.createElement("a");
        link.href = imgData;
        link.download = `location_${locationId}.png`;
        link.click();

        document.body.removeChild(tempDiv);
    }, 300);
}

function doRegister() {
    const deviceId = document.getElementById("register-input").value.trim();
    if (deviceId) {
        localStorage.setItem("device-id", deviceId);
        // We haven't defined a "success" key in the JSON, so just do a quick alert:
        alert(`Device registered with ID: ${deviceId}`);
        window.location.href = window.location.origin;
    } else {
        showErrorModal("Error", "modal.error.message");
    }
}

function updateAdminSettings() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    const enableTimer = document.getElementById("toggle-timer").checked;
    const enableReport = document.getElementById("toggle-report").checked;

    fetch(`${BASE_API_URL}/admin/set-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, enableTimer, enableReport }),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.error) {
                console.error("Settings update failed:", data.error);
            }
        })
        .catch((err) => console.error("Error updating settings:", err));
}

function syncAdminSettings() {
    const adminId = localStorage.getItem("adminId");
    if (!adminId) return;

    fetch(`${BASE_API_URL}/admin/get-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    })
        .then((res) => res.json())
        .then((data) => {
            document.getElementById("toggle-timer").checked = data.enable_timer;
            document.getElementById("toggle-report").checked = data.enable_report;
        })
        .catch((err) => console.error("Error fetching admin settings:", err));
}