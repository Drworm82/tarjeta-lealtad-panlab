// ... (Tus importaciones de Firebase, etc., al principio del archivo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo",
  authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
  projectId: "mi-cafeteria-lealtad",
  storageBucket: "mi-cafeteria-lealtad.appspot.com",
  messagingSenderId: "1098066759983",
  appId: "1:1098066759983:web:99be4197dbbb81f6f9d1da"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constantes ---
const STAMPS_PER_FREE_COFFEE = 10; // Define cuántos sellos se necesitan para un café gratis

// ... (Resto de tus variables DOM, etc.)

// Global Html5Qrcode instance
let html5QrCode = null; // Mueve esta declaración al ámbito superior si no lo está ya

// --- Nueva función para cargar Html5Qrcode si no está definido ---
async function ensureHtml5QrcodeLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof Html5Qrcode !== 'undefined') {
            console.log("Html5Qrcode ya está definido.");
            resolve();
            return;
        }

        console.log("Html5Qrcode no definido. Cargando dinámicamente...");
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js";
        script.onload = () => {
            if (typeof Html5Qrcode !== 'undefined') {
                console.log("Html5Qrcode cargado dinámicamente.");
                resolve();
            } else {
                reject(new Error("Html5Qrcode no se definió después de la carga dinámica."));
            }
        };
        script.onerror = (e) => reject(new Error("Error al cargar html5-qrcode.min.js dinámicamente: " + e.message));
        document.head.appendChild(script); // Añadir al head para que se ejecute primero
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // ... (Tu código de inicialización de DOMContentLoaded) ...

    // --- Funciones de Autenticación ---
    // ...

    // --- Manejo del Estado de Autenticación (Este es el controlador principal de UI) ---
    onAuthStateChanged(auth, async (user) => {
        // ... (Tu lógica de user/admin) ...
    });

    // ... (El resto de tus funciones y event listeners) ...

    if (adminScanQRBtn) {
        adminScanQRBtn.addEventListener('click', async () => { // Cambia a async
            try {
                await ensureHtml5QrcodeLoaded(); // Asegura que Html5Qrcode esté cargado
                startQrScanner(); // Llama a tu función original
            } catch (error) {
                console.error("Error al preparar el escáner QR:", error);
                showMessage(`Error: ${error.message}. No se pudo iniciar el escáner.`, 'error');
            }
        });
    }

    // ... (El resto de tus listeners y funciones) ...

    // Tu función startQrScanner no cambia, pero ahora será llamada solo después de ensureHtml5QrcodeLoaded
    async function startQrScanner() {
        if (!qrReaderDiv) {
            console.error("Elemento 'qr-reader' no encontrado.");
            showMessage("Error interno: Elemento de escáner QR no encontrado.", 'error');
            return;
        }

        qrReaderDiv.style.display = 'block';
        adminScanQRBtn.style.display = 'none';
        qrReaderResultsDiv.style.display = 'none';

        if (html5QrCode && html5QrCode.isScanning) {
            await html5QrCode.stop().catch(err => console.warn("Error al detener escáner existente:", err));
        }

        // Aquí es donde lanza el ReferenceError
        html5QrCode = new Html5Qrcode("qr-reader"); 

        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            stopQrScanner();
            qrScannedUidP.textContent = decodedText;
            qrReaderResultsDiv.style.display = 'block';
            showMessage(`QR escaneado: ${decodedText}`, 'success');
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, (errorMessage) => {
                // console.log(`No QR code detected: ${errorMessage}`);
            });
            showMessage("Escáner QR iniciado. Apunta la cámara al código.", 'info');
        } catch (err) {
            console.error("Error al iniciar escáner QR:", err);
            stopQrScanner();
            showMessage(`Error al iniciar escáner QR: ${err.message || 'Verifica permisos de cámara.'}`, 'error');
        }
    }

    // ... (El resto de tus funciones) ...

}); // Fin del DOMContentLoaded
