// --- Elementos del DOM (asegúrate de que estas líneas estén presentes) ---
// ... (resto de tus elementos del DOM) ...
const qrcodeCanvas = document.getElementById('qrcode-canvas'); // Para el QR
const qrInstruction = document.getElementById('qr-instruction'); // Para la instrucción del QR

// --- Funciones de Firebase y Lógica de la Aplicación ---

onAuthStateChanged(auth, async user => {
    // ... (código existente en onAuthStateChanged) ...

    if (user) {
        currentUser = user;
        // ... (resto del código si hay usuario logueado) ...

        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false);
            clearAdminClientInfo();

            if (clientListener) {
                clientListener();
                clientListener = null;
            }
            // Asegúrate de ocultar el QR cuando el admin está logueado
            if (qrcodeCanvas) {
                qrcodeCanvas.style.display = 'none';
                qrInstruction.style.display = 'none';
            }


        } else { // Este es un usuario normal (no admin)
            adminSection.classList.add('hidden');
            if (adminClientListener) {
                adminClientListener();
                adminClientListener = null;
            }
            // *** NUEVO: Mostrar y generar QR para el usuario normal ***
            if (qrcodeCanvas && qrInstruction) {
                qrcodeCanvas.style.display = 'block'; // Muestra el canvas del QR
                qrInstruction.style.display = 'block'; // Muestra la instrucción del QR
                generateQRCode(currentUser.uid); // Llama a la función para generar el QR
            }
        }

        // ... (resto del código, como loadAndListenForStamps) ...

    } else {
        // ... (código si no hay usuario logueado) ...

        // Asegúrate de ocultar el QR cuando no hay sesión
        if (qrcodeCanvas && qrInstruction) {
            qrcodeCanvas.style.display = 'none';
            qrInstruction.style.display = 'none';
        }
    }
});

// *** NUEVA FUNCIÓN: Para generar el Código QR ***
function generateQRCode(uid) {
    if (!qrcodeCanvas) {
        console.error("Canvas para QR no encontrado.");
        return;
    }

    // Limpiar el canvas antes de generar un nuevo QR
    const context = qrcodeCanvas.getContext('2d');
    context.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);

    try {
        new QRious({
            element: qrcodeCanvas,
            value: uid, // El valor que contendrá el QR es el UID del usuario
            size: 200, // Tamaño del QR en píxeles
            level: 'H' // Nivel de corrección de error (L, M, Q, H)
        });
        console.log("Código QR generado para UID:", uid);
    } catch (error) {
        console.error("Error al generar el Código QR:", error);
        qrInstruction.textContent = "Error al generar el código QR. Por favor, recarga la página.";
        qrInstruction.style.color = '#d9534f';
    }
}
