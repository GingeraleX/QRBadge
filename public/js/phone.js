// Initialize intl-tel-input
let iti = null;
function phoneInit() {
    const input = document.querySelector("#login-phone-input");

    iti = window.intlTelInput(input, {
        // config options:
        // e.g. set initial country, preferred countries, etc.
        initialCountry: "auto",        // or "us"

        // Provide a callback to fetch user’s country code from IP
        geoIpLookup: function (success, failure) {
            // Example: use https://ipapi.co/json or any geolocation service
            fetch("https://ipapi.co/json")
                .then((res) => res.json())
                .then((data) => {
                    // data.country_code is e.g. "US"
                    success(data.country_code);
                })
                .catch(() => {
                    failure();
                });
        },

        preferredCountries: ["it", "gb", "fr", "de"],
        separateDialCode: true,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js", // for formatting
    });
}
function sanitizeContactNumber(contact) {
    if (!contact) {
        showErrorModal("Warning","Please enter a phone number.");
        return null;
    }
    // Remove non-digits
    const cleaned = contact.replace(/\D/g, "").trim();
    // Basic check: 7 to 15 digits
    if (!/^\d{9,17}$/.test(cleaned)) {
        showErrorModal("Warning", "Invalid phone number format (7-15 digits).");
        return null;
    }
    return cleaned;
}

function validatePhone() {
    const fullNumber = iti.getNumber();
    sanitizeContactNumber(fullNumber);
}


// ========== EXAMPLE USER METHODS ==========
function updatePhoneNumber() {
    const newNum = document.getElementById("settings-phone-input").value.trim();
    if (!newNum) {
        alert("Enter a phone number");
        return;
    }
    console.log("Update phone to:", newNum);
    // Here you’d call your userPage.js function to update phone in DB
}
