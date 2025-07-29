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
let targetClientEmail = null; // Para almacenar el email del cliente en el panel de admin

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
const loyaltyCardSection = document.getElementById('loyalty-card'); // Asegúrate de que este ID exista en tu HTML


// --- Funciones de UI ---

function renderStamps(stampsCount) {
    const stampsDisplay = document.getElementById('stamps-display');
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes
    const maxStamps = 10; // Redefinido localmente para esta función

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

    if (stampsCount >= maxStamps) { // Cambiado a >= para manejar sellos extra
        messageDisplay.innerHTML = '¡Felicidades! Has ganado un café gratis. 🎉';
        messageDisplay.style.color = '#2e8b57'; // Color verde para el mensaje de éxito
        showConfetti();
    } else {
        messageDisplay.textContent = `Te faltan ${maxStamps - stampsCount} sellos para tu café gratis.`;
        messageDisplay.style.color = '#555'; // Color normal
        hideConfetti();
    }
}

function showConfetti() {
    confettiContainer.classList.add('active');
    // Reiniciar las animaciones del confeti para que se disparen de nuevo
    document.querySelectorAll('.confetti').forEach(confetti => {
        confetti.style.animation = 'none'; // Detener animación
        confetti.offsetHeight; // Truco para forzar un reflow/repaint
        setTimeout(() => {
            const randomAnimation = `confetti-fall-${Math.floor(Math.random() * 5) + 1}`;
            // Intenta leer el retraso original del CSS o establece 0s si no existe
            const style = window.getComputedStyle(confetti);
            const initialDelay = parseFloat(style.animationDelay) || 0;
            confetti.style.animation = `${randomAnimation} 2s ${initialDelay}s ease-out forwards`;
        }, 0);
    });
    // Ocultar confeti después de un tiempo
    setTimeout(() => {
        confettiContainer.classList.remove('active');
    }, 3000); // 3 segundos
}

function hideConfetti() {
    confettiContainer.classList.remove('active');
}


function setAdminControlsEnabled(enabled, allowAddAndResetOnly = false) {
    addStampBtn.disabled = !enabled;
    removeStampBtn.disabled = !enabled || allowAddAndResetOnly;
    redeemCoffeeBtn.disabled = !enabled || allowAddAndResetOnly;
    resetStampsBtn.disabled = !enabled;

    addStampBtn.style.backgroundColor = enabled ? '#28a745' : '#ccc';
    removeStampBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#dc3545' : '#ccc';
    redeemCoffeeBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#17a2b8' : '#ccc';
    resetStampsBtn.style.backgroundColor = enabled ? '#6c757d' : '#ccc';
}

function clearAdminClientInfo() {
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    setAdminControlsEnabled(false);
    targetClientEmail = null; // Mantener para el input del admin, pero la búsqueda usará el UID
    if (adminClientListener) {
        adminClientListener();
        adminClientListener = null;
    }
    adminMessage.textContent = '';
}

// --- Funciones de Firebase y Lógica de la Aplicación ---

onAuthStateChanged(auth, async user => {
    console.log("onAuthStateChanged: Estado de autenticación cambiado. Usuario:", user ? user.email : "null"); // DEBUG
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

        // *** CAMBIO CLAVE AQUÍ: Usar currentUser.uid para el cliente normal ***
        loadAndListenForStamps(currentUser.uid);

    } else {
        currentUser = null;
        userDisplay.textContent = 'Por favor, inicia sesión.';
        authBtn.textContent = 'Iniciar Sesión con Google';
        loyaltyCardSection.classList.add('hidden');
        adminSection.classList.add('hidden');
        renderStamps(0); // Limpiar sellos al cerrar sesión
        messageDisplay.textContent = 'Inicia sesión para ver tu tarjeta de lealtad.';
        messageDisplay.style.color = '#555'; // Resetear color del mensaje
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


// *** CAMBIO CLAVE AQUÍ: Ahora la función espera un UID, no un email, para las operaciones de Firestore del CLIENTE ***
async function loadAndListenForStamps(uid) {
    console.log(`loadAndListenForStamps: Intentando cargar sellos para el UID: ${uid}`); // DEBUG
    if (!uid) {
        console.error("loadAndListenForStamps: No se proporcionó un UID.");
        return;
    }

    const docRef = doc(db, 'loyaltyCards', uid);
    console.log(`loadAndListenForStamps: Referencia del documento: loyaltyCards/${uid}`); // DEBUG

    if (clientListener) {
        clientListener();
        clientListener = null;
    }

    clientListener = onSnapshot(docRef, docSnapshot => {
        console.log("onSnapshot callback: Recibiendo datos del documento."); // DEBUG
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const stamps = data.stamps || 0;
            console.log(`onSnapshot: Documento existe. Sellos: ${stamps}`); // DEBUG
            renderStamps(stamps);
        } else {
            console.log(`onSnapshot: Documento NO existe para ${uid}. Intentando crear.`); // DEBUG
            renderStamps(0);
            messageDisplay.textContent = 'Tu tarjeta de lealtad ha sido creada.';
            messageDisplay.style.color = '#555'; // Color normal al crear
            // Solo crear el documento si el usuario actual es el propietario de este UID
            if (currentUser && currentUser.uid === uid) {
                 setDoc(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: currentUser.email }) // Guardar email también
                    .then(() => console.log(`setDoc: Tarjeta inicial creada para UID: ${uid}`)) // DEBUG
                    .catch(e => console.error("setDoc: Error al crear la tarjeta inicial:", e)); // DEBUG
            }
        }
    }, error => {
        console.error("onSnapshot ERROR: Error al cargar o escuchar la tarjeta de lealtad:", error); // DEBUG
        messageDisplay.textContent = 'Error al cargar la tarjeta de lealtad: ' + error.message;
        messageDisplay.style.color = '#d9534f';
    });
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

// *** CAMBIO CLAVE AQUÍ: El admin ahora buscará y operará por UID, no por email ***
// Esto implica que el adminEmailInput DEBE ser un UID válido del cliente
// o que necesites una forma de buscar el UID a partir del email.
// Por ahora, asumiremos que el admin introduce el UID directamente en el input.
searchClientBtn.addEventListener('click', async () => {
    const clientId = adminEmailInput.value.trim(); // Ahora esperamos un UID aquí
    if (!clientId) {
        adminMessage.textContent = 'Por favor, introduce el UID de un cliente.';
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        return;
    }

    adminMessage.textContent = 'Buscando cliente...';
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', clientId);
        console.log(`Admin search: Buscando documento para UID: ${clientId}`); // DEBUG

        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }
        if (clientListener && currentUser && currentUser.uid === clientId) { // Comparar con UID del currentUser
            clientListener();
            clientListener = null;
        }

        const clientDoc = await getDoc(clientDocRef);
        console.log(`Admin search: Resultado de getDoc para UID: ${clientId}. Existe: ${clientDoc.exists()}`); // DEBUG

        if (clientDoc.exists()) {
            const data = clientDoc.data();
            const stamps = data.stamps || 0;
            const clientEmailDisplay = data.userEmail || clientId; // Mostrar email si existe, sino el UID
            targetClientEmail = clientId; // Almacenamos el UID en targetClientEmail para las funciones de botones
            adminClientInfo.innerHTML = `
                <p>Cliente: <strong>${clientEmailDisplay}</strong> (UID: ${clientId})</p>
                <p>Sellos actuales: <strong id="admin-current-stamps">${stamps}</strong></p>
            `;
            setAdminControlsEnabled(true);
            adminMessage.textContent = `Cliente ${clientEmailDisplay} cargado.`;
            adminMessage.style.color = '#5cb85c';

            adminClientListener = onSnapshot(clientDocRef, docSnapshot => {
                console.log(`Admin onSnapshot: Recibiendo datos para UID: ${clientId}. Existe: ${docSnapshot.exists()}`); // DEBUG
                if (docSnapshot.exists()) {
                    const latestStamps = docSnapshot.data().stamps || 0;
                    document.getElementById('admin-current-stamps').textContent = latestStamps;
                    if (latestStamps >= 10) {
                        adminMessage.textContent = `Cliente ${clientEmailDisplay} tiene ${latestStamps} sellos (¡café gratis!).`;
                        adminMessage.style.color = '#5cb85c';
                    } else {
                        adminMessage.textContent = `Cliente ${clientEmailDisplay} cargado.`;
                        adminMessage.style.color = '#5cb85c';
                    }
                } else {
                    clearAdminClientInfo();
                    adminMessage.textContent = `El cliente con UID ${clientId} ya no existe.`;
                    adminMessage.style.color = '#d9534f';
                }
            }, error => {
                console.error("Admin onSnapshot ERROR: Error al escuchar sellos del cliente en admin:", error); // DEBUG
                adminMessage.textContent = 'Error al escuchar sellos del cliente: ' + error.message;
                adminMessage.style.color = '#d9534f';
            });

        } else {
            clearAdminClientInfo();
            adminMessage.textContent = `Cliente con UID ${clientId} no encontrado. Puedes añadirle sellos para crearlo.`;
            adminMessage.style.color = '#f0ad4e';
            targetClientEmail = clientId; // Almacenamos el UID aquí
            setAdminControlsEnabled(true, true); // Habilitar solo "Añadir Sello" y "Resetear"
        }
    } catch (error) {
        console.error("searchClientBtn ERROR: Error al buscar cliente:", error); // DEBUG
        adminMessage.textContent = 'Error al buscar cliente: ' + error.message;
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
    }
});

// *** CAMBIO CLAVE AQUÍ: Usar targetClientEmail (que ahora contiene el UID) ***
addStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return; // targetClientEmail ahora es el UID

    adminMessage.textContent = 'Añadiendo sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            let currentStamps = 0;
            let userEmail = ''; // Para guardar el email si ya existe
            if (docSnapshot.exists()) {
                currentStamps = docSnapshot.data().stamps || 0;
                userEmail = docSnapshot.data().userEmail || ''; // Recuperar email si está guardado
            } else {
                // Si el documento no existe y estamos añadiendo el primer sello,
                // significa que un nuevo usuario se está registrando o está siendo creado por el admin.
                // Aquí podrías querer preguntar al admin por el email asociado o intentar obtenerlo.
                // Por simplicidad, si no existe el email asociado al UID en Firebase Auth,
                // solo usaremos el UID para el display.
                // Una solución más robusta aquí sería usar Cloud Functions para
                // sincronizar el email del usuario con el documento de Firestore si es la primera vez.
                // Por ahora, si no hay email, solo se guardará el UID.
                console.log(`addStampBtn: Documento no existe para UID: ${targetClientEmail}. Creando con 0 sellos.`); // DEBUG
                // Si el admin está creando la tarjeta para un nuevo UID, no tenemos el email automáticamente.
                // Podrías pasar el email desde el input del admin o dejar solo el UID.
                // Por ahora, asumimos que si no existe, el 'userEmail' no se seteará a menos que se obtenga de Auth.
                // Para el admin, podríamos pedirle que ponga el email en el input y lo guarde aquí.
                // O mejor, si ya el usuario se autenticó antes, su UID tendrá un email asociado.
                // Para simplificar, si no hay email asociado, solo se creará con el UID.
                // Una solución avanzada sería buscar el email del UID en Firebase Authentication (requiere admin SDK)
                transaction.set(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: userEmail }); // Añadir userEmail si existe
            }

            if (currentStamps < MAX_STAMPS) {
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `Sello añadido a ${userEmail || targetClientEmail}. Sellos actuales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            } else {
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `Sello añadido (extra) a ${userEmail || targetClientEmail}. Sellos totales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            }
        });
    } catch (error) {
        console.error("addStampBtn ERROR: Error al añadir sello:", error); // DEBUG
        adminMessage.textContent = 'Error al añadir sello: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});

// Los siguientes eventos (removeStampBtn, redeemCoffeeBtn, resetStampsBtn) también usarán targetClientEmail (UID)
removeStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    adminMessage.textContent = 'Quitando sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            if (docSnapshot.exists()) {
                const currentStamps = docSnapshot.data().stamps || 0;
                const userEmail = docSnapshot.data().userEmail || targetClientEmail; // Para mostrar en el mensaje
                if (currentStamps > 0) {
                    transaction.update(docRef, { stamps: currentStamps - 1, lastUpdate: new Date() });
                    adminMessage.textContent = `Sello quitado de ${userEmail}. Sellos actuales: ${currentStamps - 1}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${userEmail} no tiene sellos para quitar.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
    } catch (error) {
        console.error("removeStampBtn ERROR: Error al quitar sello:", error);
        adminMessage.textContent = 'Error al quitar sello: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});

redeemCoffeeBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

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
                    adminMessage.textContent = `Café canjeado para ${userEmail}. Sellos restantes: ${currentStamps - MAX_STAMPS}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${userEmail} no tiene suficientes sellos (${currentStamps}/${MAX_STAMPS}) para canjear un café.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente con UID ${targetClientEmail} no tiene una tarjeta.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
    } catch (error) {
        console.error("redeemCoffeeBtn ERROR: Error al canjear café:", error);
        adminMessage.textContent = 'Error al canjear café: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});

resetStampsBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    const userEmailForConfirm = adminClientInfo.querySelector('strong').textContent.split(' ')[0] || targetClientEmail;
    if (!confirm(`¿Estás seguro de que quieres reiniciar la tarjeta de ${userEmailForConfirm}? Esto pondrá sus sellos a 0.`)) {
        return;
    }

    adminMessage.textContent = 'Reiniciando tarjeta...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await setDoc(docRef, { stamps: 0, lastUpdate: new Date(), userEmail: userEmailForConfirm }) // Mantener el email si ya existía
            .then(() => {
                adminMessage.textContent = `Tarjeta de ${userEmailForConfirm} reiniciada a 0 sellos.`;
                adminMessage.style.color = '#5cb85c';
            })
            .catch((error) => {
                console.error("resetStampsBtn ERROR: Error al reiniciar tarjeta:", error);
                adminMessage.textContent = 'Error al reiniciar tarjeta: ' + error.message;
                adminMessage.style.color = '#d9534f';
            });

    } catch (error) {
        console.error("resetStampsBtn ERROR (fuera de setDoc): Error al reiniciar tarjeta:", error);
        adminMessage.textContent = 'Error al reiniciar tarjeta: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});


// Inicializar el display al cargar la página (para mostrar 0 sellos si no hay sesión)
document.addEventListener('DOMContentLoaded', () => {
    renderStamps(0);
});
