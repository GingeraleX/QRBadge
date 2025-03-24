function exportCSVFromBackend() {
    // 1) Gather filter inputs from the page if we were the user
    let startDate = document.getElementById("start-date-input")?.value;
    let endDate = document.getElementById("end-date-input")?.value;
    let adminId = localStorage.getItem("locationAdminId");
    let userId = localStorage.getItem("userId");   // or from your UI
    let locationId = null;
    
    if(localStorage.getItem("adminId"))
    {
        startDate = document.getElementById("admin-start-date-input")?.value;
        endDate = document.getElementById("admin-end-date-input")?.value;
        userId = document.getElementById("user-id-input")?.value;
        locationId = document.getElementById("location-id-input")?.value;
        adminId = localStorage.getItem("adminId");
    }
    
    // 2) Build the request body
    const body = {};
    if (adminId) body.adminId = adminId;
    if (userId) body.userId = userId;
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;
    if (locationId) body.locationId = locationId;

    // 3) Fetch from the new endpoint
    fetch("/api/sessions/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
        .then((res) => {
            if (!res.ok) throw new Error("Failed to export data");
            return res.json();
        })
        .then((sessions) => {
            if (!sessions || sessions.length === 0) {
                alert("No sessions found for the given filters.");
                return;
            }
            // 4) Convert to CSV & download
            downloadFullSessionsCSV(sessions);
        })
        .catch((err) => {
            console.error("Export CSV Error:", err);
            alert("Error exporting CSV: " + err.message);
        });
}

/**
 * downloadFullSessionsCSV - Takes the array of session objects from the backend
 * and converts them to a CSV with all relevant details.
 */
function downloadFullSessionsCSV(sessions) {
    // Define the columns you want in the CSV
    const columns = [
        { key: "sessionId",     label: "Session ID" },
        { key: "start_time",    label: "Start Time" },
        { key: "end_time",      label: "End Time" },
        { key: "locationId",    label: "Location ID" },
        { key: "locationName",  label: "Location Name" },
        { key: "userId",        label: "User ID" },
        { key: "displayName",   label: "User Name" },
        { key: "contactNumber", label: "Phone" },
        { key: "duration",      label: "Duration" },
    ];

    // 1) Pre-process each record (for example, formatting dates or computing duration)
    sessions.forEach((s) => {
        // parse & format start_time
        if (s.start_time) {
            const start = new Date(s.start_time);
            // Example: store a nicely formatted version, or replace the raw field:
            s.start_time = start.toLocaleString();
        }

        // parse & format end_time
        if (s.end_time) {
            const end = new Date(s.end_time);
            s.end_time = end.toLocaleString();
            // Optionally compute a duration
            const diffMs = end - new Date(s.start_time);
            if (diffMs > 0) {
                const diffMins = Math.round(diffMs / 60000);
                if (diffMins >= 60) {
                    const hrs = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    s.duration = `${hrs}h ${mins}m`;
                } else {
                    s.duration = `${diffMins}m`;
                }
            } else {
                s.duration = "";
            }
        } else {
            s.end_time = "";
            s.duration = "";
        }
    });

    // 2) Build CSV
    const header = columns.map((col) => escapeCSVValue(col.label)).join(",");

    const rows = sessions.map((item) => {
        return columns.map((col) => {
            const val = item[col.key] == null ? "" : item[col.key];
            return escapeCSVValue(val);
        }).join(",");
    });

    const csvContent = [header, ...rows].join("\n");

    // 3) Download
    const filename = "exported_sessions.csv";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * escapeCSVValue
 * Wraps the value in quotes, doubling up internal quotes.
 */
function escapeCSVValue(value) {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
}