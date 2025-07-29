// --- Importaciones de Firebase SDK (Versión 9 Modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Configuración de Firebase (TUS CREDENCIALES) ---
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
let currentStamps = 0;
let currentUser = null; // Guardará el objeto de usuario de Firebase
let adminUserEmail = 'worm.jim@gmail.com'; // Correo del administrador
let clientListener = null; // Para almacenar el listener de Firestore del cliente actual
let adminClientListener = null; // Para almacenar el listener de Firestore del cliente en el panel de admin
let targetClientEmail = null; // Para almacenar el email del cliente en el panel de admin (ahora se usará para UID en admin)

// --- Elementos del DOM ---
const userDisplay = document.getElementById('user-display');
const authBtn = document.getElementById('auth-btn');
const adminSection = document.getElementById('admin-section');
const adminEmailInput = document.getElementById('admin-email-input');
const searchClientBtn = document.getElementById('search-client-btn');
const adminClientInfo = document.getElementById('admin-client-info');
const addStampBtn = document.getElementById('add-stamp-btn');
const removeStampBtn = document.getElementById('remove-stamp-btn');
const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
const resetStampsBtn = document.getElementById('reset-stamps-btn');
const adminMessage = document.getElementById('admin-message');
const messageDisplay = document.getElementById('message');
const confettiContainer = document.querySelector('.confetti-container');
const loyaltyCardSection = document.getElementById('loyalty-card');


// --- Funciones de UI ---

function renderStamps(stampsCount) {
    const stampsDisplay = document.getElementById('stamps-display');
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes
    const maxStamps = 10;

    for (let i = 0; i < maxStamps; i++) {
        const stamp = document.createElement('div');
        stamp.classList.add('stamp');
        if (i < stampsCount) {
            stamp.classList.add('obtained'); // Usamos 'obtained' como clase para sellos llenos
            stamp.innerHTML = '☕'; // Icono de taza de café
        } else {
            stamp.textContent = (i + 1); // Número del sello
        }
        stampsDisplay.appendChild(stamp);
    }

    if (stampsCount >= maxStamps) {
        messageDisplay.innerHTML = '¡Felicidades! Has ganado un café gratis. 🎉';
        messageDisplay.style.color = '#2e8b57';
        showConfetti();
    } else {
        messageDisplay.textContent = `¡Casi lo tienes! Te faltan ${maxStamps - stampsCount} sellos para tu café gratis.`;
        messageDisplay.style.color = '#555';
        hideConfetti();
    }
}

function showConfetti() {
    confettiContainer.classList.add('active');
    document.querySelectorAll('.confetti').forEach(confetti => {
        confetti.style.animation = 'none';
        confetti.offsetHeight;
        setTimeout(() => {
            const randomAnimation = `confetti-fall-${Math.floor(Math.random() * 5) + 1}`;
            const style = window.getComputedStyle(confetti);
            const initialDelay = parseFloat(style.animationDelay) || 0;
            confetti.style.animation = `${randomAnimation} 2s ${initialDelay}s ease-out forwards`;
        }, 0);
    });
    setTimeout(() => {
        confettiContainer.classList.remove('active');
    }, 3000);
}

function hideConfetti() {
    confettiContainer.classList.remove('active');
}

// Controla la habilitación/deshabilitación y estilos de los botones de acción del admin
function setAdminControlsEnabled(enabled, allowAddAndResetOnly = false) {
    if (enabled) {
        addStampBtn.style.backgroundColor = '#28a745';
        removeStampBtn.style.backgroundColor = allowAddAndResetOnly ? '#ccc' : '#dc3545';
        redeemCoffeeBtn.style.backgroundColor = allowAddAndResetOnly ? '#ccc' : '#17a2b8';
        resetStampsBtn.style.backgroundColor = '#6c757d';

        addStampBtn.disabled = false;
        removeStampBtn.disabled = allowAddAndResetOnly;
        redeemCoffeeBtn.disabled = allowAddAndResetOnly;
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
    setAdminControlsEnabled(false); // Deshabilita los botones de acción
    searchClientBtn.disabled = true;
    adminEmailInput.disabled = true;
    adminSection.style.cursor = 'wait'; // Cambia el cursor
}

// Habilita los controles del panel de administración (después de una operación)
function enableAdminControlsAfterOperation() {
    searchClientBtn.disabled = false;
    adminEmailInput.disabled = false;
    adminSection.style.cursor = 'default'; // Restaura el cursor
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

onAuthStateChanged(auth, async user => {
    console.log("onAuthStateChanged: Estado de autenticación cambiado. Usuario:", user ? user.email : "null");
    if (user) {
        currentUser = user;
        userDisplay.textContent = `Bienvenido, ${currentUser.displayName || currentUser.email}`;
        authBtn.textContent = 'Cerrar Sesión';
        loyaltyCardSection.classList.remove('hidden');

        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false);
            clearAdminClientInfo();

            if (clientListener) {
                clientListener();
                clientListener = null;
            }

        } else {
            adminSection.classList.add('hidden');
            if (adminClientListener) {
                adminClientListener();
                adminClientListener = null;
            }
        }

        // Mostrar estado de carga para el usuario normal
        messageDisplay.textContent = "Cargando tu tarjeta de lealtad...";
        messageDisplay.style.color = '#5bc0de';
        loadAndListenForStamps(currentUser.uid);

    } else {
        currentUser = null;
        userDisplay.textContent = 'Por favor, inicia sesión.';
        authBtn.textContent = 'Iniciar Sesión con Google';
        loyaltyCardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        renderStamps(0);
        messageDisplay.textContent = 'Inicia sesión para ver tu tarjeta de lealtad.';
        messageDisplay.style.color = '#555';
        hideConfetti();

        if (clientListener) {
            clientListener();
            clientListener = null;
        }
        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }
        clearAdminClientInfo();
    }
});


async function loadAndListenForStamps(uid) {
    console.log(`loadAndListenForStamps: Intentando cargar sellos para el UID: ${uid}`);
    if (!uid) {
        console.error("loadAndListenForStamps: No se proporcionó un UID.");
        // messageDisplay ya debería tener un mensaje de carga o de inicio de sesión
        return;
    }

    const docRef = doc(db, 'loyaltyCards', uid);
    console.log(`loadAndListenForStamps: Referencia del documento: loyaltyCards/${uid}`);

    if (clientListener) {
        clientListener();
        clientListener = null;
    }

    clientListener = onSnapshot(docRef, docSnapshot => {
        console.log("onSnapshot callback: Recibiendo datos del documento.");
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const stamps = data.stamps || 0;
            console.log(`onSnapshot: Documento existe. Sellos: ${stamps}`);
            renderStamps(stamps); // Esto actualizará messageDisplay
        } else {
            console.log(`onSnapshot: Documento NO existe para ${uid}. Intentando crear.`);
            renderStamps(0); // Esto actualizará messageDisplay
            messageDisplay.textContent = '¡Bienvenido! Tu nueva tarjeta de lealtad ha sido creada.'; // Mensaje más amigable
            messageDisplay.style.color = '#555';
            if (currentUser && currentUser.uid === uid) {
                 setDoc(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: currentUser.email })
                    .then(() => console.log(`setDoc: Tarjeta inicial creada para UID: ${uid}`))
                    .catch(e => console.error("setDoc: Error al crear la tarjeta inicial:", e));
            }
        }
    }, error => {
        console.error("onSnapshot ERROR: Error al cargar o escuchar la tarjeta de lealtad:", error);
        messageDisplay.textContent = `Lo sentimos, no pudimos cargar tu tarjeta de lealtad. Por favor, intenta de nuevo.`;
        messageDisplay.style.color = '#d9534f';
    });
}

// Nueva función auxiliar para actualizar la visualización y controles del admin
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
        setAdminControlsEnabled(true); // Habilita todos los controles si el cliente existe
        adminMessage.textContent = `Cliente ${clientEmailDisplay} cargado correctamente.`;
        adminMessage.style.color = '#5cb85c';

        if (adminClientListener) adminClientListener(); // Desuscribir listener antiguo
        const clientDocRef = doc(db, 'loyaltyCards', clientId);
        adminClientListener = onSnapshot(clientDocRef, snap => {
            if (snap.exists()) {
                const latestStamps = snap.data().stamps || 0;
                document.getElementById('admin-current-stamps').textContent = latestStamps;
                if (latestStamps >= 10) {
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
            adminMessage.textContent = `Error al actualizar los sellos del cliente en tiempo real. Detalles: ${error.message}`; // Mensaje más específico
            adminMessage.style.color = '#d9534f';
        });

    } else { // Document does NOT exist
        clearAdminClientInfo();
        targetClientEmail = clientId; // Aún permite establecer el target para crear uno nuevo
        adminMessage.textContent = `Cliente con UID ${clientId} no encontrado. Puedes añadirle un sello para crear su tarjeta.`;
        adminMessage.style.color = '#f0ad4e';
        setAdminControlsEnabled(true, true); // Solo añadir y resetear (resetear significa crear con 0)
    }
}


// --- Manejadores de Eventos ---

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

searchClientBtn.addEventListener('click', async () => {
    const clientId = adminEmailInput.value.trim();
    if (!clientId) {
        adminMessage.textContent = 'Por favor, introduce el UID de un cliente para buscar.';
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        return;
    }

    disableAdminControlsTemporarily(); // Deshabilitar controles mientras se busca
    adminMessage.textContent = 'Buscando cliente...';
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', clientId);
        console.log(`Admin search: Buscando documento para UID: ${clientId}`);

        const clientDoc = await getDoc(clientDocRef);
        console.log(`Admin search: Resultado de getDoc para UID: ${clientId}. Existe: ${clientDoc.exists()}`);

        await updateAdminClientDisplayAndControls(clientId, clientDoc); // Usar la nueva función

    } catch (error) {
        console.error("searchClientBtn ERROR: Error al buscar cliente:", error);
        adminMessage.textContent = `Error al buscar el cliente. Por favor, verifica el UID e intenta de nuevo.`;
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo(); // Asegurarse de limpiar info y deshabilitar en caso de error
    } finally {
        enableAdminControlsAfterOperation(); // Habilitar controles de nuevo
    }
});

addStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily(); // Deshabilitar controles mientras se procesa
    adminMessage.textContent = 'Añadiendo sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            let currentStamps = 0;
            let userEmail = '';
            if (docSnapshot.exists()) {
                currentStamps = docSnapshot.data().stamps || 0;
                userEmail = docSnapshot.data().userEmail || '';
            } else {
                console.log(`addStampBtn: Documento no existe para UID: ${targetClientEmail}. Creando con 0 sellos.`);
                // Al crear, podemos intentar obtener el email del usuario si se autenticó antes para ese UID
                // Esto es solo si el admin añade un sello a un UID que nunca antes se autenticó.
                // Podría ser un escenario complejo para manejar el email aquí sin Auth Admin SDK.
                // Por ahora, se crea con el UID como identificador principal.
                transaction.set(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: userEmail });
            }

            if (currentStamps < MAX_STAMPS) {
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `¡Sello añadido con éxito a ${userEmail || targetClientEmail}! Sellos actuales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            } else {
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `Sello extra añadido a ${userEmail || targetClientEmail}. Sellos totales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            }
        });
        // Después de la transacción, actualiza la info del cliente para reflejar los cambios
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        const updatedDocSnap = await getDoc(docRef);
        await updateAdminClientDisplayAndControls(targetClientEmail, updatedDocSnap);

    } catch (error) {
        console.error("addStampBtn ERROR: Error al añadir sello:", error);
        adminMessage.textContent = `Error al añadir el sello. Por favor, revisa y vuelve a intentarlo.`;
        adminMessage.style.color = '#d9534f';
    } finally {
        enableAdminControlsAfterOperation(); // Habilitar controles de nuevo
    }
});

removeStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Quitando sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (docSnapshot.exists()) {
                const currentStamps = docSnapshot.data().stamps || 0;
                const userEmail = docSnapshot.data().userEmail || targetClientEmail;
                if (currentStamps > 0) {
                    transaction.update(docRef, { stamps: currentStamps - 1, lastUpdate: new Date() });
                    adminMessage.textContent = `Sello quitado con éxito de ${userEmail}. Sellos actuales: ${currentStamps - 1}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${userEmail} no tiene sellos para quitar.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta de lealtad.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
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

redeemCoffeeBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    disableAdminControlsTemporarily();
    adminMessage.textContent = 'Canjeando café...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (docSnapshot.exists()) {
                const currentStamps = docSnapshot.data().stamps || 0;
                const userEmail = docSnapshot.data().userEmail || targetClientEmail;
                if (currentStamps >= MAX_STAMPS) {
                    transaction.update(docRef, { stamps: currentStamps - MAX_STAMPS, lastUpdate: new Date() });
                    adminMessage.textContent = `¡Café canjeado para ${userEmail}! Sellos restantes: ${currentStamps - MAX_STAMPS}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${userEmail} no tiene suficientes sellos (${currentStamps}/${MAX_STAMPS}) para canjear un café.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta de lealtad.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
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

resetStampsBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    const userEmailForConfirm = adminClientInfo.querySelector('strong').textContent.split(' ')[0] || targetClientEmail;
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

        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
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


// Inicializar el display al cargar la página (para mostrar 0 sellos si no hay sesión)
document.addEventListener('DOMContentLoaded', () => {
    renderStamps(0);
});
