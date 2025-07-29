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
let adminUserEmail = 'TU_CORREO_DE_ADMIN@ejemplo.com'; // **¡IMPORTANTE! REEMPLAZA CON EL CORREO ELECTRÓNICO DE TU ADMINISTRADOR**
let clientListener = null; // Para almacenar el listener de Firestore del cliente actual
let adminClientListener = null; // Para almacenar el listener de Firestore del cliente en el panel de admin
let targetClientEmail = null; // Para almacenar el email del cliente en el panel de admin // <-- ¡ESTA ES LA LÍNEA AÑADIDA!

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
    targetClientEmail = null; // Esta línea ahora está bien porque targetClientEmail está declarado
    if (adminClientListener) {
        adminClientListener();
        adminClientListener = null;
    }
    adminMessage.textContent = '';
}

// --- Funciones de Firebase y Lógica de la Aplicación ---

onAuthStateChanged(auth, async user => {
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

        loadAndListenForStamps(currentUser.email);

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


async function loadAndListenForStamps(email) {
    if (!email) {
        console.error("No se proporcionó un email para loadAndListenForStamps.");
        return;
    }

    const docRef = doc(db, 'loyaltyCards', email);

    if (clientListener) {
        clientListener();
        clientListener = null;
    }

    clientListener = onSnapshot(docRef, docSnapshot => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const stamps = data.stamps || 0;
            renderStamps(stamps);
        } else {
            renderStamps(0);
            messageDisplay.textContent = 'Tu tarjeta de lealtad ha sido creada.';
            messageDisplay.style.color = '#555'; // Color normal al crear
            if (currentUser && currentUser.email === email) {
                 setDoc(docRef, { stamps: 0, lastUpdate: new Date() })
                    .catch(e => console.error("Error al crear la tarjeta inicial:", e));
            }
        }
    }, error => {
        console.error("Error al cargar o escuchar la tarjeta de lealtad:", error);
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

searchClientBtn.addEventListener('click', async () => {
    const email = adminEmailInput.value.trim();
    if (!email) {
        adminMessage.textContent = 'Por favor, introduce el email de un cliente.';
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        return;
    }

    adminMessage.textContent = 'Buscando cliente...';
    adminMessage.style.color = '#5bc0de';

    try {
        const clientDocRef = doc(db, 'loyaltyCards', email);

        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }
        if (clientListener && currentUser && currentUser.email === email) {
            clientListener();
            clientListener = null;
        }

        const clientDoc = await getDoc(clientDocRef);

        if (clientDoc.exists()) {
            const data = clientDoc.data();
            const stamps = data.stamps || 0;
            targetClientEmail = email;
            adminClientInfo.innerHTML = `
                <p>Cliente: <strong>${email}</strong></p>
                <p>Sellos actuales: <strong id="admin-current-stamps">${stamps}</strong></p>
            `;
            setAdminControlsEnabled(true);
            adminMessage.textContent = `Cliente ${email} cargado.`;
            adminMessage.style.color = '#5cb85c';

            adminClientListener = onSnapshot(clientDocRef, docSnapshot => {
                if (docSnapshot.exists()) {
                    const latestStamps = docSnapshot.data().stamps || 0;
                    document.getElementById('admin-current-stamps').textContent = latestStamps;
                    if (latestStamps >= 10) {
                        adminMessage.textContent = `Cliente ${targetClientEmail} tiene ${latestStamps} sellos (¡café gratis!).`;
                        adminMessage.style.color = '#5cb85c';
                    } else {
                        adminMessage.textContent = `Cliente ${targetClientEmail} cargado.`;
                        adminMessage.style.color = '#5cb85c';
                    }
                } else {
                    clearAdminClientInfo();
                    adminMessage.textContent = `El cliente ${email} ya no existe.`;
                    adminMessage.style.color = '#d9534f';
                }
            }, error => {
                console.error("Error al escuchar sellos del cliente en admin:", error);
                adminMessage.textContent = 'Error al escuchar sellos del cliente: ' + error.message;
                adminMessage.style.color = '#d9534f';
            });

        } else {
            clearAdminClientInfo();
            adminMessage.textContent = `Cliente ${email} no encontrado. Puedes añadirle sellos para crearlo.`;
            adminMessage.style.color = '#f0ad4e';
            targetClientEmail = email; // Permite añadir sellos y crear el cliente
            setAdminControlsEnabled(true, true); // Habilitar solo "Añadir Sello" y "Resetear"
        }
    } catch (error) {
        console.error("Error al buscar cliente:", error);
        adminMessage.textContent = 'Error al buscar cliente: ' + error.message;
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
    }
});

addStampBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    adminMessage.textContent = 'Añadiendo sello...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(docRef);
            let currentStamps = 0;
            if (docSnapshot.exists()) {
                currentStamps = docSnapshot.data().stamps || 0;
            } else {
                transaction.set(docRef, { stamps: 0, lastUpdate: new Date() }); // Crear con 0 si no existe
            }

            if (currentStamps < MAX_STAMPS) { // Solo añadir si no ha alcanzado el máximo para el conteo visible
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `Sello añadido a ${targetClientEmail}. Sellos actuales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            } else { // Si ya tiene 10, añadir un sello "extra" para el conteo total, pero el display solo mostrará 10
                transaction.update(docRef, { stamps: currentStamps + 1, lastUpdate: new Date() });
                adminMessage.textContent = `Sello añadido (extra) a ${targetClientEmail}. Sellos totales: ${currentStamps + 1}`;
                adminMessage.style.color = '#5cb85c';
            }
        });
    } catch (error) {
        console.error("Error al añadir sello:", error);
        adminMessage.textContent = 'Error al añadir sello: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});

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
                if (currentStamps > 0) {
                    transaction.update(docRef, { stamps: currentStamps - 1, lastUpdate: new Date() });
                    adminMessage.textContent = `Sello quitado de ${targetClientEmail}. Sellos actuales: ${currentStamps - 1}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${targetClientEmail} no tiene sellos para quitar.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente ${targetClientEmail} no tiene una tarjeta.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
    } catch (error) {
        console.error("Error al quitar sello:", error);
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
                if (currentStamps >= MAX_STAMPS) {
                    transaction.update(docRef, { stamps: currentStamps - MAX_STAMPS, lastUpdate: new Date() });
                    adminMessage.textContent = `Café canjeado para ${targetClientEmail}. Sellos restantes: ${currentStamps - MAX_STAMPS}`;
                    adminMessage.style.color = '#5cb85c';
                } else {
                    adminMessage.textContent = `El cliente ${targetClientEmail} no tiene suficientes sellos (${currentStamps}/${MAX_STAMPS}) para canjear un café.`;
                    adminMessage.style.color = '#f0ad4e';
                }
            } else {
                adminMessage.textContent = `El cliente ${targetClientEmail} no tiene una tarjeta.`;
                adminMessage.style.color = '#f0ad4e';
            }
        });
    } catch (error) {
        console.error("Error al canjear café:", error);
        adminMessage.textContent = 'Error al canjear café: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});

resetStampsBtn.addEventListener('click', async () => {
    if (!targetClientEmail) return;

    // Usamos un alert simple ya que no tenemos un modal personalizado
    if (!confirm(`¿Estás seguro de que quieres reiniciar la tarjeta de ${targetClientEmail}? Esto pondrá sus sellos a 0.`)) {
        return;
    }

    adminMessage.textContent = 'Reiniciando tarjeta...';
    adminMessage.style.color = '#5bc0de';

    try {
        const docRef = doc(db, 'loyaltyCards', targetClientEmail);
        await setDoc(docRef, { stamps: 0, lastUpdate: new Date() }, { merge: true }) // Usa merge:true para actualizar o crear si no existe
            .then(() => {
                adminMessage.textContent = `Tarjeta de ${targetClientEmail} reiniciada a 0 sellos.`;
                adminMessage.style.color = '#5cb85c';
            })
            .catch((error) => {
                console.error("Error al reiniciar tarjeta:", error);
                adminMessage.textContent = 'Error al reiniciar tarjeta: ' + error.message;
                adminMessage.style.color = '#d9534f';
            });

    } catch (error) {
        console.error("Error al reiniciar tarjeta (fuera de setDoc):", error);
        adminMessage.textContent = 'Error al reiniciar tarjeta: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
});


// Inicializar el display al cargar la página (para mostrar 0 sellos si no hay sesión)
// Esto se llama al final del script para asegurar que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    renderStamps(0); // Muestra 0 sellos al inicio
    // La lógica de onAuthStateChanged se encargará de cargar los sellos reales si hay un usuario logueado
});
