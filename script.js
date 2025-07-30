// Asegúrate de que este script se incluya una sola vez
function loadHtml5QrcodeLibrary(callback) {
    if (typeof Html5Qrcode !== "undefined") {
        callback();
        return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.onload = callback;
    document.head.appendChild(script);
}

// Función para iniciar el escaneo
function startQrScanner() {
    loadHtml5QrcodeLibrary(() => {
        // Si no existe el contenedor, lo crea
        let qrContainer = document.getElementById("qr-reader");
        if (!qrContainer) {
            qrContainer = document.createElement("div");
            qrContainer.id = "qr-reader";
            qrContainer.style.width = "300px";
            qrContainer.style.margin = "auto";
            document.body.appendChild(qrContainer);
        }

        const html5QrCode = new Html5Qrcode("qr-reader");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log(`QR detectado: ${decodedText}`);
            alert(`QR detectado: ${decodedText}`);
            html5QrCode.stop().then(() => {
                console.log("Escaneo detenido");
            }).catch(err => {
                console.error("Error al detener escaneo:", err);
            });
        };

        const config = { fps: 10, qrbox: 250 };

        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                const cameraId = devices[0].id;
                html5QrCode.start(
                    cameraId,
                    config,
                    qrCodeSuccessCallback
                ).catch(err => {
                    console.error("Error al iniciar cámara:", err);
                    alert("No se pudo acceder a la cámara.");
                });
            } else {
                alert("No se detectaron cámaras.");
            }
        }).catch(err => {
            console.error("Error al obtener cámaras:", err);
            alert("No se pudieron obtener las cámaras.");
        });
    });
}

// Botón para iniciar escaneo
document.getElementById("btn-escanear-qr")?.addEventListener("click", startQrScanner);
