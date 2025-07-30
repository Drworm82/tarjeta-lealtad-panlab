// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, getDocs, where, collectionGroup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Tu configuración de Firebase - ¡REEMPLAZA CON TUS PROPIAS CLAVES!
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Constantes
const MAX_STAMPS = 10;
const ADMIN_EMAIL = 'worm.jim@gmail.com'; // Tu correo de administrador

// Referencias a elementos del DOM
const authBtn = document.getElementById('auth-btn');
const loyaltyCardSection = document.getElementById('loyalty-card');
const adminSection = document.getElementById('admin-section');
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const stampsHistoryList = document.getElementById('stamps-history-list');
const adminEmailInput = document.getElementById('admin-email-input');
const searchClientBtn = document.getElementById('search-client-btn');
const adminClientInfo = document.getElementById('admin-client-info');
const addStampBtn = document.getElementById('add-stamp-btn');
const removeStampBtn = document.getElementById('remove-stamp-btn');
const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
const resetStampsBtn = document.getElementById('reset-stamps-btn');
const adminMessageDisplay = document.getElementById('admin-message');
const scanQrBtn = document.getElementById('scan-qr-btn');
const qrScannerOverlay = document.getElementById('qr-scanner-overlay');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const readerDiv = document.getElementById('reader'); // El div donde se montará el escáner HTML5-QRCODE

const totalClientsDisplay = document.getElementById('total-clients');
const freeCoffeesPendingDisplay = document.getElementById('free-coffees-pending');
const avgStampsDisplay = document.getElementById('avg-stamps');
const reportPeriodSelect = document.getElementById('report-period');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportResultsDiv = document.getElementById('report-results');
const stampsHistoryListAdmin = document.getElementById('stamps-history-list-admin');

// Referencias para la información del usuario en el header
const userInfoDisplay = document.getElementById('user-info-display');
const userNameDisplay = document.getElementById('user-name-display');
const userEmailDisplay = document.getElementById('user-email-display');
const userUidDisplay = document.getElementById('user-uid-display');
const loginPrompt = document.getElementById('login-prompt');

// Referencia al contenedor de confeti
const confettiContainer = document.getElementById('confetti-container');


// Variables globales
let currentStamps = 0;
let selectedClientUID = null; // Para el panel de administración
let html5QrCodeScanner = null; // Instancia del escáner QR

// --- Funciones de Utilidad ---

// Función para mostrar mensajes Toast
function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
        style: {
            background: type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" :
                        type === 'error' ? "linear-gradient(to right, #ff5f6d, #ffc371)" :
                        "linear-gradient(to right, #3498db, #2980b9)",
            color: "#ffffff"
        },
        onClick: function(){} // Callback after click
    }).showToast();
}

// Función para mostrar confeti (celebración)
function showConfetti() {
    if (!confettiContainer) {
        console.error("Error: El contenedor de confeti no se encontró en el DOM. Asegúrate de que existe un div con id='confetti-container'.");
        return;
    }

    confettiContainer.innerHTML = ''; // Limpiar confeti anterior
    confettiContainer.classList.remove('hidden'); // Mostrar el contenedor

    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e', '#607d8b'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confettiContainer.appendChild(confetti);

        // Eliminar el confeti después de la animación para limpiar el DOM
        confetti.addEventListener('animationend', () => {
            confetti.remove();
        });
    }

    // Ocultar el contenedor después de un tiempo si no hay más confeti
    setTimeout(() => {
        if (!confettiContainer.querySelector('.confetti')) {
            confettiContainer.classList.add('hidden');
        }
    }, 3000); // Dar tiempo a las animaciones de confeti
}


// Función para renderizar los sellos en la interfaz
function renderStamps(stamps) {
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes
    for (let i = 0; i < MAX_STAMPS; i++) {
        const stamp = document.createElement('img');
        stamp.src = i < stamps ? './images/stamp_filled.png' : './images/stamp_empty.png'; // Ruta a tus imágenes de sellos
        stamp.alt = `Sello ${i + 1}`;
        stamp.classList.add('stamp-image');
        stampsDisplay.appendChild(stamp);
    }

    if (stamps >= MAX_STAMPS) {
        messageDisplay.textContent = "¡Felicidades! Tienes un café gratis.";
        redeemCoffeeBtn.disabled = false; // Habilitar canjear café
        showConfetti(); // Mostrar el confeti
    } else {
        messageDisplay.textContent = `Tienes ${stamps} sellos. Te faltan ${MAX_STAMPS - stamps} para un café gratis.`;
        redeemCoffeeBtn.disabled = true; // Deshabilitar canjear café si no hay suficientes sellos
    }
}

// Generar Código QR para el cliente
function generateClientQRCode(uid) {
    try {
        if (!qrcodeCanvas) {
            console.error("Canvas para QR no encontrado.");
            return;
        }
        const qr = new QRious({
            element: qrcodeCanvas,
            value: uid, // El UID del usuario es el valor del QR
            size: 200,
            level: 'H' // Nivel de corrección de error alto
        });
        console.log("Código QR generado para UID:", uid);
    } catch (error) {
        console.error("Error al generar el código QR:", error);
        showToast("Error al generar tu código QR.", 'error');
    }
}

// Cargar y mostrar el historial de transacciones
async function loadAndDisplayHistory(uid, targetList = stampsHistoryList) {
    if (!uid) {
        targetList.innerHTML = '<li>No hay usuario seleccionado.</li>';
        return;
    }
    targetList.innerHTML = '<li>Cargando historial...</li>'; // Mostrar mensaje de carga

    const transactionsRef = collection(db, 'loyaltyCards', uid, 'transactions');
    const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(10)); // Últimas 10 transacciones

    try {
        const querySnapshot = await getDocs(q);
        targetList.innerHTML = ''; // Limpiar el mensaje de carga

        if (querySnapshot.empty) {
            targetList.innerHTML = '<li>No hay transacciones registradas.</li>';
            return;
        }

        querySnapshot.forEach(doc => {
            const transaction = doc.data();
            const date = transaction.timestamp ? new Date(transaction.timestamp.toDate()).toLocaleString() : 'Fecha desconocida';
            li.textContent = `${date}: ${transaction.type} (${transaction.stampsAfter} sellos)`;
            targetList.appendChild(li);
        });
        console.log("loadAndDisplayHistory: Se está ejecutando para UID:", uid);

    } catch (error) {
        console.error("Error al cargar el historial:", error);
        targetList.innerHTML = '<li>Error al cargar el historial.</li>';
        showToast("Error al cargar el historial.", 'error');
    }
}


// --- Lógica de Autenticación ---

authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
        signOut(auth)
            .then(() => {
                showToast("Sesión cerrada.", 'success');
            })
            .catch((error) => {
                console.error("Error al cerrar sesión:", error);
                showToast("Error al cerrar sesión.", 'error');
            });
    } else {
        signInWithPopup(auth, provider)
            .catch((error) => {
                console.error("Error al iniciar sesión:", error);
                showToast("Error al iniciar sesión.", 'error');
            });
    }
});

// Listener de estado de autenticación
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authBtn.textContent = 'Cerrar Sesión';
        loginPrompt.classList.add('hidden'); // Ocultar el mensaje de "inicia sesión"

        // Mostrar y rellenar la información del usuario en el header
        if (userInfoDisplay) userInfoDisplay.classList.remove('hidden');
        if (userNameDisplay) userNameDisplay.textContent = `Bienvenido, ${user.displayName || 'Usuario'}`;
        if (userEmailDisplay) userEmailDisplay.textContent = `Email: ${user.email}`;
        if (userUidDisplay) userUidDisplay.textContent = `UID: ${user.uid}`;


        console.log("onAuthStateChanged: Estado de autenticación cambiado. Usuario:", user.email);

        if (isAdmin(user.email)) {
            // Lógica para el administrador
            adminSection.classList.remove('hidden');
            loyaltyCardSection.classList.add('hidden');
            loadAdminDashboardSummary();
            generateReportBtn.disabled = false;
        } else {
            // Lógica para usuario normal
            loyaltyCardSection.classList.remove('hidden');
            adminSection.classList.add('hidden');
            loadLoyaltyCard(user);
        }
    } else {
        // Usuario no logueado
        authBtn.textContent = 'Iniciar Sesión con Google';
        loyaltyCardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        loginPrompt.classList.remove('hidden'); // Mostrar el mensaje de "inicia sesión"

        // Ocultar y limpiar la información del usuario en el header
        if (userInfoDisplay) userInfoDisplay.classList.add('hidden');
        if (userNameDisplay) userNameDisplay.textContent = '';
        if (userEmailDisplay) userEmailDisplay.textContent = '';
        if (userUidDisplay) userUidDisplay.textContent = '';
        
        console.log("onAuthStateChanged: No hay usuario autenticado.");
    }
});


// --- Funciones para la Tarjeta de Lealtad del Cliente ---

async function loadLoyaltyCard(user) {
    if (!user) {
        loyaltyCardSection.classList.add('hidden');
        loginPrompt.classList.remove('hidden');
        return;
    }

    const userDocRef = doc(db, 'loyaltyCards', user.uid);

    onSnapshot(userDocRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            currentStamps = data.stamps || 0;
            console.log(`[CLIENTE] Sellos recibidos del documento para UID ${user.uid}: ${currentStamps}`); // Log de depuración
            renderStamps(currentStamps);
            messageDisplay.textContent = `¡Tienes ${currentStamps} sellos!`;
            generateClientQRCode(user.uid);
            loyaltyCardSection.classList.remove('hidden');
            loadAndDisplayHistory(user.uid);
        } else {
            // ¡La tarjeta no existe, hay que crearla!
            console.log("Documento de tarjeta de lealtad no encontrado, creando uno nuevo...");
            try {
                await setDoc(userDocRef, {
                    stamps: 0,
                    userEmail: user.email,
                    createdAt: serverTimestamp()
                });
                currentStamps = 0;
                renderStamps(currentStamps);
                messageDisplay.textContent = "¡Bienvenido! Tu nueva tarjeta de lealtad ha sido creada con 0 sellos.";
                generateClientQRCode(user.uid);
                loyaltyCardSection.classList.remove('hidden');
                loadAndDisplayHistory(user.uid); // Carga el historial (vacío)
            } catch (error) {
                console.error("Error al crear la tarjeta de lealtad:", error);
                messageDisplay.textContent = "Error al crear tu tarjeta de lealtad.";
                showToast("Error al crear tu tarjeta de lealtad.", 'error');
            }
        }
    }, (error) => {
        console.error("Error al escuchar sellos:", error);
        messageDisplay.textContent = "Error al cargar tu tarjeta de lealtad.";
        showToast("Error al cargar tu tarjeta de lealtad. Revisa tus permisos de Firebase.", 'error');
    });
}

// --- Funciones para el Dashboard de Administración ---

function isAdmin(email) {
    return email === ADMIN_EMAIL;
}

async function loadAdminDashboardSummary() {
    console.log("Cargando resumen del dashboard de administración...");
    try {
        const loyaltyCardsRef = collection(db, 'loyaltyCards');
        const querySnapshot = await getDocs(loyaltyCardsRef);

        let totalClients = 0;
        let freeCoffeesPending = 0;
        let totalStamps = 0;

        querySnapshot.forEach(doc => {
            totalClients++;
            const stamps = doc.data().stamps || 0;
            totalStamps += stamps;
            if (stamps >= MAX_STAMPS) {
                freeCoffeesPending++;
            }
        });

        const avgStamps = totalClients > 0 ? (totalStamps / totalClients).toFixed(1) : 0;

        totalClientsDisplay.textContent = totalClients;
        freeCoffeesPendingDisplay.textContent = freeCoffeesPending;
        avgStampsDisplay.textContent = avgStamps;
        console.log("Resumen del dashboard cargado.");

    } catch (error) {
        console.error("Error al cargar el resumen del dashboard:", error);
        totalClientsDisplay.textContent = 'Error';
        freeCoffeesPendingDisplay.textContent = 'Error';
        avgStampsDisplay.textContent = 'Error';
        showToast("Error al cargar el resumen del dashboard.", 'error');
    }
}

// --- Funciones de Gestión de Clientes (Admin) ---

// Búsqueda de cliente por email o UID
searchClientBtn.addEventListener('click', async () => {
    const input = adminEmailInput.value.trim();
    if (!input) {
        showToast('Por favor, ingresa un email o UID.', 'info');
        return;
    }

    adminMessageDisplay.textContent = 'Buscando cliente...';
    clearAdminClientInfo();

    try {
        let clientDoc = null;
        if (input.includes('@')) { // Asumimos que es un email
            const q = query(collection(db, 'loyaltyCards'), where('userEmail', '==', input), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                clientDoc = querySnapshot.docs[0];
            }
        } else { // Asumimos que es un UID
            clientDoc = await getDoc(doc(db, 'loyaltyCards', input));
        }

        if (clientDoc && clientDoc.exists()) {
            selectedClientUID = clientDoc.id;
            const data = clientDoc.data();
            adminClientInfo.innerHTML = `
                <p><strong>Cliente:</strong> ${data.userEmail || 'Desconocido'}</p>
                <p><strong>UID:</strong> ${selectedClientUID}</p>
                <p><strong>Sellos actuales:</strong> <span id="admin-current-stamps">${data.stamps || 0}</span></p>
            `;
            // Habilitar botones de acción
            addStampBtn.disabled = false;
            removeStampBtn.disabled = false;
            redeemCoffeeBtn.disabled = (data.stamps || 0) < MAX_STAMPS;
            resetStampsBtn.disabled = false;
            adminMessageDisplay.textContent = `Cliente ${data.userEmail || selectedClientUID} cargado.`;
            loadAndDisplayHistory(selectedClientUID, stampsHistoryListAdmin); // Cargar historial del cliente
        } else {
            clearAdminClientInfo();
            showToast('Cliente no encontrado.', 'error');
            adminMessageDisplay.textContent = 'Cliente no encontrado.';
        }
    } catch (error) {
        console.error("Error al buscar cliente:", error);
        showToast("Error al buscar cliente.", 'error');
        adminMessageDisplay.textContent = 'Error al buscar cliente.';
        clearAdminClientInfo();
    }
});

function clearAdminClientInfo() {
    selectedClientUID = null;
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    addStampBtn.disabled = true;
    removeStampBtn.disabled = true;
    redeemCoffeeBtn.disabled = true;
    resetStampsBtn.disabled = true;
    stampsHistoryListAdmin.innerHTML = '<li>Historial de transacciones del cliente seleccionado aparecerá aquí.</li>';
}

// Función para actualizar sellos y registrar transacción
async function updateStamps(changeType, clientUid = selectedClientUID) {
    if (!clientUid) {
        showToast('Por favor, selecciona un cliente primero.', 'error');
        return;
    }

    const clientDocRef = doc(db, 'loyaltyCards', clientUid);
    const transactionCollectionRef = collection(db, 'loyaltyCards', clientUid, 'transactions');
    adminMessageDisplay.textContent = 'Actualizando sellos...';

    try {
        // Obtener el estado actual de los sellos
        const clientDocSnap = await getDoc(clientDocRef);
        if (!clientDocSnap.exists()) {
            throw new Error("La tarjeta de lealtad del cliente no existe.");
        }
        let currentClientStamps = clientDocSnap.data().stamps || 0;
        let newStamps = currentClientStamps;
        let transactionType = "";

        if (changeType === 'add') {
            newStamps = Math.min(currentClientStamps + 1, MAX_STAMPS);
            transactionType = "Sello Añadido";
        } else if (changeType === 'remove') {
            newStamps = Math.max(currentClientStamps - 1, 0);
            transactionType = "Sello Removido";
        } else if (changeType === 'redeem') {
            if (currentClientStamps >= MAX_STAMPS) {
                newStamps = 0; // Reiniciar sellos al canjear
                transactionType = "Café Canjeado";
            } else {
                showToast("El cliente no tiene suficientes sellos para canjear un café.", 'error');
                return;
            }
        } else if (changeType === 'reset') {
            newStamps = 0;
            transactionType = "Sellos Reiniciados";
        }

        // Actualizar el documento del cliente
        await updateDoc(clientDocRef, {
            stamps: newStamps
        });

        // Registrar la transacción
        await addDoc(transactionCollectionRef, {
            type: transactionType,
            stampsBefore: currentClientStamps,
            stampsAfter: newStamps,
            timestamp: serverTimestamp(),
            adminEmail: auth.currentUser ? auth.currentUser.email : 'Desconocido'
        });

        document.getElementById('admin-current-stamps').textContent = newStamps; // Actualizar UI
        redeemCoffeeBtn.disabled = newStamps < MAX_STAMPS; // Actualizar estado del botón canjear
        showToast(`Sellos ${changeType === 'add' ? 'añadidos' : changeType === 'remove' ? 'removidos' : changeType === 'redeem' ? 'canjeados' : 'reiniciados'} con éxito.`, 'success');
        adminMessageDisplay.textContent = 'Operación completada.';
        loadAndDisplayHistory(clientUid, stampsHistoryListAdmin); // Recargar historial
    } catch (error) {
        console.error(`Error al ${changeType} sello:`, error);
        showToast(`Error al ${changeType} sello: ` + error.message, 'error'); // Mostrar mensaje de error de Firebase
        adminMessageDisplay.textContent = `Error al ${changeType} sellos.`
    }
}

addStampBtn.addEventListener('click', () => updateStamps('add'));
removeStampBtn.addEventListener('click', () => updateStamps('remove'));
redeemCoffeeBtn.addEventListener('click', () => updateStamps('redeem'));
resetStampsBtn.addEventListener('click', () => updateStamps('reset'));

// --- Funciones de Escáner QR (Admin) ---

scanQrBtn.addEventListener('click', () => {
    qrScannerOverlay.classList.remove('hidden');
    startQrScanner();
});

closeScannerBtn.addEventListener('click', () => {
    if (html5QrCodeScanner) {
        html5QrCodeScanner.stop().then(() => {
            qrScannerOverlay.classList.add('hidden');
            console.log("Escáner QR detenido.");
            document.getElementById('scanner-message').textContent = 'Cargando cámara...'; // Restablecer mensaje
        }).catch((err) => {
            console.error("Error al detener el escáner QR:", err);
            qrScannerOverlay.classList.add('hidden'); // Forzar cierre
        });
    } else {
        qrScannerOverlay.classList.add('hidden');
    }
});

function startQrScanner() {
    // Asegurarse de que el div 'reader' exista antes de inicializar el escáner
    if (!readerDiv) {
        console.error("Error: El elemento 'reader' para el escáner QR no se encontró en el DOM.");
        showToast("Error al iniciar el escáner: falta el elemento HTML.", 'error');
        return;
    }

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCodeScanner = new Html5QrcodeScanner(readerDiv.id, config, false);

    html5QrCodeScanner.render((decodedText, decodedResult) => {
        // En caso de éxito, el texto decodificado es el UID del cliente
        document.getElementById('scanner-message').textContent = `QR Escaneado: ${decodedText}`;
        adminEmailInput.value = decodedText; // Poner el UID en el campo de búsqueda
        if (html5QrCodeScanner) {
            html5QrCodeScanner.stop(); // Detener el escáner
            qrScannerOverlay.classList.add('hidden'); // Ocultar overlay
            searchClientBtn.click(); // Simular clic en buscar cliente
        }
        showToast(`QR escaneado: ${decodedText}`, 'success');
    }, (errorMessage) => {
        // En caso de error o cuando no se detecta QR
        document.getElementById('scanner-message').textContent = `Escaneando QR...`; // Mensaje de feedback
        // console.warn("QR no detectado:", errorMessage); // Puedes comentar esto si es muy ruidoso
    });
}


// --- Reportes de Transacciones (Admin) ---

generateReportBtn.addEventListener('click', async () => {
    const period = parseInt(reportPeriodSelect.value); // Días a mirar hacia atrás
    if (isNaN(period)) {
        showToast("Período de reporte inválido.", 'error');
        return;
    }

    reportResultsDiv.innerHTML = '<p style="color:#5bc0de;">Generando reporte...</p>';

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    try {
        // Consulta de grupo de colecciones para 'transactions'
        const transactionsQuery = query(
            collectionGroup(db, 'transactions'),
            where('timestamp', '>=', startDate),
            where('timestamp', '<=', endDate),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(transactionsQuery);

        let reportHtml = `<h4>Reporte de Transacciones (${period} días)</h4>`;
        if (querySnapshot.empty) {
            reportHtml += '<p>No se encontraron transacciones en el período seleccionado.</p>';
        } else {
            reportHtml += '<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Cliente (UID)</th><th>Sellos Antes</th><th>Sellos Después</th><th>Admin</th></tr></thead><tbody>';
            querySnapshot.forEach(doc => {
                const transaction = doc.data();
                const pathParts = doc.ref.path.split('/');
                const clientUid = pathParts[1]; // loyaltyCards/{clientUid}/transactions/{transactionId}

                const date = transaction.timestamp ? new Date(transaction.timestamp.toDate()).toLocaleString() : 'N/A';
                reportHtml += `
                    <tr>
                        <td>${date}</td>
                        <td>${transaction.type}</td>
                        <td>${clientUid}</td>
                        <td>${transaction.stampsBefore || 0}</td>
                        <td>${transaction.stampsAfter || 0}</td>
                        <td>${transaction.adminEmail || 'N/A'}</td>
                    </tr>
                `;
            });
            reportHtml += '</tbody></table>';
        }
        reportResultsDiv.innerHTML = reportHtml;

    } catch (error) {
        console.error("Error al generar el reporte:", error);
        reportResultsDiv.innerHTML = '<p style="color:#dc3545;">Error al generar el reporte.</p>';
        showToast("Error al generar el reporte.", 'error');
    }
});
