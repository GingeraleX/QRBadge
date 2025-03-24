/*******************************************
 * userPage.js
 * Logic for the user-facing page (index.html).
 *******************************************/

let sessionStartTime = null;
let sessionTimerInterval = null;
let globalLocationId = null;

/*******************************************
 * 1) Get location from URL & fetch details
 *******************************************/
function getLocation() {
  // Parse ?loc=123
  const urlParams = new URLSearchParams(window.location.search);
  const locParam = urlParams.get("loc");
  if (!locParam) {
    showErrorModal("modal.error.title", "user.errors.noLocationProvided");
    startWebScan();
    return;
  }
  globalLocationId = parseInt(locParam, 10);

  // Fetch location info
  fetch(`${BASE_API_URL}/locations/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationId: globalLocationId }),
  })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // For error messages from server, we can just show them directly or have another i18n key
          showErrorModal("modal.error.title", "modal.error.message", { err: data.error });
        } else {
          
          document.getElementById("location-name-display").innerText = data.name;
          localStorage.setItem("locationAdminId", data.adminId);
        }
        checkUserApproval();
        checkAdminSettings();
        checkSessionStatus();
      })
      .catch((err) => {
        console.error("fetchLocationInfo error:", err);
        setStatusMessage("user.errors.locationFetchError");
      });
}

/*******************************************
 * 2) Check user approval
 *******************************************/
function checkUserApproval() {
  const contactNumber = localStorage.getItem("contactNumber");
  const adminId = localStorage.getItem("locationAdminId");
  let deviceId = localStorage.getItem("device-id");

  if (!adminId) {
    showErrorModal("modal.error.title", "user.errors.invalidLocationProvided");
    setStatusMessage("user.errors.provideValidLocation");
    return;
  }
  if (!contactNumber) {
    showErrorModal("modal.error.title", "user.errors.invalidContactNumber");
    setStatusMessage("user.errors.provideValidContact");
    return;
  }
  
  // If no deviceId, generate a random one
  if (!deviceId) {
    deviceId = generateRandomHexString();
    localStorage.setItem("device-id", deviceId);
  }

  fetch(`${BASE_API_URL}/users/check-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactNumber, adminId, deviceId }),
  })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // show the server error
          setStatusMessage("modal.error.message", { err: data.error });
          return;
        }
        if (data.status === "approved") {
          // "Approved! Ready to start a session." 
          // You could add a key for that. For brevity, let's just do direct text, or define a key like "user.sessions.readyToStart"
          setStatusMessage("user.status.approved");
          // Or do: statusEl.innerText = "✅ " + i18next.t("user.sessions.approvedMessage");

          localStorage.setItem("userId", data.userId);
          document.getElementById("check-in-section").style.display = "flex";
          document.getElementById("btn-user-history").classList.remove("disabled");
          document.getElementById("location").classList.remove("hidden");
        } else if (data.status === "pending") {
          // "⏳ Approval pending. Please wait."
          // We'll just reuse user.dashboard.approvalPending if you have it, or define your own key
          setStatusMessage("user.status.pending");
          // Then poll again
          setTimeout(() => {
            if(data.status !== "approved")
            {
              checkUserApproval();
            }
            }, 5000);
        } else if (data.status === "rejected" || data.status === "revoked") {
          // e.g. "❌ rejected - banned until ???"
          // We can do interpolation:
          setStatusMessage("user.status.rejected", {status: data.status, date: data.bannedUntil});
        } else {
          // No known status => request approval
          requestApproval();
          setTimeout(() => {
            if(data.status !== "approved")
            {
              getLocation();
            }
          }, 5000);
        }
      })
      .catch((err) => {
        console.error("checkUserApproval error:", err);
      });
}

/*******************************************
 * 3) Request user approval
 *******************************************/
function requestApproval() {
  const contactNumber = localStorage.getItem("contactNumber");
  const adminId = localStorage.getItem("locationAdminId");
  let deviceId = localStorage.getItem("device-id");

  if (!adminId) {
    showErrorModal("modal.error.title", "user.errors.invalidLocationProvided");
    setStatusMessage("user.errors.provideValidLocation");
    return;
  }
  if (!contactNumber) {
    showErrorModal("modal.error.title", "user.errors.invalidContactNumber");
    setStatusMessage("user.errors.provideValidContact");
    return;
  }
  if (!deviceId) {
    deviceId = generateRandomHexString();
    localStorage.setItem("device-id", deviceId);
  }

  fetch(`${BASE_API_URL}/users/request-approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactNumber,
      adminId,
      displayName: "",
      deviceId,
    }),
  })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // "Request Approval Error: " + data.error
          setStatusMessage("user.errors.requestApprovalError", { err: data.error });
        } else {
          document.getElementById("status").innerText = data.message;
        }
      })
      .catch((err) => {
        console.error("requestApproval error:", err);
      });
}

/*******************************************
 * 4) Start session
 *******************************************/
function startSession() {
  const statusEl = document.getElementById("status");
  if (!localStorage.getItem("contactNumber") || !globalLocationId) {
    statusEl.innerText = "No contactNumber or locationId stored.";
    return;
  }
  
  setStatusMessage("geo.loading");

  requestGeolocation()
      .then((geo) => {
        return fetch(`${BASE_API_URL}/sessions/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactNumber: localStorage.getItem("contactNumber"),
            locationId: globalLocationId,
            latitude: geo.latitude,
            longitude: geo.longitude,
          }),
        });
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatusMessage("user.errors.startSessionError", { err: data.error });
          return;
        }
        document.querySelector("button[onclick='startSession()']").disabled = true;
        document.querySelector("button[onclick='stopSession()']").disabled = false;

        // Record the start time
        sessionStartTime = Date.now();
        localStorage.setItem("sessionStartTime", sessionStartTime.toString());

        // Show the countdown
        document.getElementById("session-timer-container").classList.remove("hidden");

        // Start ticking
        updateSessionTimer();

        // "Session started!"
        setStatusMessage("user.sessions.sessionStarted");
      })
      .catch((err) => console.error("startSession error:", err));
}

/*******************************************
 * 5) Stop session
 *******************************************/
function stopSession() {
  clearInterval(sessionTimerInterval);
  if (!localStorage.getItem("contactNumber") || !globalLocationId) {
    setStatusMessage("user.errors.provideValidContact");
    return;
  }
  
  setStatusMessage("geo.loading");

  requestGeolocation()
      .then((geo) => {
        return fetch(`${BASE_API_URL}/sessions/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactNumber: localStorage.getItem("contactNumber"),
            locationId: globalLocationId,
            latitude: geo.latitude,
            longitude: geo.longitude,
          }),
        });
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatusMessage("user.errors.stopSessionError", { err: data.error });
          return;
        }
        document.querySelector("button[onclick='stopSession()']").disabled = true;
        document.querySelector("button[onclick='startSession()']").disabled = false;
        localStorage.removeItem("sessionStartTime");
        sessionStartTime = null;

        // Hide the countdown
        document.getElementById("session-timer-container").classList.add("hidden");

        showGoToReportButton();
        // "Session stopped! Duration: X mins"
        setStatusMessage("user.sessions.sessionStopped", { duration: data.duration });
      })
      .catch((err) => console.error("stopSession error:", err));
}

/*******************************************
 * 6) Check if a session is active
 *******************************************/
function checkSessionStatus() {
  const contactNumber = localStorage.getItem("contactNumber");
  if (!contactNumber) return;

  fetch(`${BASE_API_URL}/sessions/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contactNumber }),
  })
      .then((res) => res.json())
      .then((data) => {
        if (data.active) {
          setStatusMessage("user.sessions.sessionRunning");
          sessionStartTime = new Date(data.start_time).getTime();
          localStorage.setItem("sessionStartTime", sessionStartTime.toString());

          document.querySelector("button[onclick='startSession()']").disabled = true;
          document.querySelector("button[onclick='stopSession()']").disabled = false;

          document
              .getElementById("session-timer-container")
              .classList.remove("hidden");
          
          hideGoToReportButton();
          updateSessionTimer();
        } else {
          document.querySelector("button[onclick='startSession()']").disabled = false;
          document.querySelector("button[onclick='stopSession()']").disabled = true;

          document
              .getElementById("session-timer-container")
              .classList.add("hidden");

          localStorage.removeItem("sessionStartTime");
          sessionStartTime = null;
          
          hideGoToReportButton();
        }
      })
      .catch((err) => console.error("checkSessionStatus error:", err));
}

/*******************************************
 * 7) Update Session Timer
 *******************************************/
function updateSessionTimer() {
  if (!sessionStartTime) return;

  const hoursEl   = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");

  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
  }

  sessionTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const hours   = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    hoursEl.style.setProperty("--value",   String(hours).padStart(2, "0"));
    minutesEl.style.setProperty("--value", String(minutes).padStart(2, "0"));
    secondsEl.style.setProperty("--value", String(seconds).padStart(2, "0"));
  }, 1000);
}

/*******************************************
 * 8) Show user history page
 *******************************************/
function showUserHistoryPage() {
  // Reveal the "user-history-page"
  document.getElementById("user-history-page").classList.remove("hidden");
  loadUserSessionHistory();
}

/*******************************************
 * 9) Load session history
 *******************************************/
function loadUserSessionHistory() {
  const contactNumber = localStorage.getItem("contactNumber");
  if (!contactNumber) {
    console.error("No contactNumber found in localStorage!");
    return;
  }

  const startDate = document.getElementById("start-date-input").value;
  const endDate   = document.getElementById("end-date-input").value;

  const body = { contactNumber };
  if (startDate) body.startDate = startDate;
  if (endDate)   body.endDate   = endDate;

  fetch(`${BASE_API_URL}/sessions/user-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to get user history");
        return res.json();
      })
      .then((sessions) => {
        const tbody = document.getElementById("user-session-history-list");
        tbody.innerHTML = "";

        if (!sessions || sessions.length === 0) {
          const noDataRow = document.createElement("tr");
          const noDataCell = document.createElement("td");
          noDataCell.colSpan = 5;
          noDataCell.className = "text-center italic";
          noDataCell.textContent = i18next.t("admin.messages.noResultsFound");
          noDataRow.appendChild(noDataCell);
          tbody.appendChild(noDataRow);
        }

        // For each session, calculate duration, fetch location, etc.
        const sessionFetches = sessions.map((s) => {
          const start = new Date(s.start_time);
          const end   = new Date(s.end_time);
          const diff  = end - start;
          const mins  = Math.round(diff / 60000);

          s.duration  = (diff > 0)
              ? (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`)
              : "—";

          // fetch location info if needed
          return fetch(`${BASE_API_URL}/locations/info`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationId: s.locationId }),
          })
              .then((res) => res.json())
              .then((locData) => {
                s.locationName = locData.name || `Location #${s.locationId}`;
                return s;
              })
              .catch((err) => {
                console.error("fetchLocationInfo error:", err);
                s.locationName = `Unknown (ID: ${s.locationId})`;
                return s;
              });
        });

        return Promise.all(sessionFetches);
      })
      .then((completedSessions) => {
        if (!completedSessions) return; // short-circuited above
        window.userSessionsCache = completedSessions;
        renderUserSessions(completedSessions);
        updateUserStats(completedSessions);
      })
      .catch((err) => {
        console.warn(err.message);
      });
}

/*******************************************
 * 10) Render session data
 *******************************************/
function renderUserSessions(sessionArray) {
  const tbody = document.getElementById("user-session-history-list");
  tbody.innerHTML = "";

  if (!sessionArray || sessionArray.length === 0) {
    const noDataRow = document.createElement("tr");
    const noDataCell = document.createElement("td");
    noDataCell.colSpan = 5;
    noDataCell.className = "text-center italic";
    noDataCell.textContent = i18next.t("admin.messages.noResultsFound");
    noDataRow.appendChild(noDataCell);
    tbody.appendChild(noDataRow);
    return;
  }

  sessionArray.forEach((s) => {
    const dateTime = new Date(s.start_time).toLocaleString();

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dateTime}</td>
      <td>${s.duration}</td>
      <td>${s.locationName}</td>
    `;
    tbody.appendChild(tr);
  });
}


function updateUserStats(sessionArray) {
  if (!Array.isArray(sessionArray) || sessionArray.length === 0) {
    // If there's no session or array is empty
    document.getElementById("stats-locations-visited").textContent = "0";
    document.getElementById("stats-total-hours").textContent = "0";
    document.getElementById("stats-total-checkins").textContent = "0";
    return;
  }

  // 1) Total Check-Ins = the number of sessions
  const totalCheckIns = sessionArray.length;

  // 2) Total Hours in Sessions
  //    - parse each s.duration (like "2h 5m") -> total minutes -> sum -> convert to hours
  //    - or you might use the raw start/end times again
  let totalMinutes = 0;
  sessionArray.forEach((s) => {
    const mins = parseDurationToMins(s.duration); // your existing helper
    totalMinutes += mins;
  });
  // convert totalMinutes to hours, e.g. 137 => 2.28 hours
  const totalHours = (totalMinutes / 60).toFixed(1);

  // 3) Total Locations Visited
  //    - gather unique locationIds
  const uniqueLocationIds = new Set();
  sessionArray.forEach((s) => {
    if (s.locationId) {
      uniqueLocationIds.add(s.locationId);
    }
  });
  const totalLocations = uniqueLocationIds.size;

  // Now update the DOM
  document.getElementById("stats-locations-visited").textContent = String(totalLocations);
  document.getElementById("stats-total-hours").textContent = String(totalHours);
  document.getElementById("stats-total-checkins").textContent = String(totalCheckIns);
}

function checkAdminSettings() {
  const adminId = localStorage.getItem("locationAdminId");
  if (!adminId) return;

  fetch(`${BASE_API_URL}/admin/get-settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId }),
  })
      .then((res) => res.json())
      .then((data) => {
        if (!data.enable_timer) {
          document.getElementById("session-timer-container").style.display = "none";
        }
        if (!data.enable_report) {
          document.getElementById("btn-user-history").classList.add("hidden");
          document.getElementById("btn-goto-report").style.display = "none";
        }
      })
      .catch((err) => console.error("Error fetching admin settings:", err));
}
