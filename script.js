// --- Configuración de Firebase (asegúrate de que estas credenciales sean correctas) ---
// DEBES REEMPLAZAR ESTOS VALORES CON LOS DE TU PROYECTO FIREBASE
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_AUTH_DOMAIN",
    projectId: "TU_PROJECT_ID",
    storageBucket: "TU_STORAGE_BUCKET",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// --- Constantes y Variables Globales ---
const MAX_STAMPS = 10;
let currentStamps = 0;
let currentUser = null; // Guardará el objeto de usuario de Firebase
let adminUserEmail = 'TU_CORREO_DE_ADMIN@ejemplo.com'; // **REEMPLAZA CON EL CORREO DEL ADMINISTRADOR**
let clientListener = null; // Para almacenar el listener de Firestore del cliente actual

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
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userDisplay.textContent = `Bienvenido, ${currentUser.displayName || currentUser.email}`;
        authBtn.textContent = 'Cerrar Sesión';
        
        // Determinar si es administrador
        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
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
        
        // Detener el listener de Firestore si existía
        if (clientListener) {
            clientListener(); // Desuscribirse del listener
            clientListener = null;
        }
    }
});

// Función para iniciar/cerrar sesión
authBtn.addEventListener('click', () => {
    if (currentUser) {
        auth.signOut();
    } else {
        auth.signInWithPopup(googleProvider)
            .catch(error => {
                console.error("Error al iniciar sesión:", error);
                alert("Error al iniciar sesión: " + error.message);
            });
    }
});

// --- Funciones de Sellos de Lealtad ---

// Carga y suscribe un listener a los sellos de un usuario específico
async function loadAndListenForStamps(userEmail) {
    const userDocRef = db.collection('loyaltyCards').doc(userEmail);

    // Si ya hay un listener activo, desuscribirse primero
    if (clientListener) {
        clientListener();
    }

    clientListener = userDocRef.onSnapshot(docSnapshot => {
        if (docSnapshot.exists) {
            currentStamps = docSnapshot.data().stamps || 0;
        } else {
            // Si el documento no existe, crearlo con 0 sellos
            userDocRef.set({ stamps: 0 })
                .then(() => {
                    currentStamps = 0;
                    console.log("Documento de usuario creado.");
                })
                .catch(error => {
                    console.error("Error al crear documento de usuario:", error);
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

    // Asegurarse de que el confeti esté oculto al iniciar o actualizar
    confettiContainer.classList.remove('active');
    // Reiniciar las animaciones del confeti para que se disparen de nuevo
    document.querySelectorAll('.confetti').forEach(confetti => {
        confetti.style.animation = 'none'; // Detener animación
        confetti.offsetHeight; // Truco para forzar un reflow/repaint
        // Vuelve a aplicar la animación después de un pequeño retraso (0ms)
        setTimeout(() => {
            // Asigna una animación de caída aleatoria y su retraso original
            const randomAnimation = `confetti-fall-${Math.floor(Math.random() * 5) + 1}`;
            // Intenta leer el retraso original del CSS o establece 0s si no existe
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
        confettiContainer.classList.add('active');

        // Desactivar el botón "Añadir Sello" en la interfaz de administrador si existe y es el límite
        if (currentUser && currentUser.email === adminUserEmail) {
            if (addStampBtn) { // Asegúrate de que el botón existe antes de manipularlo
                addStampBtn.disabled = true;
                addStampBtn.style.backgroundColor = '#ccc';
            }
        }
    } else {
        messageDisplay.textContent = `Te faltan ${MAX_STAMPS - currentStamps} sellos para tu café gratis.`;
        messageDisplay.style.color = '#555'; // Color normal
        
        // Activar el botón "Añadir Sello" en la interfaz de administrador
        if (currentUser && currentUser.email === adminUserEmail) {
            if (addStampBtn) { // Asegúrate de que el botón existe antes de manipularlo
                addStampBtn.disabled = false;
                addStampBtn.style.backgroundColor = '#28a745';
            }
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
        const clientDoc = await db.collection('loyaltyCards').doc(email).get();
        if (clientDoc.exists) {
            targetClientEmail = email;
            const clientData = clientDoc.data();
            adminClientInfo.innerHTML = `
                <p><strong>Cliente:</strong> ${email}</p>
                <p><strong>Sellos Actuales:</strong> <span id="admin-current-stamps">${clientData.stamps || 0}</span></p>
            `;
            setAdminControlsEnabled(true);
            adminMessage.textContent = `Cliente ${email} cargado.`;
            adminMessage.style.color = '#28a745';

            // Escuchar cambios en los sellos del cliente buscado en tiempo real
            if (clientListener) { // Si ya hay un listener para el usuario actual, lo cerramos para evitar conflictos
                clientListener();
            }
            clientListener = db.collection('loyaltyCards').doc(email).onSnapshot(docSnapshot => {
                if (docSnapshot.exists) {
                    const latestStamps = docSnapshot.data().stamps || 0;
                    document.getElementById('admin-current-stamps').textContent = latestStamps;
                }
            }, error => {
                console.error("Error al escuchar sellos del cliente en admin:", error);
            });

        } else {
            adminMessage.textContent = 'Cliente no encontrado. Puedes añadirle sellos para crearlo.';
            adminMessage.style.color = '#f0ad4e'; // Naranja para advertencia
            clearAdminClientInfo();
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
    removeStampBtn.disabled = !enabled || allowAddAndResetOnly; // Deshabilitar si solo se permite añadir/reset
    redeemCoffeeBtn.disabled = !enabled || allowAddAndResetOnly;
    resetStampsBtn.disabled = !enabled;

    // Ajustar color de los botones
    addStampBtn.style.backgroundColor = enabled ? '#28a745' : '#ccc';
    removeStampBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#dc3545' : '#ccc'; // Rojo para quitar
    redeemCoffeeBtn.style.backgroundColor = (enabled && !allowAddAndResetOnly) ? '#007bff' : '#ccc'; // Azul para canjear
    resetStampsBtn.style.backgroundColor = enabled ? '#6c757d' : '#ccc'; // Gris para resetear
}

function clearAdminClientInfo() {
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    setAdminControlsEnabled(false);
    targetClientEmail = null;
    if (clientListener) { // Detener listener del cliente anterior si existe
        clientListener();
        clientListener = null;
    }
}

// Lógica para añadir/quitar/canjear sellos (para administrador)
async function updateClientStamps(change) { // 'change' puede ser +1, -1, 0 (para reset), o MAX_STAMPS (para canjear)
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

    const clientDocRef = db.collection('loyaltyCards').doc(targetClientEmail);
    adminMessage.textContent = 'Actualizando sellos...';
    adminMessage.style.color = '#007bff';

    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(clientDocRef);
            let currentClientStamps = 0;

            if (doc.exists) {
                currentClientStamps = doc.data().stamps || 0;
            } else if (change > 0) {
                // Si el documento no existe y estamos añadiendo sellos, crearlo
                transaction.set(clientDocRef, { stamps: 0 });
            } else {
                adminMessage.textContent = 'El cliente no tiene sellos para quitar/canjear/resetear.';
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
