// --- Importaciones de Firebase SDK (Versión 9 Modular) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Configuración de Firebase (tus credenciales proporcionadas) ---
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
let adminUserEmail = 'TU_CORREO_DE_ADMIN@ejemplo.com'; // **REEMPLAZA CON EL CORREO DEL ADMINISTRADOR**
let clientListener = null; // Para almacenar el listener de Firestore del cliente actual
let adminClientListener = null; // Para almacenar el listener de Firestore del cliente en el panel de admin

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


// --- Funciones de Autenticación ---

// Manejar el estado de autenticación
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        userDisplay.textContent = `Bienvenido, ${currentUser.displayName || currentUser.email}`;
        authBtn.textContent = 'Cerrar Sesión';
        
        // Determinar si es administrador
        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false); // Deshabilitar botones de admin hasta buscar cliente
            clearAdminClientInfo(); // Limpiar info del cliente en admin al loggearse como admin
        } else {
            adminSection.classList.add('hidden');
        }
        
        // Cargar y escuchar los sellos del usuario actual
        loadAndListenForStamps(currentUser.email);

    } else {
        currentUser = null;
        userDisplay.textContent = 'Por favor, inicia sesión.';
        authBtn.textContent = 'Iniciar Sesión con Google';
        adminSection.classList.add('hidden'); // Ocultar admin si no hay sesión
        currentStamps = 0; // Resetear sellos al cerrar sesión
        updateDisplay(); // Actualizar la vista de sellos
        messageDisplay.textContent = 'Inicia sesión para ver tu tarjeta de lealtad.';
        
        // Detener los listeners de Firestore si existían
        if (clientListener) {
            clientListener(); // Desuscribirse del listener del usuario normal
            clientListener = null;
        }
        if (adminClientListener) {
            adminClientListener(); // Desuscribirse del listener del admin (si estaba activo)
            adminClientListener = null;
        }
        clearAdminClientInfo(); // Asegurarse de limpiar el panel de admin también
    }
});

// Función para iniciar/cerrar sesión
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
                alert("Error al iniciar sesión: " + error.message);
            });
    }
});

// --- Funciones de Sellos de Lealtad ---

// Carga y suscribe un listener a los sellos de un usuario específico
async function loadAndListenForStamps(userEmail) {
    const userDocRef = doc(db, 'loyaltyCards', userEmail);

    // Si ya hay un listener activo para el usuario normal, desuscribirse primero
    if (clientListener) {
        clientListener();
    }

    clientListener = onSnapshot(userDocRef, docSnapshot => {
        if (docSnapshot.exists()) {
            currentStamps = docSnapshot.data().stamps || 0;
            console.log(`Sellos cargados para el cliente ${userEmail}: ${currentStamps}`); // Para depuración
        } else {
            // Si el documento no existe, crearlo con 0 sellos
            setDoc(userDocRef, { stamps: 0 })
                .then(() => {
                    currentStamps = 0;
                    console.log("Documento de usuario creado con 0 sellos.");
                })
                .catch(error => {
                    console.error("Error al crear documento de usuario:", error);
                    alert("Error al crear la tarjeta de lealtad: " + error.message);
                });
        }
        updateDisplay();
    }, error => {
        console.error("Error al escuchar cambios en el documento:", error);
        alert("Error al cargar sellos: " + error.message);
    });
}

// Función para actualizar la visualización de los sellos
function updateDisplay() {
    const stampsDisplay = document.getElementById('stamps-display');
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes

    // Ocultar y reiniciar animaciones del confeti
    confettiContainer.classList.remove('active');
    document.querySelectorAll('.confetti').forEach(confetti => {
        confetti.style.animation = 'none';
        confetti.offsetHeight; // Truco para forzar un reflow/repaint
        setTimeout(() => {
            const randomAnimation = `confetti-fall-${Math.floor(Math.random() * 5) + 1}`;
            const style = window.getComputedStyle(confetti);
            const initialDelay = parseFloat(style.animationDelay) || 0;
            confetti.style.animation = `${randomAnimation} 2s ${initialDelay}s ease-out forwards`;
        }, 0);
    });

    for (let i = 1; i <= MAX_STAMPS; i++) {
        const stamp = document.createElement('div');
        stamp.classList.add('stamp');
        if (i <= currentStamps) {
            stamp.classList.add('obtained');
            stamp.innerHTML = '☕'; // Icono de taza de café
        } else {
            stamp.textContent = i; // Número del sello
        }
        stampsDisplay.appendChild(stamp);
    }

    if (currentStamps >= MAX_STAMPS) {
        messageDisplay.innerHTML = '¡Felicidades! Has ganado un café gratis. 🎉';
        messageDisplay.style.color = '#2e8b57'; // Color verde para el mensaje de éxito
        
        // ACTIVAR LA ANIMACIÓN DE CONFETI
        if (currentUser && currentUser.email !== adminUserEmail) { // Solo si no es el admin
             confettiContainer.classList.add('active');
             setTimeout(() => { // Ocultar confeti después de un tiempo
                 confettiContainer.classList.remove('active');
             }, 3000); // 3 segundos
        }
        
    } else {
        messageDisplay.textContent = `Te faltan ${MAX_STAMPS - currentStamps} sellos para tu café gratis.`;
        messageDisplay.style.color = '#555'; // Color normal
    }

    // Lógica para deshabilitar/habilitar el botón "Añadir Sello" en la interfaz de administrador
    // (Esto se maneja en searchClientBtn y updateClientStamps ahora, pero es bueno tenerlo aquí también si el estado del usuario logueado cambia)
    if (currentUser && currentUser.email === adminUserEmail && addStampBtn) {
        if (currentStamps >= MAX_STAMPS) {
            addStampBtn.disabled = true;
            addStampBtn.style.backgroundColor = '#ccc';
        } else {
            addStampBtn.disabled = false;
            addStampBtn.style.backgroundColor = '#28a745';
        }
    }
}


// --- Funciones de Administración ---

let targetClientEmail = null; // Guardará el correo del cliente que se está administrando

searchClientBtn.addEventListener('click', async () => {
    adminMessage.textContent = ''; // Limpiar mensajes anteriores
    const email = adminEmailInput.value.trim();
    if (!email) {
        adminMessage.textContent = 'Por favor, introduce un correo electrónico.';
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        return;
    }

    try {
        const clientDocRef = doc(db, 'loyaltyCards', email);
        const clientDoc = await getDoc(clientDocRef);

        // Desuscribir el listener anterior si existe para evitar múltiples escuchas
        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }

        if (clientDoc.exists()) {
            targetClientEmail = email;
            const clientData = clientDoc.data();
            adminClientInfo.innerHTML = `
                <p><strong>Cliente:</strong> ${email}</p>
                <p><strong>Sellos Actuales:</strong> <span id="admin-current-stamps">${clientData.stamps || 0}</span></p>
            `;
            setAdminControlsEnabled(true);
            adminMessage.textContent = `Cliente ${email} cargado.`;
            adminMessage.style.color = '#28a745';

            // Escuchar cambios en los sellos del cliente buscado en tiempo real en el panel de admin
            adminClientListener = onSnapshot(clientDocRef, docSnapshot => {
                if (docSnapshot.exists()) {
                    const latestStamps = docSnapshot.data().stamps || 0;
                    document.getElementById('admin-current-stamps').textContent = latestStamps;
                } else {
                    // Si el documento se borra, resetear el panel de admin
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
            adminMessage.textContent = 'Cliente no encontrado. Puedes añadirle sellos para crearlo.';
            adminMessage.style.color = '#f0ad4e'; // Naranja para advertencia
            clearAdminClientInfo(); // Limpia la info existente si no se encuentra
            targetClientEmail = email; // Permite añadir sellos y crear el cliente
            setAdminControlsEnabled(true, true); // Habilitar solo "Añadir Sello" y "Resetear"
        }
    } catch (error) {
        console.error("Error al buscar cliente:", error);
        adminMessage.textContent = 'Error al buscar cliente: ' + error.message;
        adminMessage.style.color = '#d9534f';
        clearAdminClientInfo();
        setAdminControlsEnabled(false);
    }
});

// Función auxiliar para habilitar/deshabilitar botones de admin
function setAdminControlsEnabled(enabled, allowAddAndResetOnly = false) {
    addStampBtn.disabled = !enabled;
    removeStampBtn.disabled = !enabled || allowAddAndResetOnly;
    redeemCoffeeBtn.disabled = !enabled || allowAddAndResetOnly;
    resetStampsBtn.disabled = !enabled;

    // Ajustar color de los botones
    addStampBtn.style.backgroundColor = enabled ? '#28a745' : '#ccc';
    removeStampBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#dc3545' : '#ccc';
    redeemCoffeeBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#17a2b8' : '#ccc';
    resetStampsBtn.style.backgroundColor = enabled ? '#6c757d' : '#ccc';
}

function clearAdminClientInfo() {
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    setAdminControlsEnabled(false);
    targetClientEmail = null;
    if (adminClientListener) { // Detener listener del cliente anterior si existe
        adminClientListener();
        adminClientListener = null;
    }
}

// Lógica para añadir/quitar/canjear sellos (para administrador)
async function updateClientStamps(change) { // 'change' puede ser +1, -1, 0 (para reset), o 'redeem'
    if (!targetClientEmail) {
        adminMessage.textContent = 'Primero busca un cliente.';
        adminMessage.style.color = '#d9534f';
        return;
    }
    if (!currentUser || currentUser.email !== adminUserEmail) {
        adminMessage.textContent = 'Acceso denegado: No eres administrador.';
        adminMessage.style.color = '#d9534f';
        return;
    }

    const clientDocRef = doc(db, 'loyaltyCards', targetClientEmail);
    adminMessage.textContent = 'Actualizando sellos...';
    adminMessage.style.color = '#007bff';

    try {
        await runTransaction(db, async (transaction) => {
            const docSnapshot = await transaction.get(clientDocRef);

            let currentClientStamps = 0;

            if (docSnapshot.exists()) {
                currentClientStamps = docSnapshot.data().stamps || 0;
            } else if (change === 1) { // Si el documento no existe y estamos añadiendo sellos, crearlo
                transaction.set(clientDocRef, { stamps: 0 }); // Lo crea con 0 y luego se le suma 1
                currentClientStamps = 0; // Asegurarse de que el cálculo se haga sobre 0
            } else {
                adminMessage.textContent = 'El cliente no tiene sellos para quitar/canjear/resetear, o no existe.';
                adminMessage.style.color = '#f0ad4e';
                return; // Salir de la transacción si no hay documento y no es un add
            }

            let newStamps = currentClientStamps;

            if (change === 'redeem') { // Canjear café
                if (currentClientStamps >= MAX_STAMPS) {
                    newStamps = 0; // Resetear a 0 sellos
                    adminMessage.textContent = `Café canjeado para ${targetClientEmail}. ¡Sellos reseteados!`;
                    adminMessage.style.color = '#28a745';
                    // Trigger confetti if this is the currently signed-in user
                    if (currentUser && currentUser.email === targetClientEmail) {
                        confettiContainer.classList.add('active'); // Activar confeti para el usuario actual
                        messageDisplay.innerHTML = '¡Tu café ha sido canjeado! Tarjeta reiniciada. 🎉';
                        messageDisplay.style.color = '#2e8b57';
                        setTimeout(() => { // Ocultar confeti después de un tiempo
                            confettiContainer.classList.remove('active');
                        }, 2500); // 2.5 segundos
                    }
                } else {
                    adminMessage.textContent = `El cliente ${targetClientEmail} no tiene suficientes sellos para canjear (necesita ${MAX_STAMPS}, tiene ${currentClientStamps}).`;
                    adminMessage.style.color = '#f0ad4e';
                    return;
                }
            } else if (change === 'reset') { // Resetear sellos a 0
                newStamps = 0;
                adminMessage.textContent = `Sellos de ${targetClientEmail} reseteados a 0.`;
                adminMessage.style.color = '#28a745';
            } else { // Añadir o quitar sellos
                newStamps = Math.max(0, currentClientStamps + change); // Asegurar que no sea negativo
                if (newStamps > MAX_STAMPS) {
                    newStamps = MAX_STAMPS; // No exceder el máximo
                    adminMessage.textContent = `Sellos de ${targetClientEmail} actualizados a ${newStamps} (máximo alcanzado).`;
                    adminMessage.style.color = '#f0ad4e'; // Advertencia si llega al máximo
                } else {
                    adminMessage.textContent = `Sellos de ${targetClientEmail} actualizados a ${newStamps}.`;
                    adminMessage.style.color = '#28a745';
                }
            }
            transaction.update(clientDocRef, { stamps: newStamps });
        });
        
    } catch (error) {
        console.error("Error en la transacción de sellos:", error);
        adminMessage.textContent = 'Error al actualizar sellos: ' + error.message;
        adminMessage.style.color = '#d9534f';
    }
}


// --- Event Listeners para Botones de Admin ---
addStampBtn.addEventListener('click', () => updateClientStamps(1));
removeStampBtn.addEventListener('click', () => updateClientStamps(-1));
redeemCoffeeBtn.addEventListener('click', () => updateClientStamps('redeem'));
resetStampsBtn.addEventListener('click', () => updateClientStamps('reset'));

// Inicializar el display al cargar la página (para mostrar 0 sellos si no hay sesión)
updateDisplay();
