// --- Importaciones de Firebase SDK (Versión 9 Modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, onSnapshot, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Configuración de Firebase (TUS CREDENCIALES) ---
// ASEGÚRATE DE QUE ESTAS CREDENCIALES SON LAS CORRECTAS DE TU PROYECTO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo", 
    authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
    projectId: "mi-cafeteria-lealtad",
    storageBucket: "mi-cafeteria-lealtad.firebasestorage.app",
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
let targetClientEmail = null; 

// --- Elementos del DOM ---
const userDisplay = document.getElementById('user-display');
const authBtn = document.getElementById('auth-btn');

// Elementos de la tarjeta de lealtad (usuario normal)
const loyaltyCardSection = document.getElementById('loyalty-card');
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const confettiContainer = document.querySelector('.confetti-container');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const qrInstruction = document.getElementById('qr-instruction');

// Elementos del panel de administración
const adminSection = document.getElementById('admin-section');
const adminEmailInput = document.getElementById('admin-email-input');
const searchClientBtn = document.getElementById('search-client-btn');
const adminClientInfo = document.getElementById('admin-client-info');
const addStampBtn = document.getElementById('add-stamp-btn');
const removeStampBtn = document.getElementById('remove-stamp-btn');
const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
const resetStampsBtn = document.getElementById('reset-stamps-btn');
const adminMessage = document.getElementById('admin-message');

// --- NUEVOS Elementos del DOM para el Escáner QR ---
const scanQrBtn = document.getElementById('scan-qr-btn');
const qrScannerOverlay = document.getElementById('qr-scanner-overlay');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const scannerMessage = document.getElementById('scanner-message');

let html5QrCodeScanner = null; // Variable para la instancia de html5-qrcode

// --- Funciones de UI ---

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
    adminMessage.textContent = '';
}

// --- Funciones de Firebase y Lógica de la Aplicación ---

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

// Observador del estado de autenticación de Firebase
onAuthStateChanged(auth, async user => {
    console.log("onAuthStateChanged: Estado de autenticación cambiado. Usuario:", user ? user.email : "null");
    if (user) {
        currentUser = user;
        userDisplay.textContent = `Bienvenido, ${currentUser.displayName || currentUser.email}`;
        authBtn.textContent = 'Cerrar Sesión';
        loyaltyCardSection.classList.remove('hidden');

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
                }).catch(e => console.error("Error al crear la tarjeta inicial:", e));
            } else {
                const currentEmailInDb = userDocSnap.data().userEmail;
                if (currentEmailInDb !== currentUser.email) {
                    await updateDoc(userDocRef, { userEmail: currentUser.email });
                    console.log(`Email del usuario actualizado en DB para UID: ${currentUser.uid}`);
                }
            }
        }

        // Lógica para mostrar/ocultar panel de administración
        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false); // Inicia deshabilitado
            clearAdminClientInfo(); // Limpia info de cliente
            enableAdminControlsAfterOperation(); // Habilita búsqueda y escaneo al inicio para el admin
            
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
        } else { // Este es un usuario normal (no admin)
            adminSection.classList.add('hidden');
            stopQrScanner(); // Asegurarse de que el escáner se detenga si se cambia a usuario normal
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
        }

        messageDisplay.textContent = "Cargando tu tarjeta de lealtad...";
        messageDisplay.style.color = '#5bc0de';
        loadAndListenForStamps(currentUser.uid);

    } else { // No hay usuario autenticado
        currentUser = null;
        userDisplay.textContent = 'Por favor, inicia sesión.';
        authBtn.textContent = 'Iniciar Sesión con Google';
        loyaltyCardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        renderStamps(0); // Muestra 0 sellos
        messageDisplay.textContent = 'Inicia sesión para ver tu tarjeta de lealtad.';
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
        clearAdminClientInfo();
        stopQrScanner(); // Asegurarse de que el escáner se detenga al cerrar sesión
        // Asegúrate de ocultar el QR del cliente cuando no hay sesión
        if (qrcodeCanvas && qrInstruction) {
            qrcodeCanvas.style.display = 'none';
            qrInstruction.style.display = 'none';
        }
    }
});

// Función para cargar y escuchar cambios en los sellos del usuario actual
async function loadAndListenForStamps(uid) {
    console.log(`loadAndListenForStamps: Intentando cargar sellos para el UID: ${uid}`);
    if (!uid) {
        console.error("loadAndListenForStamps: No se proporcionó un UID.");
        return;
    }

    const docRef = doc(db, 'loyaltyCards', uid);

    if (clientListener) { // Desuscribir listener previo si existe
        clientListener();
        clientListener = null;
    }

    clientListener = onSnapshot(docRef, docSnapshot => {
        console.log("onSnapshot callback (cliente): Recibiendo datos del documento.");
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const stamps = data.stamps || 0;
            console.log(`[CLIENTE] Sellos recibidos del documento para UID ${uid}: ${stamps}`);
            renderStamps(stamps);
        } else {
            console.log(`onSnapshot (cliente): Documento NO existe para ${uid}.`);
            renderStamps(0);
            messageDisplay.textContent = '¡Bienvenido! Tu nueva tarjeta de lealtad ha sido creada.';
            messageDisplay.style.color = '#555';
            // Crear la tarjeta inicial si no existe, solo si es el usuario actual logueado
            if (currentUser && currentUser.uid === uid) {
                 setDoc(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: currentUser.email })
                    .then(() => console.log(`setDoc: Tarjeta inicial creada para UID: ${uid}`))
                    .catch(e => console.error("setDoc: Error al crear la tarjeta inicial:", e));
            }
        }
    }, error => {
        console.error("onSnapshot ERROR (cliente): Error al cargar o escuchar la tarjeta de lealtad:", error);
        messageDisplay.textContent = `Lo sentimos, no pudimos cargar tu tarjeta de lealtad. Por favor, intenta de nuevo.`;
        messageDisplay.style.color = '#d9534f';
    });
}

// Función auxiliar para actualizar la visualización y controles del admin
async function updateAdminClientDisplayAndControls(clientId, docSnapshot) {
    if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const stamps = data.stamps || 0;
        const clientEmailDisplay = data.userEmail || clientId;
        targetClientEmail = clientId; // targetClientEmail ahora almacena el UID

        adminClientInfo.innerHTML = `
            <p>Cliente: <strong>${clientEmailDisplay}</strong> (UID: ${clientId})</p>
            <p>Sellos actuales: <strong id="admin-current-stamps">${stamps}</strong></p>
        `;
        setAdminControlsEnabled(true, false, stamps);
        adminMessage.textContent = `Cliente ${clientEmailDisplay} cargado correctamente.`;
        adminMessage.style.color = '#5cb85c';

        if (adminClientListener) adminClientListener(); // Desuscribir listener antiguo
        const clientDocRef = doc(db, 'loyaltyCards', clientId);
        adminClientListener = onSnapshot(clientDocRef, snap => {
            if (snap.exists()) {
                const latestStamps = snap.data().stamps || 0;
                console.log(`[ADMIN LISTENER] Sellos recibidos del documento para UID ${clientId}: ${latestStamps}`);
                document.getElementById('admin-current-stamps').textContent = latestStamps;
                setAdminControlsEnabled(true, false, latestStamps);
                if (latestStamps >= MAX_STAMPS) {
                    adminMessage.textContent = `Cliente ${clientEmailDisplay} tiene ${latestStamps} sellos (¡café gratis!).`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `Cliente ${clientEmailDisplay} cargado correctamente.`;
                    adminMessage.style.color = '#5cb85c';
                }
            } else {
                clearAdminClientInfo();
                adminMessage.textContent = `El cliente con UID ${clientId} ya no existe en la base de datos.`;
                adminMessage.style.color = '#d9534f';
            }
        }, error => {
            console.error("Admin onSnapshot ERROR (desde updateAdminClientDisplayAndControls):", error);
            adminMessage.textContent = `Error al actualizar los sellos del cliente en tiempo real. Detalles: ${error.message}`;
            adminMessage.style.color = '#d9534f';
        });

    } else { // Document does NOT exist
        clearAdminClientInfo();
        targetClientEmail = clientId;
        adminMessage.textContent = `Cliente con UID ${clientId} no encontrado. Puedes añadirle un sello para crear su tarjeta.`;
        adminMessage.style.color = '#f0ad4e';
        setAdminControlsEnabled(true, true, 0); // Solo añadir y resetear (resetear significa crear con 0)
    }
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
        qrInstruction.textContent = "Error al generar el código QR. Por favor, recarga la página.";
        qrInstruction.style.color = '#d9534f';
    }
}


// --- NUEVAS Funciones para el Escáner QR (usa html5-qrcode) ---

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
        adminEmailInput.value = decodedText; // Pega el UID decodificado en el input
        stopQrScanner(); // Detiene el escáner automáticamente

        // Simula un clic en el botón de búsqueda después de un pequeño retraso
        // Esto permite que el DOM se actualice con el valor del input antes de buscar
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
            .catch(error => {
                console.error("Error al cerrar sesión:", error);
                alert("Error al cerrar sesión: " + error.message);
            });
    } else {
        signInWithPopup(auth, googleProvider)
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
                alert(errorMessage + " (Código: " + error.code + ")");
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
        adminMessage.textContent = 'Por favor, introduce el email o UID de un cliente para buscar.';
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        return;
    }

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Buscando cliente...';
    adminMessage.style.color = '#5bc0de';

    let clientIdToSearch = emailOrUidInput;

    // Intenta buscar por Email si el input parece un email
    if (emailOrUidInput.includes('@') && emailOrUidInput.includes('.')) {
        console.log(`searchClientBtn: Input parece un email, intentando buscar UID por email: ${emailOrUidInput}`);
        const uidFromEmail = await getUidByEmail(emailOrUidInput);
        if (uidFromEmail) {
            clientIdToSearch = uidFromEmail;
        } else {
            adminMessage.textContent = `Cliente con email "${emailOrUidInput}" no encontrado.`;
            adminMessage.style.color = '#f0ad4e';
            clearAdminClientInfo();
            enableAdminControlsAfterOperation();
            return;
        }
    } else {
        console.log(`searchClientBtn: Input parece un UID, buscando directamente: ${emailOrUidInput}`);
    }

    try {
        const clientDocRef = doc(db, 'loyaltyCards', clientIdToSearch);
        const clientDoc = await getDoc(clientDocRef);

        await updateAdminClientDisplayAndControls(clientIdToSearch, clientDoc);

    } catch (error) {
        console.error("searchClientBtn ERROR: Error al buscar cliente:", error);
        adminMessage.textContent = `Error al buscar el cliente. Por favor, verifica el email/UID e intenta de nuevo.`;
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
    } finally {
        enableAdminControlsAfterOperation();
    }
});

// Event listener para añadir sello
addStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Añadiendo sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        let updatedStamps = 0;

        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            let currentStamps = 0;
            let userEmail = '';

            if (docSnapshot.exists()) {
                currentStamps = docSnapshot.data().stamps || 0;
                userEmail = docSnapshot.data().userEmail || '';
            } else {
                console.log(`addStampBtn: Documento no existe para UID: ${targetClientEmail}. Creando con 0 sellos.`);
                transaction.set(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: userEmail || 'desconocido' });
            }

            if (currentStamps < MAX_STAMPS) {
                updatedStamps = currentStamps + 1;
                transaction.update(docRef, { stamps: updatedStamps, lastUpdate: new Date() });
                adminMessage.textContent = `¡Sello añadido con éxito a ${userEmail || targetClientEmail}! Sellos actuales: ${updatedStamps}`;
                adminMessage.style.color = '#5cb85c';
            } else {
                updatedStamps = currentStamps;
                adminMessage.textContent = `El cliente ${userEmail || targetClientEmail} ya tiene ${MAX_STAMPS} sellos o más. Debe canjear su café primero.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });

        const updatedDocSnap = await getDoc(docRef);
        await updateAdminClientDisplayAndControls(targetClientEmail, updatedDocSnap);

    } catch (error) {
        console.error("addStampBtn ERROR: Error al añadir sello:", error);
        adminMessage.textContent = `Error al añadir el sello. Por favor, revisa y vuelve a intentarlo.`;
        adminMessage.style.color = '#d9534f';
    } finally {
        enableAdminControlsAfterOperation();
    }
});

// Event listener para quitar sello
removeStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Quitando sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        let newStampsAfterRemove = 0;

        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (docSnapshot.exists()) {
                const currentStamps = docSnapshot.data().stamps || 0;
                const userEmail = docSnapshot.data().userEmail || targetClientEmail;
                if (currentStamps > 0) {
                    newStampsAfterRemove = currentStamps - 1;
                    transaction.update(docRef, { stamps: newStampsAfterRemove, lastUpdate: new Date() });
                    adminMessage.textContent = `Sello quitado con éxito de ${userEmail}. Sellos actuales: ${newStampsAfterRemove}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    newStampsAfterRemove = currentStamps;
                    adminMessage.textContent = `El cliente ${userEmail} no tiene sellos para quitar.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                newStampsAfterRemove = 0;
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta de lealtad.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
        const updatedDocSnap = await getDoc(docRef);
        await updateAdminClientDisplayAndControls(targetClientEmail, updatedDocSnap);

    } catch (error) {
        console.error("removeStampBtn ERROR: Error al quitar sello:", error);
        adminMessage.textContent = `Error al quitar el sello. Por favor, revisa y vuelve a intentarlo.`;
        adminMessage.style.color = '#d9534f';
    } finally {
        enableAdminControlsAfterOperation();
    }
});

// Event listener para canjear café
redeemCoffeeBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Canjeando café...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        let newStampsAfterRedeem = 0;

        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (docSnapshot.exists()) {
                const currentStamps = docSnapshot.data().stamps || 0;
                const userEmail = docSnapshot.data().userEmail || targetClientEmail;
                if (currentStamps >= MAX_STAMPS) {
                    newStampsAfterRedeem = currentStamps - MAX_STAMPS;
                    transaction.update(docRef, { stamps: newStampsAfterRedeem, lastUpdate: new Date() });
                    adminMessage.textContent = `¡Café canjeado para ${userEmail}! Sellos restantes: ${newStampsAfterRedeem}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    newStampsAfterRedeem = currentStamps;
                    adminMessage.textContent = `El cliente ${userEmail} no tiene suficientes sellos (${currentStamps}/${MAX_STAMPS}) para canjear un café.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
S                newStampsAfterRedeem = 0;
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta de lealtad.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
        const updatedDocSnap = await getDoc(docRef);
        await updateAdminClientDisplayAndControls(targetClientEmail, updatedDocSnap);

    } catch (error) {
        console.error("redeemCoffeeBtn ERROR: Error al canjear café:", error);
        adminMessage.textContent = `Error al canjear el café. Por favor, revisa y vuelve a intentarlo.`;
        adminMessage.style.color = '#d9534f';
    } finally {
        enableAdminControlsAfterOperation();
    }
});

// Event listener para reiniciar tarjeta
resetStampsBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    const clientInfoElement = adminClientInfo.querySelector('strong');
    const userEmailForConfirm = clientInfoElement ? clientInfoElement.textContent.split(' ')[0] : targetClientEmail;

    if (!confirm(`¿Estás seguro de que quieres reiniciar la tarjeta de ${userEmailForConfirm}? Esto pondrá sus sellos a 0.`)) {
        return;
    }

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Reiniciando tarjeta...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await setDoc(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: userEmailForConfirm }, { merge: true })
            .then(() => {
                adminMessage.textContent = `¡Tarjeta de ${userEmailForConfirm} reiniciada a 0 sellos con éxito!`;
                adminMessage.style.color = '#5cb85c';
            })
            .catch((error) => {
                console.error("resetStampsBtn ERROR: Error al reiniciar tarjeta:", error);
                adminMessage.textContent = `Error al reiniciar la tarjeta. Por favor, revisa y vuelve a intentarlo.`;
                adminMessage.style.color = '#d9534f';
            });

        const updatedDocSnap = await getDoc(docRef);
        await updateAdminClientDisplayAndControls(targetClientEmail, updatedDocSnap);

    } catch (error) {
        console.error("resetStampsBtn ERROR (fuera de setDoc): Error al reiniciar tarjeta:", error);
        adminMessage.textContent = `Error al reiniciar la tarjeta. Por favor, revisa y vuelve a intentarlo.`;
        adminMessage.style.color = '#d9534f';
    } finally {
        enableAdminControlsAfterOperation();
    }
});


// Inicializar el display al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderStamps(0);
});
