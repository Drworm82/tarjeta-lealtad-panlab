// Cargar html5-qrcode si aún no está cargado
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

// Iniciar el escáner de QR
function startQrScanner() {
    loadHtml5QrcodeLibrary(() => {
        let qrContainer = document.getElementById("qr-reader");

        if (!qrContainer) {
            qrContainer = document.createElement("div");
            qrContainer.id = "qr-reader";
            qrContainer.style.width = "100%";
            qrContainer.style.maxWidth = "350px";
            qrContainer.style.margin = "20px auto";
            document.body.appendChild(qrContainer);
        }

        const html5QrCode = new Html5Qrcode("qr-reader");

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log(`Código QR escaneado: ${decodedText}`);
            alert(`Código QR: ${decodedText}`);
            html5QrCode.stop().then(() => {
                console.log("Escaneo detenido.");
            }).catch(err => {
                console.error("Error al detener escaneo:", err);
            });
        };

        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                const cameraId = devices[0].id;
                html5QrCode.start(
                    cameraId,
                    { fps: 10, qrbox: 250 },
                    qrCodeSuccessCallback
                ).catch(err => {
                    console.error("No se pudo iniciar el escáner:", err);
                    alert("Error al iniciar el escáner QR.");
                });
            } else {
                alert("No se encontraron cámaras.");
            }
        }).catch(err => {
            console.error("Error al obtener cámaras:", err);
            alert("Error al obtener las cámaras.");
        });
    });
}

// Asignar al botón de escaneo
document.getElementById("admin-scan-qr-btn")?.addEventListener("click", startQrScanner);
