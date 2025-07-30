// --- Importaciones de Firebase SDK (Versión 9 Modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, onSnapshot, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, collectionGroup } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Configuración de Firebase (TUS CREDENCIALES) ---
// ASEGÚRATE DE QUE ESTAS CREDENCIALES SON LAS CORRECTAS DE TU PROYECTO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo",
    authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
    projectId: "mi-cafeteria-lealtad",
    storageBucket: "mi-cafeteria-lealtad.firebaseapp.com",
    messagingSenderId: "1098066759983",
    appId: "1:1098066759983:web:99be4197dbbb81f6f9d1da"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Obtener la instancia de Auth
const db = getFirestore(app); // Obtener la instancia de Firestore
const googleProvider = new GoogleAuthProvider(); // Proveedor de Google

// --- Constantes y Variables Globales ---
const MAX_STAMPS = 10;
let currentStamps = 0; // Usada en el display del usuario, no en admin
let currentUser = null; // Guardará el objeto de usuario de Firebase
const adminUserEmail = 'worm.jim@gmail.com'; // Correo del administrador (constante)

// Listeners de Firestore
let clientListener = null; // Para el usuario normal
let adminClientListener = null; // Para el cliente cargado en el panel de admin

// Almacena el UID del cliente actualmente seleccionado en el panel de administración
let targetClientEmail = null; // Esto en realidad almacena el UID del cliente

// --- Elementos del DOM ---
const userDisplay = document.getElementById('user-display');
const authBtn = document.getElementById('auth-btn');

// Elementos de la tarjeta de lealtad (usuario normal)
const loyaltyCardSection = document.getElementById('loyalty-card');
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message'); // Se mantiene para mensajes específicos, pero los resultados de operación serán toasts
const confettiContainer = document.querySelector('.confetti-container');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const qrInstruction = document.getElementById('qr-instruction');
const stampsHistoryList = document.getElementById('stamps-history-list');

// Elementos del panel de administración
const adminSection = document.getElementById('admin-section');
const adminEmailInput = document.getElementById('admin-email-input');
const searchClientBtn = document.getElementById('search-client-btn');
const adminClientInfo = document.getElementById('admin-client-info');
const addStampBtn = document.getElementById('add-stamp-btn');
const removeStampBtn = document.getElementById('remove-stamp-btn');
const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
const resetStampsBtn = document.getElementById('reset-stamps-btn');
const adminMessage = document.getElementById('admin-message'); // Se mantiene para mensajes de "Cargando..." o estado intermedio

// NUEVOS Elementos del DOM para el Dashboard de Administración
const totalClientsDisplay = document.getElementById('total-clients');
const freeCoffeesPendingDisplay = document.getElementById('free-coffees-pending');
const avgStampsDisplay = document.getElementById('avg-stamps');

// NUEVOS Elementos del DOM para Reportes
const reportPeriodSelect = document.getElementById('report-period');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportResultsDiv = document.getElementById('report-results');


// NUEVOS Elementos del DOM para el Escáner QR
const scanQrBtn = document.getElementById('scan-qr-btn');
const qrScannerOverlay = document.getElementById('qr-scanner-overlay');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const scannerMessage = document.getElementById('scanner-message');

let html5QrCodeScanner = null; // Variable para la instancia de html5-qrcode

// --- Funciones de UI ---

// NUEVA FUNCIÓN PARA MOSTRAR TOASTS
function showToast(message, type = 'info', duration = 3000) {
    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = 'linear-gradient(to right, #5cb85c, #4CAF50)'; // Verde
            break;
        case 'error':
            backgroundColor = 'linear-gradient(to right, #d9534f, #f44336)';   // Rojo
            break;
        case 'warning':
            backgroundColor = 'linear-gradient(to right, #f0ad4e, #FF9800)'; // Naranja
            break;
        case 'info':
        default:
            backgroundColor = 'linear-gradient(to right, #5bc0de, #2196F3)';  // Azul
            break;
    }

    Toastify({
        text: message,
        duration: duration,
        newWindow: true,
        close: true,
        gravity: "bottom", // `top` or `bottom`
        position: "right",  // `left`, `center` or `right`
        stopOnFocus: true, // Detener el temporizador si el usuario interactúa con la ventana
        style: {
            background: backgroundColor,
            borderRadius: "5px",
            boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)"
        },
        onClick: function(){} // Callback después de clic
    }).showToast();
}


function renderStamps(stampsCount) {
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes

    for (let i = 0; i < MAX_STAMPS; i++) {
        const stamp = document.createElement('div');
        stamp.classList.add('stamp');
        if (i < stampsCount) {
            stamp.classList.add('obtained');
            stamp.innerHTML = '☕';
        } else {
            stamp.textContent = (i + 1);
        }
        stampsDisplay.appendChild(stamp);
    }

    if (stampsCount >= MAX_STAMPS) {
        messageDisplay.innerHTML = '¡Felicidades! Has ganado un café gratis. 🎉';
        messageDisplay.style.color = '#2e8b57';
        showConfetti();
    } else {
        messageDisplay.textContent = `¡Casi lo tienes! Te faltan ${MAX_STAMPS - stampsCount} sellos para tu café gratis.`;
        messageDisplay.style.color = '#555';
    }
}

function showConfetti() {
    confettiContainer.innerHTML = '';

    const numConfetti = 50;
    const colors = ['#f06292', '#ba68c8', '#64b5f6', '#81c784', '#ffd54f', '#ff8a65'];

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}%`;

        const randomAnimationIndex = Math.floor(Math.random() * 5) + 1;
        const randomAnimationName = `confetti-fall-${randomAnimationIndex}`;

        const randomDelay = Math.random() * 1.5;
        const randomDuration = 2 + Math.random() * 2;

        confetti.style.animation = `${randomAnimationName} ${randomDuration}s ${randomDelay}s ease-out forwards`;

        confettiContainer.appendChild(confetti);
    }

    confettiContainer.classList.add('active');

    setTimeout(() => {
        confettiContainer.classList.remove('active');
        confettiContainer.innerHTML = '';
    }, 4000);
}

function hideConfetti() {
    confettiContainer.classList.remove('active');
    confettiContainer.innerHTML = '';
}

// Controla la habilitación/deshabilitación y estilos de los botones de acción del admin
function setAdminControlsEnabled(enabled, allowAddAndResetOnly = false, currentClientStamps = 0) {
    if (enabled) {
        addStampBtn.style.backgroundColor = '#28a745';
        removeStampBtn.style.backgroundColor = allowAddAndResetOnly ? '#ccc' : '#dc3545';
        redeemCoffeeBtn.style.backgroundColor = allowAddAndResetOnly ? '#ccc' : '#17a2b8';
        resetStampsBtn.style.backgroundColor = '#6c757d';

        if (currentClientStamps >= MAX_STAMPS) {
            addStampBtn.disabled = true;
            redeemCoffeeBtn.disabled = false;
        } else {
            addStampBtn.disabled = false;
            redeemCoffeeBtn.disabled = true;
        }

        removeStampBtn.disabled = (allowAddAndResetOnly || currentClientStamps === 0);
        resetStampsBtn.disabled = false;

    } else {
        addStampBtn.style.backgroundColor = '#ccc';
        removeStampBtn.style.backgroundColor = '#ccc';
        redeemCoffeeBtn.style.backgroundColor = '#ccc';
        resetStampsBtn.style.backgroundColor = '#ccc';

        addStampBtn.disabled = true;
        removeStampBtn.disabled = true;
        redeemCoffeeBtn.disabled = true;
        resetStampsBtn.disabled = true;
    }
}

// Deshabilita todos los controles del panel de administración
function disableAdminControlsTemporarily() {
    setAdminControlsEnabled(false);
    searchClientBtn.disabled = true;
    adminEmailInput.disabled = true;
    scanQrBtn.disabled = true; // Deshabilita también el botón de escanear
    adminSection.style.cursor = 'wait';
}

// Habilita los controles del panel de administración (después de una operación)
function enableAdminControlsAfterOperation() {
    searchClientBtn.disabled = false;
    adminEmailInput.disabled = false;
    scanQrBtn.disabled = false; // Habilita también el botón de escanear
    adminSection.style.cursor = 'default';
}

function clearAdminClientInfo() {
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    setAdminControlsEnabled(false);
    targetClientEmail = null;
    if (adminClientListener) {
        adminClientListener();
        adminClientListener = null;
    }
    adminMessage.textContent = ''; // Limpiar solo el mensaje "en proceso"
    stampsHistoryList.innerHTML = '<li>No hay transacciones registradas aún para este cliente.</li>'; // Limpiar historial también
}

// Función para generar el Código QR del cliente (usa QRious.js)
function generateQRCode(uid) {
    if (!qrcodeCanvas) {
        console.error("Canvas para QR no encontrado.");
        return;
    }

    const context = qrcodeCanvas.getContext('2d');
    context.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);

    try {
        new QRious({
            element: qrcodeCanvas,
            value: uid, // El valor que contendrá el QR es el UID del usuario
            size: 200,
            level: 'H'
        });
        console.log("Código QR generado para UID:", uid);
    } catch (error) {
        console.error("Error al generar el Código QR:", error);
        showToast("Error al generar el código QR.", 'error'); // Usar toast
    }
}

// --- Funciones de Firebase y Lógica de la Aplicación ---

// Función para escuchar y mostrar los sellos del cliente en tiempo real
function loadAndListenForStamps(uid) {
    // Asegurarse de que el listener del admin no esté activo si es un cliente normal
    if (adminClientListener) {
        adminClientListener();
        adminClientListener = null;
    }

    if (clientListener) {
        clientListener(); // Desuscribir listener anterior si existe
        clientListener = null;
    }
    const docRef = doc(db, 'loyaltyCards', uid);
    clientListener = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentStamps = data.stamps || 0;
            console.log(`[CLIENTE] Sellos recibidos del documento para UID ${uid}: ${currentStamps}`);
            renderStamps(currentStamps);
        } else {
            console.log("No se encontró tarjeta de lealtad para este usuario. Creando una nueva.");
            renderStamps(0); // Muestra 0 sellos
            showToast("¡Bienvenido! Parece que eres nuevo. Hemos creado tu tarjeta de lealtad.", 'success'); // Usar toast
            // No creamos aquí la tarjeta, eso se maneja en onAuthStateChanged
        }
    }, (error) => {
        console.error("Error al escuchar sellos:", error);
        showToast("Error al cargar tu tarjeta de lealtad. Por favor, recarga.", 'error'); // Usar toast
    });
}


// Función para obtener el UID a partir de un email
async function getUidByEmail(email) {
    console.log(`Intentando obtener UID para email: ${email}`);
    const q = query(collection(db, 'loyaltyCards'), where('userEmail', '==', email), limit(1));
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            console.log(`UID encontrado para ${email}: ${doc.id}`);
            return doc.id; // La ID del documento es el UID
        } else {
            console.log(`No se encontró UID para el email: ${email}`);
            return null;
        }
    } catch (error) {
        console.error(`Error al buscar UID por email (${email}):`, error);
        return null;
    }
}

// --- Función auxiliar para registrar una transacción en la subcolección ---
async function logTransaction(uid, type, stampsBefore, stampsAfter, description = '', adminUid = null) {
    try {
        const transactionsColRef = collection(db, 'loyaltyCards', uid, 'transactions');
        await addDoc(transactionsColRef, {
            type: type,
            timestamp: serverTimestamp(),
            stamps_before: stampsBefore,
            stamps_after: stampsAfter,
            description: description,
            admin_uid: adminUid
        });
        console.log(`Transacción de tipo '${type}' registrada para UID: ${uid}`);
    } catch (error) {
        console.error("Error al registrar la transacción:", error);
    }
}

// --- Nueva función para cargar y mostrar el historial del cliente ---
async function loadAndDisplayHistory(uid) {
    console.log(`loadAndDisplayHistory: Se está ejecutando para UID: ${uid}`);
    stampsHistoryList.innerHTML = '<li>Cargando historial...</li>';

    const transactionsColRef = collection(db, 'loyaltyCards', uid, 'transactions');
    const q = query(transactionsColRef, orderBy('timestamp', 'desc'), limit(20));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            stampsHistoryList.innerHTML = '<li>No hay transacciones registradas aún.</li>';
            return;
        }

        stampsHistoryList.innerHTML = ''; // Limpiar el mensaje de carga
        querySnapshot.forEach(doc => {
            const data = doc.data();
            const li = document.createElement('li');
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString('es-ES', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : 'Fecha desconocida';

            let descriptionText = '';

            switch (data.type) {
                case 'add_stamp':
                    descriptionText = `Añadido un sello. Sellos: ${data.stamps_before} → ${data.stamps_after}`;
                    break;
                case 'remove_stamp':
                    descriptionText = `Quitado un sello. Sellos: ${data.stamps_before} → ${data.stamps_after}`;
                    break;
                case 'redeem_coffee':
                    descriptionText = `Café gratis canjeado. Sellos: ${data.stamps_before} → ${data.stamps_after}`;
                    break;
                case 'reset_stamps':
                    descriptionText = `Tarjeta reiniciada. Sellos: ${data.stamps_before} → ${data.stamps_after}`;
                    break;
                default:
                    descriptionText = `Transacción desconocida: ${data.type}`;
            }

            if (data.description) {
                descriptionText += ` (${data.description})`;
            }

            li.innerHTML = `<span class="description">${descriptionText}</span><span class="timestamp">${date}</span>`;
            stampsHistoryList.appendChild(li);
        });
    } catch (error) {
        console.error("Error al cargar el historial:", error);
        stampsHistoryList.innerHTML = '<li>Error al cargar el historial.</li>';
        showToast("Error al cargar el historial de transacciones.", 'error'); // Usar toast
    }
}

// Observador del estado de autenticación de Firebase
onAuthStateChanged(auth, async user => {
    console.log("onAuthStateChanged: Estado de autenticación cambiado. Usuario:", user ? user.email : "null");
    if (user) {
        currentUser = user;
        userDisplay.textContent = `Bienvenido, ${currentUser.displayName || currentUser.email}`;
        authBtn.textContent = 'Cerrar Sesión';
        loyaltyCardSection.classList.remove('hidden');

        // Lógica para mostrar/ocultar panel de administración
        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false); // Inicia deshabilitado
            clearAdminClientInfo(); // Limpia info de cliente
            enableAdminControlsAfterOperation(); // Habilita búsqueda y escaneo al inicio para el admin
            loadAdminDashboardSummary(); // Cargar resumen del dashboard al iniciar como admin
            generateReportBtn.click(); // Generar reporte inicial (ej. de 7 días)

            // Si el admin está logueado, asegúrate de detener el listener del cliente normal
            if (clientListener) {
                clientListener();
                clientListener = null;
            }
            // Asegúrate de ocultar el QR del cliente cuando el admin está logueado
            if (qrcodeCanvas && qrInstruction) {
                qrcodeCanvas.style.display = 'none';
                qrInstruction.style.display = 'none';
            }
            // Mensaje para historial en el modo admin
            stampsHistoryList.innerHTML = '<li>Historial de transacciones del cliente seleccionado aparecerá aquí.</li>';


        } else { // Este es un usuario normal (no admin)
            adminSection.classList.add('hidden');
            stopQrScanner(); // Asegurarse de que el escáner se detenga si se cambia a usuario normal
            // Asegurarse de que el listener del admin para un cliente cargado se detenga
            if (adminClientListener) {
                adminClientListener();
                adminClientListener = null;
            }
            // Mostrar y generar QR para el usuario normal
            if (qrcodeCanvas && qrInstruction) {
                qrcodeCanvas.style.display = 'block';
                qrInstruction.style.display = 'block';
                generateQRCode(currentUser.uid);
            }
            messageDisplay.textContent = "Cargando tu tarjeta de lealtad..."; // Se mantiene para este estado inicial
            messageDisplay.style.color = '#5bc0de';
            loadAndListenForStamps(currentUser.uid); // Asegura que se cargan los sellos del cliente
            loadAndDisplayHistory(currentUser.uid); // Cargar el historial para el usuario normal

            // IMPORTANTE: Asegúrate de que el email del usuario se guarde con el UID la primera vez que inicia sesión
            if (currentUser && currentUser.uid) {
                const userDocRef = doc(db, 'loyaltyCards', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    await setDoc(userDocRef, {
                        stamps: 0,
                        lastUpdate: new Date(),
                        userEmail: currentUser.email
                    }).then(() => {
                        console.log(`Tarjeta inicial creada para UID: ${currentUser.uid} con email: ${currentUser.email}`);
                        showToast(`Tarjeta inicial creada para ${currentUser.email}.`, 'success'); // Toast para el usuario
                    }).catch(e => {
                        console.error("Error al crear la tarjeta inicial:", e);
                        showToast(`Error al crear tu tarjeta inicial: ${e.message}`, 'error'); // Toast para el usuario
                    });
                } else {
                    const currentEmailInDb = userDocSnap.data().userEmail;
                    if (currentEmailInDb !== currentUser.email) {
                        await updateDoc(userDocRef, { userEmail: currentUser.email });
                        console.log(`Email del usuario actualizado en DB para UID: ${currentUser.uid}`);
                        showToast(`Email de la tarjeta actualizado a ${currentUser.email}.`, 'info'); // Toast para el usuario
                    }
                }
            }
        }

    } else { // No hay usuario autenticado
        currentUser = null;
        userDisplay.textContent = 'Por favor, inicia sesión.';
        authBtn.textContent = 'Iniciar Sesión con Google';
        loyaltyCardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        renderStamps(0); // Muestra 0 sellos
        messageDisplay.textContent = 'Inicia sesión para ver tu tarjeta de lealtad.'; // Se mantiene
        messageDisplay.style.color = '#555';
        hideConfetti();

        // Limpiar listeners y estados cuando no hay usuario
        if (clientListener) {
            clientListener();
            clientListener = null;
        }
        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }
        clearAdminClientInfo(); // Esto también limpia el historial
        stopQrScanner(); // Asegurarse de que el escáner se detenga al cerrar sesión
        // Asegúrate de ocultar el QR del cliente cuando no hay sesión
        if (qrcodeCanvas && qrInstruction) {
            qrcodeCanvas.style.display = 'none';
            qrInstruction.style.display = 'none';
        }
        // Mensaje para historial cuando no hay sesión
        stampsHistoryList.innerHTML = '<li>Inicia sesión para ver tu historial de transacciones.</li>';
    }
});

// Función auxiliar para actualizar la visualización y controles del admin
async function updateAdminClientDisplayAndControls(clientId, docSnapshot) {
    if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const stamps = data.stamps || 0;
        const clientEmailDisplay = data.userEmail || clientId;
        targetClientEmail = clientId;

        adminClientInfo.innerHTML = `
            <p>Cliente: <strong>${clientEmailDisplay}</strong> (UID: ${clientId})</p>
            <p>Sellos actuales: <strong id="admin-current-stamps">${stamps}</strong></p>
        `;
        setAdminControlsEnabled(true, false, stamps);
        showToast(`Cliente ${clientEmailDisplay} cargado correctamente.`, 'info'); // Usar toast

        // Desuscribir listener antiguo del adminClientListener si existe
        if (adminClientListener) adminClientListener();
        const clientDocRef = doc(db, 'loyaltyCards', clientId);
        adminClientListener = onSnapshot(clientDocRef, snap => {
            if (snap.exists()) {
                const latestStamps = snap.data().stamps || 0;
                console.log(`[ADMIN LISTENER] Sellos recibidos del documento para UID ${clientId}: ${latestStamps}`);
                document.getElementById('admin-current-stamps').textContent = latestStamps;
                setAdminControlsEnabled(true, false, latestStamps);
                // Aquí podrías mostrar un toast más sutil si solo es una actualización de sellos en tiempo real
                // showToast(`Sellos actualizados para ${clientEmailDisplay}: ${latestStamps}`, 'info', 1500);
            } else {
                clearAdminClientInfo();
                showToast(`El cliente con UID ${clientId} ya no existe en la base de datos.`, 'error'); // Usar toast
            }
        }, error => {
            console.error("Admin onSnapshot ERROR (desde updateAdminClientDisplayAndControls):", error);
            showToast(`Error al actualizar los sellos del cliente en tiempo real. Detalles: ${error.message}`, 'error'); // Usar toast
        });

    } else { // Document does NOT exist
        clearAdminClientInfo(); // Esto también limpia el historial
        targetClientEmail = clientId; // Mantenemos el ID para intentar crear la tarjeta
        showToast(`Cliente con UID ${clientId} no encontrado. Puedes añadirle un sello para crear su tarjeta.`, 'warning', 5000); // Usar toast
        setAdminControlsEnabled(true, true, 0); // Solo añadir y resetear (resetear significa crear con 0)
    }
}


// --- Funciones para el Dashboard de Administración ---
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
        showToast("Error al cargar el resumen del dashboard.", 'error'); // Usar toast
    }
}

// --- Funciones para Reportes ---
generateReportBtn.addEventListener('click', async () => {
    const days = parseInt(reportPeriodSelect.value);
    if (isNaN(days) || days <= 0) {
        reportResultsDiv.innerHTML = '<p style="color:#d9534f;">Por favor, selecciona un período válido.</p>';
        showToast("Por favor, selecciona un período válido para el reporte.", 'warning'); // Usar toast
        return;
    }

    reportResultsDiv.innerHTML = '<p style="color:#5bc0de;">Generando reporte...</p>';

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
        const transactionsRef = collectionGroup(db, 'transactions'); // Consulta de colección grupal
        const q = query(
            transactionsRef,
            where('timestamp', '>=', cutoffDate),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);

        let stampsAdded = 0;
        let coffeesRedeemed = 0;
        let cardsReset = 0;
        let stampsRemoved = 0;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            switch (data.type) {
                case 'add_stamp':
                    stampsAdded++;
                    break;
                case 'redeem_coffee':
                    coffeesRedeemed++;
                    break;
                case 'reset_stamps':
                    cardsReset++;
                    break;
                case 'remove_stamp':
                    stampsRemoved++;
                    break;
            }
        });

        reportResultsDiv.innerHTML = `
            <h4>Reporte de los últimos ${days} días:</h4>
            <p>Sellos Añadidos: <strong>${stampsAdded}</strong></p>
            <p>Cafés Gratuitos Canjeados: <strong>${coffeesRedeemed}</strong></p>
            <p>Tarjetas Reiniciadas: <strong>${cardsReset}</strong></p>
            <p>Sellos Quitados: <strong>${stampsRemoved}</strong></p>
        `;
        showToast(`Reporte generado para los últimos ${days} días.`, 'success'); // Usar toast

    } catch (error) {
        console.error("Error al generar el reporte:", error);
        reportResultsDiv.innerHTML = `<p style="color:#d9534f;">Error al generar el reporte: ${error.message}</p>`;
        showToast(`Error al generar el reporte: ${error.message}`, 'error'); // Usar toast
    }
});


// --- Funciones para el Escáner QR (usa html5-qrcode) ---

async function startQrScanner() {
    scannerMessage.textContent = 'Cargando cámara...';
    scannerMessage.style.color = '#7a4a2b';
    qrScannerOverlay.classList.remove('hidden'); // Muestra el overlay del escáner

    // Deshabilitar interacciones en el panel de administración principal y darle feedback visual
    adminSection.style.pointerEvents = 'none';
    adminSection.style.opacity = '0.5';

    // Inicializa Html5QrcodeScanner si no está ya inicializado
    if (!html5QrCodeScanner) {
        html5QrCodeScanner = new Html5QrcodeScanner(
            "reader", // ID del div donde html5-qrcode montará la vista de la cámara
            { fps: 10, qrbox: { width: 250, height: 250 } }, // Configuración: frames por segundo, tamaño del recuadro de escaneo
            false // verbose=false para menos logs en consola
        );
    }

    // Callback para cuando se escanea un QR con éxito
    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`QR escaneado con éxito: ${decodedText}`);
        showToast(`QR escaneado: ${decodedText}`, 'success'); // Usar toast
        adminEmailInput.value = decodedText; // Pega el UID decodificado en el input
        stopQrScanner(); // Detiene el escáner automáticamente

        // Simula un clic en el botón de búsqueda después de un pequeño retraso
        setTimeout(() => {
            searchClientBtn.click();
        }, 100);
    };

    // Callback para cuando hay un error en el escaneo (ej. no se encuentra QR, poca luz)
    const onScanError = (errorMessage) => {
        // Solo para depuración, evita llenar la consola en producción
        // console.warn(`Error de escaneo (no crítico): ${errorMessage}`);
        scannerMessage.textContent = 'Apunta la cámara al código QR. No se detecta QR válido.';
        scannerMessage.style.color = '#f0ad4e';
    };

    try {
        // Intenta renderizar el escáner
        await html5QrCodeScanner.render(onScanSuccess, onScanError);
        scannerMessage.textContent = 'Escaneando... Apunta la cámara al código QR.';
        scannerMessage.style.color = '#5cb85c';
    } catch (err) {
        console.error("Error al iniciar el escáner de QR:", err);
        scannerMessage.textContent = 'Error al iniciar la cámara. Asegúrate de permitir el acceso a la cámara y que no esté en uso por otra aplicación.';
        scannerMessage.style.color = '#d9534f';
        showToast("Error al iniciar el escáner de QR. Revisa permisos de cámara.", 'error'); // Usar toast
        stopQrScanner(); // Detener si hay un error de inicio para evitar estados inconsistentes
    }
}

async function stopQrScanner() {
    if (html5QrCodeScanner) {
        try {
            await html5QrCodeScanner.clear(); // Limpia y detiene la cámara
            console.log("Escáner QR detenido y limpiado.");
        } catch (error) {
            console.warn("Error al detener el escáner (puede ser normal si ya estaba parado):", error);
        }
    }
    html5QrCodeScanner = null; // Reinicia la instancia para una nueva sesión de escaneo
    qrScannerOverlay.classList.add('hidden'); // Oculta el overlay del escáner

    // Habilitar interacciones en el panel de administración principal
    adminSection.style.pointerEvents = 'auto';
    adminSection.style.opacity = '1';
    scannerMessage.textContent = ''; // Limpiar mensaje del escáner
}


// --- Manejadores de Eventos Principales ---

authBtn.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth)
            .then(() => {
                showToast("Sesión cerrada correctamente.", 'info'); // Usar toast
            })
            .catch(error => {
                console.error("Error al cerrar sesión:", error);
                showToast("Error al cerrar sesión: " + error.message, 'error'); // Usar toast
            });
    } else {
        signInWithPopup(auth, googleProvider)
            .then(() => {
                showToast("Sesión iniciada correctamente.", 'success'); // Usar toast
            })
            .catch(error => {
                console.error("Error al iniciar sesión:", error);
                let errorMessage = "Ocurrió un error al iniciar sesión.";
                if (error.code === 'auth/popup-blocked') {
                    errorMessage = "El navegador bloqueó la ventana de inicio de sesión. Por favor, permite las ventanas emergentes para este sitio.";
                } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                    errorMessage = "Has cerrado la ventana de inicio de sesión.";
                } else if (error.code === 'auth/operation-not-allowed') {
                    errorMessage = "El método de inicio de sesión con Google no está habilitado en Firebase. Contacta al administrador.";
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = "Error de red. Verifica tu conexión a internet.";
                }
                showToast(errorMessage + " (Código: " + error.code + ")", 'error', 7000); // Usar toast con más duración
            });
    }
});

// Event listeners para el escáner QR
scanQrBtn.addEventListener('click', startQrScanner);
closeScannerBtn.addEventListener('click', stopQrScanner);

// Event listener para el botón de búsqueda de cliente
searchClientBtn.addEventListener('click', async () => {
    const emailOrUidInput = adminEmailInput.value.trim();
    if (!emailOrUidInput) {
        showToast('Por favor, introduce el email o UID de un cliente para buscar.', 'warning'); // Usar toast
        clearAdminClientInfo();
        return;
    }

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Buscando cliente...'; // Mensaje de estado
    adminMessage.style.color = '#5bc0de';

    let clientIdToSearch = emailOrUidInput;

    // Intenta buscar por Email si el input parece un email
    if (emailOrUidInput.includes('@')) {
        const uid = await getUidByEmail(emailOrUidInput);
        if (uid) {
            clientIdToSearch = uid;
            console.log(`Email '${emailOrUidInput}' resuelto a UID: ${uid}`);
        } else {
            showToast(`No se encontró un cliente con el email: ${emailOrUidInput}. Intenta con un UID.`, 'warning', 5000); // Usar toast
            clearAdminClientInfo();
            enableAdminControlsAfterOperation();
            return;
        }
    }

    const clientDocRef = doc(db, 'loyaltyCards', clientIdToSearch);
    try {
        const docSnap = await getDoc(clientDocRef);
        // La función updateAdminClientDisplayAndControls recibe el UID y el docSnap (o null si no existe)
        await updateAdminClientDisplayAndControls(clientIdToSearch, docSnap);

        // Cargar y mostrar el historial de transacciones para el cliente seleccionado en el panel de administrador
        // Se carga el historial independientemente de si el documento existe o no,
        // la función loadAndDisplayHistory maneja el caso de "no transacciones".
        loadAndDisplayHistory(clientIdToSearch);

    } catch (error) {
        console.error("Error al cargar cliente en admin:", error);
        showToast(`Error al cargar cliente: ${error.message}`, 'error'); // Usar toast
        clearAdminClientInfo();
    } finally {
        enableAdminControlsAfterOperation();
        adminMessage.textContent = ''; // Limpiar el mensaje de estado
    }
});

// NUEVO: Event listener para la tecla 'Enter' en el campo de email/UID del admin
adminEmailInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Previene el comportamiento por defecto del formulario
        searchClientBtn.click(); // Activa la búsqueda
    }
});


// --- Manejador para Añadir Sello ---
addStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail || !currentUser) { // targetClientEmail es el UID del cliente cargado
        showToast('Por favor, busca y carga un cliente primero.', 'warning'); // Usar toast
        return;
    }

    // Obtener los sellos actuales mostrados en el panel del admin para usarlos como 'stampsBefore'
    const adminCurrentStampsElement = document.getElementById('admin-current-stamps');
    const stampsBefore = parseInt(adminCurrentStampsElement.textContent || '0');

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Añadiendo sello...'; // Mensaje de estado
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', targetClientEmail);

        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(clientDocRef);

            if (!docSnap.exists()) {
                // Si la tarjeta no existe, la creamos con 1 sello
                const newStamps = 1;
                transaction.set(clientDocRef, {
                    stamps: newStamps,
                    lastUpdate: new Date(),
                    userEmail: adminEmailInput.value.includes('@') ? adminEmailInput.value : targetClientEmail // Usar el email del input si es email, sino el UID
                });
                showToast(`Cliente creado y sello añadido. Total: ${newStamps}.`, 'success'); // Usar toast

                // Registrar la transacción de creación/primer sello
                await logTransaction(
                    targetClientEmail,
                    'add_stamp',
                    0,
                    newStamps,
                    'Primer sello añadido (tarjeta creada)',
                    currentUser.uid
                );

            } else {
                const currentStamps = docSnap.data().stamps || 0;
                if (currentStamps < MAX_STAMPS) {
                    const newStamps = currentStamps + 1;
                    transaction.update(clientDocRef, { stamps: newStamps, lastUpdate: new Date() });
                    showToast(`Sello añadido. Nuevo total: ${newStamps}.`, 'success'); // Usar toast

                    await logTransaction(
                        targetClientEmail,
                        'add_stamp',
                        currentStamps,
                        newStamps,
                        'Sello añadido por administrador',
                        currentUser.uid
                    );

                } else {
                    showToast('El cliente ya tiene el máximo de sellos. No se puede añadir más.', 'warning'); // Usar toast
                }
            }
        });
        loadAndDisplayHistory(targetClientEmail); // Actualizar el historial visible para el admin

    } catch (error) {
        console.error("Error al añadir sello:", error);
        showToast(`Error al añadir sello: ${error.message}`, 'error'); // Usar toast
    } finally {
        enableAdminControlsAfterOperation();
        loadAdminDashboardSummary(); // Actualiza el dashboard general
        adminMessage.textContent = ''; // Limpiar el mensaje de estado
    }
});

// --- Manejador para Quitar Sello ---
removeStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail || !currentUser) {
        showToast('Por favor, busca y carga un cliente primero.', 'warning'); // Usar toast
        return;
    }

    const adminCurrentStampsElement = document.getElementById('admin-current-stamps');
    const stampsBefore = parseInt(adminCurrentStampsElement.textContent || '0');

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Quitando sello...'; // Mensaje de estado
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', targetClientEmail);

        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(clientDocRef);

            if (!docSnap.exists()) {
                showToast(`Error: Tarjeta del cliente ${targetClientEmail} no encontrada.`, 'error'); // Usar toast
                return;
            }

            const currentStamps = docSnap.data().stamps || 0;
            if (currentStamps > 0) {
                const newStamps = currentStamps - 1;
                transaction.update(clientDocRef, { stamps: newStamps, lastUpdate: new Date() });
                showToast(`Sello quitado. Nuevo total: ${newStamps}.`, 'warning'); // Usar toast (warning porque es una acción de decremento)

                await logTransaction(
                    targetClientEmail,
                    'remove_stamp',
                    currentStamps,
                    newStamps,
                    'Sello quitado por administrador',
                    currentUser.uid
                );

            } else {
                showToast('El cliente ya tiene 0 sellos. No se puede quitar más.', 'info'); // Usar toast
            }
        });
        loadAndDisplayHistory(targetClientEmail);

    } catch (error) {
        console.error("Error al quitar sello:", error);
        showToast(`Error al quitar sello: ${error.message}`, 'error'); // Usar toast
    } finally {
        enableAdminControlsAfterOperation();
        loadAdminDashboardSummary();
        adminMessage.textContent = ''; // Limpiar el mensaje de estado
    }
});


// --- Manejador para Canjear Café ---
redeemCoffeeBtn.addEventListener('click', async () => {
    if (!targetClientEmail || !currentUser) {
        showToast('Por favor, busca y carga un cliente primero.', 'warning'); // Usar toast
        return;
    }

    const adminCurrentStampsElement = document.getElementById('admin-current-stamps');
    const stampsBefore = parseInt(adminCurrentStampsElement.textContent || '0');

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Canjeando café...'; // Mensaje de estado
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', targetClientEmail);

        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(clientDocRef);

            if (!docSnap.exists()) {
                showToast(`Error: Tarjeta del cliente ${targetClientEmail} no encontrada.`, 'error'); // Usar toast
                return;
            }

            const currentStamps = docSnap.data().stamps || 0;
            if (currentStamps >= MAX_STAMPS) {
                const newStamps = 0; // Reiniciar sellos después de canjear
                transaction.update(clientDocRef, { stamps: newStamps, lastUpdate: new Date() });
                showToast(`Café canjeado. Sellos reiniciados a ${newStamps}. ¡Felicidades!`, 'success', 5000); // Usar toast

                await logTransaction(
                    targetClientEmail,
                    'redeem_coffee',
                    currentStamps,
                    newStamps,
                    'Café gratis canjeado por administrador',
                    currentUser.uid
                );

            } else {
                showToast(`El cliente necesita ${MAX_STAMPS - currentStamps} sellos más para canjear un café.`, 'info'); // Usar toast
            }
        });
        loadAndDisplayHistory(targetClientEmail);

    } catch (error) {
        console.error("Error al canjear café:", error);
        showToast(`Error al canjear café: ${error.message}`, 'error'); // Usar toast
    } finally {
        enableAdminControlsAfterOperation();
        loadAdminDashboardSummary();
        adminMessage.textContent = ''; // Limpiar el mensaje de estado
    }
});


// --- Manejador para Reiniciar Tarjeta (Resetear Sellos) ---
resetStampsBtn.addEventListener('click', async () => {
    if (!targetClientEmail || !currentUser) {
        showToast('Por favor, busca y carga un cliente primero.', 'warning'); // Usar toast
        return;
    }

    const adminCurrentStampsElement = document.getElementById('admin-current-stamps');
    const stampsBefore = parseInt(adminCurrentStampsElement.textContent || '0');

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Reiniciando tarjeta...'; // Mensaje de estado
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', targetClientEmail);

        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(clientDocRef);

            if (!docSnap.exists()) {
                // Si la tarjeta no existe, la creamos con 0 sellos al reiniciar
                const newStamps = 0;
                transaction.set(clientDocRef, {
                    stamps: newStamps,
                    lastUpdate: new Date(),
                    userEmail: adminEmailInput.value.includes('@') ? adminEmailInput.value : targetClientEmail // Usar el email del input si es email, sino el UID
                });
                showToast(`Cliente creado y tarjeta reiniciada (0 sellos).`, 'info'); // Usar toast

                await logTransaction(
                    targetClientEmail,
                    'reset_stamps',
                    0,
                    newStamps,
                    'Tarjeta creada/reiniciada a 0 sellos',
                    currentUser.uid
                );

            } else {
                const currentStamps = docSnap.data().stamps || 0;
                const newStamps = 0;
                transaction.update(clientDocRef, { stamps: newStamps, lastUpdate: new Date() });
                showToast(`Tarjeta reiniciada a ${newStamps} sellos.`, 'info'); // Usar toast

                await logTransaction(
                    targetClientEmail,
                    'reset_stamps',
                    currentStamps,
                    newStamps,
                    'Tarjeta reiniciada por administrador',
                    currentUser.uid
                );
            }
        });
        loadAndDisplayHistory(targetClientEmail);

    } catch (error) {
        console.error("Error al reiniciar tarjeta:", error);
        showToast(`Error al reiniciar tarjeta: ${error.message}`, 'error'); // Usar toast
    } finally {
        enableAdminControlsAfterOperation();
        loadAdminDashboardSummary();
        adminMessage.textContent = ''; // Limpiar el mensaje de estado
    }
});
