// sort.js

window.userSessionsCache = [];
window.adminSessionsCache = [];

/************************************************
 * 1) USER sorting
 ************************************************/
let currentUserSortColumn = null;
let currentUserSortDirection = "asc";

function sortUserSessionsBy(columnKey) {
    // Toggle direction for user
    if (currentUserSortColumn === columnKey) {
        currentUserSortDirection = (currentUserSortDirection === "asc") ? "desc" : "asc";
    } else {
        currentUserSortColumn = columnKey;
        currentUserSortDirection = "asc";
    }

    userSessionsCache.sort((a, b) => {
        return compareSessions(a, b, columnKey, currentUserSortDirection);
    });

    // Re-render user table
    renderUserSessions(userSessionsCache);

    // Update user table header arrows
    updateUserSortArrows(columnKey, currentUserSortDirection);
}

/************************************************
 * 2) ADMIN sorting
 ************************************************/
let currentAdminSortColumn = null;
let currentAdminSortDirection = "asc";

function sortAdminSessionsBy(columnKey) {
    // Toggle direction
    if (currentAdminSortColumn === columnKey) {
        currentAdminSortDirection = (currentAdminSortDirection === "asc") ? "desc" : "asc";
    } else {
        currentAdminSortColumn = columnKey;
        currentAdminSortDirection = "asc";
    }

    adminSessionsCache.sort((a, b) => {
        return compareSessions(a, b, columnKey, currentAdminSortDirection);
    });

    // Re-render the admin table
    renderAdminSessions(adminSessionsCache);

    // Update the arrow in the admin table headers
    updateAdminSortArrows(columnKey, currentAdminSortDirection);
}

/************************************************
 * 3) Common compare function
 ************************************************/
function compareSessions(a, b, columnKey, direction) {
    let valA = a[columnKey];
    let valB = b[columnKey];

    // If sorting by 'start_time' or 'end_time', parse as Date
    if (columnKey === "start_time" || columnKey === "end_time") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
    }
    // If sorting by 'id' or 'userId' or 'locationId', parse as number
    else if (columnKey === "id" || columnKey === "userId" || columnKey === "locationId") {
        valA = parseInt(valA, 10) || 0;
        valB = parseInt(valB, 10) || 0;
    }
    // If sorting by 'duration', parse it as minutes
    else if (columnKey === "duration") {
        valA = parseDurationToMins(a.duration);
        valB = parseDurationToMins(b.duration);
    }
    // For 'locationName' or other strings, we just do standard string compare

    if (valA < valB) return (direction === "asc" ? -1 : 1);
    if (valA > valB) return (direction === "asc" ? 1 : -1);
    return 0;
}

// Helper to parse "2h 5m" => total minutes
function parseDurationToMins(str) {
    if (!str || str === "—") return 0;
    const hoursMatch = str.match(/(\d+)h/);
    const minsMatch = str.match(/(\d+)m/);
    let totalMins = 0;
    if (hoursMatch) totalMins += parseInt(hoursMatch[1], 10) * 60;
    if (minsMatch)  totalMins += parseInt(minsMatch[1], 10);
    return totalMins;
}

/************************************************
 * 4) Update arrow icons for user vs admin
 ************************************************/
function updateUserSortArrows(columnKey, direction) {
    // 1) find all TH in user sessions table
    const allUserTh = document.querySelectorAll("#user-history-page table thead th");
    // or if you prefer an ID on the table itself:
    // const allUserTh = document.querySelectorAll("#user-sessions-table thead th");

    // 2) remove any existing arrows
    allUserTh.forEach((th) => {
        const existingArrow = th.querySelector(".sort-arrow");
        if (existingArrow) existingArrow.remove();
    });

    // 3) Insert the new arrow in the clicked <th>
    const activeTh = document.querySelector(
        `#user-history-page table thead th[onclick="sortUserSessionsBy('${columnKey}')"]`
    );
    if (!activeTh) return;

    const arrow = document.createElement("span");
    arrow.classList.add("sort-arrow");
    arrow.style.marginLeft = "4px";
    arrow.textContent = direction === "asc" ? "▲" : "▼";
    activeTh.appendChild(arrow);
}


function updateAdminSortArrows(columnKey, direction) {
    // 1) Find all TH in the admin sessions table
    const allAdminTh = document.querySelectorAll("#admin-sessions-page table thead th");
    // or you could do: document.querySelectorAll("#admin-sessions-page .table thead th");

    // 2) Remove any existing arrows
    allAdminTh.forEach((th) => {
        const existingArrow = th.querySelector(".sort-arrow");
        if (existingArrow) existingArrow.remove();
    });

    // 3) Insert an arrow in the active column
    const activeTh = document.querySelector(
        `#admin-sessions-page table thead th[onclick="sortAdminSessionsBy('${columnKey}')"]`
    );
    if (!activeTh) return;

    const arrow = document.createElement("span");
    arrow.classList.add("sort-arrow");
    arrow.style.marginLeft = "4px";
    arrow.textContent = direction === "asc" ? "▲" : "▼";
    activeTh.appendChild(arrow);
}


// Global (or window) object to track pagination state
window.adminSessionsPagination = {
    currentPage: 1,
    rowsPerPage: 5,
};

function renderPaginationControls(totalPages) {
    const controls = document.getElementById("pagination-controls");
    if (!controls) return;

    // Clear old controls
    controls.innerHTML = "";

    // If 0 or 1 page, don't render anything
    if (totalPages <= 1) return;

    const { currentPage } = window.adminSessionsPagination;

    // -- Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-sm";
    prevBtn.textContent = "◄";
    prevBtn.disabled = (currentPage === 1);
    prevBtn.onclick = () => changePage(currentPage - 1);
    controls.appendChild(prevBtn);

    // -- Page Number Window
    // We'll show up to 5 pages: e.g. (3, 4, 5, 6, 7) if currentPage=5
    const maxPagesToShow = 3;
    let startPage = Math.max(currentPage - Math.floor(maxPagesToShow / 2), 1);
    let endPage = startPage + maxPagesToShow - 1;

    // Adjust if endPage goes beyond totalPages
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(endPage - maxPagesToShow + 1, 1);
    }

    // If there's a gap at the beginning, show "1" and "..."
    if (startPage > 1) {
        // Page 1 button
        const firstBtn = document.createElement("button");
        firstBtn.className = "btn btn-sm";
        firstBtn.textContent = "1";
        firstBtn.onclick = () => changePage(1);
        controls.appendChild(firstBtn);

        // "..." indicator
        if (startPage > 2) {
            const dotSpan = document.createElement("span");
            dotSpan.className = "btn btn-sm btn-disabled";
            dotSpan.textContent = "...";
            controls.appendChild(dotSpan);
        }
    }

    // Loop through our visible page range
    for (let p = startPage; p <= endPage; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "btn btn-sm" + (p === currentPage ? " btn-active" : "");
        pageBtn.textContent = String(p);
        pageBtn.onclick = () => changePage(p);
        controls.appendChild(pageBtn);
    }

    // If there's a gap at the end, show "..." and last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotSpan = document.createElement("span");
            dotSpan.className = "btn btn-sm btn-disabled";
            dotSpan.textContent = "...";
            controls.appendChild(dotSpan);
        }

        // Last page button
        const lastBtn = document.createElement("button");
        lastBtn.className = "btn btn-sm";
        lastBtn.textContent = String(totalPages);
        lastBtn.onclick = () => changePage(totalPages);
        controls.appendChild(lastBtn);
    }

    // -- Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-sm";
    nextBtn.textContent = "►";
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.onclick = () => changePage(currentPage + 1);
    controls.appendChild(nextBtn);
}


function changePage(pageNumber) {
    window.adminSessionsPagination.currentPage = pageNumber;
    // Re-render from the global cache
    renderAdminSessions(window.adminSessionsCache);
}

function onRowsPerPageChange() {
    const select = document.getElementById("rows-per-page-select");
    const newValue = parseInt(select.value, 10);

    window.adminSessionsPagination.rowsPerPage = newValue;
    window.adminSessionsPagination.currentPage = 1;

    // Re-render from the global cache
    renderAdminSessions(window.adminSessionsCache);
}
