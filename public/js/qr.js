 // We'll store an instance of Html5Qrcode if we go the web route
    let html5QrCode = null;
    function startWebScan() {
        // If already scanning, do nothing
        if (html5QrCode) {
            console.log("Already scanning via html5-qrcode.");
            return;
        }
        
        const readerElem = document.getElementById('reader');
        readerElem.style.display = 'block';  // Show the scanning area
        html5QrCode = new Html5Qrcode("reader");

        // Start the camera. If user has multiple cameras, you can show a camera selection UI
        // or pick a back camera by using `Html5Qrcode.getCameras()`.
        html5QrCode.start(
            { facingMode: "environment" }, // or "user"
            {
                fps: 10,    // frames per second
            },
            qrCodeMessage => {
                
                if(qrCodeMessage === "https://badge.arcanode.io/setup")
                {
                    location.pathname += "/setup";
                }
                else {
                    
                    // Successfully scanned a QR code
                    const locId = parseLocFromScannedText(qrCodeMessage);

                    if (locId) {

                        // rewrite the URL with ?loc=123 so user page can load
                        updateUrlWithLoc(locId);
                        getLocation();

                    } else {
                        alert("No loc= found in QR code");
                    }

                    stopWebScan(); // If you want to stop after one scan
                }
            },
            errorMessage => {
                // console.log("Scanner error:", errorMessage);
            }
        ).catch(err => {
            console.error("Unable to start html5-qrcode scanner.", err);
            alert("Unable to access camera in browser: " + err);
        });
    }

    function stopWebScan() {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode = null;
                const readerElem = document.getElementById('reader');
                readerElem.style.display = 'none';
            }).catch(err => {
                console.warn("Failed to stop html5-qrcode.", err);
            });
        }
    }
    
 function updateUrlWithLoc(locId) {
     // Construct a new URL based on the current location
     const newUrl = new URL(window.location.href);

     // Update (or add) the `loc` search param
     newUrl.searchParams.set('loc', locId);

     // Update the browser’s address bar **without** a reload
     window.history.pushState({}, '', newUrl.toString());
 }
 
function parseLocFromScannedText(text) {
    // Example: if the scanned text is "https://myapp.com?loc=123"
    // or "loc=123"
    const url = new URL(text, "http://dummy"); // parse with fallback
    const locParam = url.searchParams.get("loc");
    return locParam || null;
}