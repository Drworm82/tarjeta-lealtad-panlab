// Este console.log es para verificar que el script se está cargando.
console.log("************ SCRIPT.JS ESTÁ CARGANDO ************");

const MAX_STAMPS = 10;
let currentStamps = 0;
let currentUser = null; // Variable para guardar el usuario actual
let adminSelectedClientUid = null; // UID del cliente seleccionado por el administrador
let adminSelectedClientStamps = 0; // Sellos del cliente seleccionado por el administrador

// =======================================================
// EMAIL(S) DEL ADMINISTRADOR (¡MUY IMPORTANTE: CAMBIA ESTO POR TU EMAIL REAL DE GOOGLE!)
// =======================================================
const ADMIN_EMAILS = ['tu_email_admin@example.com']; // <-- ¡CAMBIA ESTO!
// Puedes añadir más emails: ['email1@dominio.com', 'email2@dominio.com'];

// =======================================================
// TU FIREBASE CONFIG REAL (¡Ya insertado con tus claves!)
// =======================================================
const firebaseConfig = {
  apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo", //
  authDomain: "mi-cafeteria-lealtad.firebaseapp.com", //
  projectId: "mi-cafeteria-lealtad", //
  storageBucket: "mi-cafeteria-lealtad.firebasestorage.app", //
  messagingSenderId: "1098066759983", //
  appId: "1:1098066759983:web:99be4197dbbb81f6f9d1da" //
};


// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Obtén una referencia a Firestore y autenticación
const db = firebase.firestore();
const auth = firebase.auth();

// Referencias a elementos HTML (cliente)
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const addStampBtn = document.getElementById('add-stamp-btn');
const redeemBtn = document.getElementById('redeem-btn');
const resetBtn = document.getElementById('reset-btn');
const clientSection = document.getElementById('client-section');

// Nuevas referencias para el login
const userDisplay = document.getElementById('user-display');
const authBtn = document.getElementById('auth-btn');

// Nuevas referencias para la sección de administración
const adminSection = document.getElementById('admin-section');
const clientEmailInput = document.getElementById('client-email-input');
const searchClientBtn = document.getElementById('search-client-btn');
const adminClientInfo = document.getElementById('admin-client-info');
const adminAddStampBtn = document.getElementById('admin-add-stamp-btn');
const adminRedeemBtn = document.getElementById('admin-redeem-btn');
const adminResetBtn = document.getElementById('admin-reset-btn');
const adminMessage = document.getElementById('admin-message');


// --- Funciones para interactuar con Firebase ---

// Función para cargar los sellos del usuario actual (cliente)
function loadStamps() {
    if (!currentUser || !currentUser.uid) {
        console.warn("No hay usuario autenticado para cargar sellos.");
        currentStamps = 0; // Mostrar 0 sellos si no hay usuario
        updateDisplay();
        return;
    }
    const userRef = db.collection('loyaltyCards').doc(currentUser.uid);

    userRef.get().then((doc) => {
        if (doc.exists) {
            currentStamps = doc.data().stamps || 0;
            console.log("Sellos cargados para el cliente:", currentStamps);
        } else {
            console.log("No hay tarjeta para este usuario, creando una nueva.");
            currentStamps = 0; // Si no existe, empieza con 0
            // Guardar el email del usuario al crear la tarjeta (importante para el admin)
            userRef.set({ stamps: 0, email: currentUser.email || 'anonymo.us' });
        }
        updateDisplay();
    }).catch((error) => {
        console.error("Error al cargar los sellos del cliente:", error);
        messageDisplay.textContent = "Error al cargar la tarjeta. Intenta de nuevo.";
    });
}

// Función para guardar los sellos del usuario actual (cliente)
function saveStamps() {
    if (!currentUser || !currentUser.uid) {
        console.warn("No hay usuario autenticado para guardar sellos. No se guardará.");
        return;
    }
    const userRef = db.collection('loyaltyCards').doc(currentUser.uid);
    // Guardar el email del usuario al actualizar la tarjeta (importante para el admin)
    userRef.set({ stamps: currentStamps, email: currentUser.email || 'anonymo.us' })
        .then(() => {
            console.log("Sellos guardados con éxito para el cliente.");
        })
        .catch((error) => {
            console.error("Error al guardar los sellos del cliente:", error);
            messageDisplay.textContent = "Error al guardar la tarjeta.";
        });
}

// --- Lógica de Administración ---

// Función para buscar un cliente por email y cargar sus sellos
async function searchClientByEmail(email) {
    adminMessage.textContent = ''; // Limpiar mensajes anteriores
    adminSelectedClientUid = null;
    adminSelectedClientStamps = 0;
    adminClientInfo.innerHTML = 'Buscando...';
    adminAddStampBtn.disabled = true;
    adminRedeemBtn.disabled = true;
    adminResetBtn.disabled = true;

    try {
        const querySnapshot = await db.collection('loyaltyCards')
                                    .where('email', '==', email)
                                    .limit(1) // Solo necesitamos uno si el email es único
                                    .get();

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            adminSelectedClientUid = doc.id;
            adminSelectedClientStamps = doc.data().stamps || 0;
            adminClientInfo.innerHTML = `
                <p>Cliente: <strong>${email}</strong></p>
                <p>Sellos actuales: <strong>${adminSelectedClientStamps}</strong></p>
            `;
            adminAddStampBtn.disabled = false;
            adminRedeemBtn.disabled = false;
            adminResetBtn.disabled = false;
            console.log("Cliente encontrado:", adminSelectedClientUid, "Sellos:", adminSelectedClientStamps);
        } else {
            adminClientInfo.innerHTML = `Cliente no encontrado con email: <strong>${email}</strong>.<br>
                                        Si es un nuevo cliente, puede que no haya iniciado sesión o acumulado sellos aún.`;
            adminMessage.textContent = 'Cliente no encontrado.';
            console.log("Cliente no encontrado con email:", email);
        }
    } catch (error) {
        console.error("Error al buscar cliente:", error);
        adminClientInfo.innerHTML = '';
        adminMessage.textContent = 'Error al buscar cliente. Intenta de nuevo.';
    }
}

// Función para actualizar los sellos de un cliente desde el panel de administración
async function updateClientStamps(uid, newStamps) {
    if (!uid) {
        adminMessage.textContent = "No se ha seleccionado ningún cliente.";
        return;
    }
    adminMessage.textContent = 'Actualizando...';
    try {
        await db.collection('loyaltyCards').doc(uid).update({ stamps: newStamps });
        adminSelectedClientStamps = newStamps; // Actualizar la variable local
        adminClientInfo.innerHTML = `
            <p>Cliente: <strong>${clientEmailInput.value}</strong></p>
            <p>Sellos actuales: <strong>${adminSelectedClientStamps}</strong></p>
        `;
        adminMessage.textContent = 'Sellos actualizados con éxito.';
        console.log(`Sellos de ${uid} actualizados a ${newStamps}`);
    } catch (error) {
        console.error("Error al actualizar sellos del cliente:", error);
        adminMessage.textContent = `Error al actualizar sellos: ${error.message}`;
    }
}

// --- Manejo de la autenticación ---

// Función para iniciar sesión anónimamente (para clientes no logueados)
function signInAnonymously() {
    auth.signInAnonymously()
        .then(() => {
            console.log("Inicio de sesión anónimo exitoso.");
            // onAuthStateChanged se disparará después de esto.
        })
        .catch((error) => {
            console.error("Error al iniciar sesión anónimamente:", error);
            messageDisplay.textContent = "Error al conectar la tarjeta. Intenta de nuevo."; //
        });
}


// Listener para el cambio de estado de autenticación (se activa al cargar, iniciar o cerrar sesión)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        const userEmail = currentUser.email || '';
        const userName = currentUser.displayName || userEmail || 'Invitado'; //
        userDisplay.textContent = `Hola, ${userName}!`;
        authBtn.textContent = 'Cerrar Sesión';

        // Determinar si es administrador
        if (ADMIN_EMAILS.includes(userEmail)) {
            console.log("Administrador logueado:", userEmail, "UID:", currentUser.uid); // <--- ¡AQUÍ ESTÁ TU UID!
            clientSection.classList.add('hidden'); // Ocultar sección de cliente
            adminSection.classList.remove('hidden'); // Mostrar sección de administración
            // Ocultar botones de cliente si estás en modo admin
            document.querySelectorAll('.client-control').forEach(btn => btn.classList.add('hidden'));

            adminMessage.textContent = ''; // Limpiar cualquier mensaje
            adminClientInfo.innerHTML = ''; // Limpiar info de cliente
            clientEmailInput.value = ''; // Limpiar input de email
            adminAddStampBtn.disabled = true;
            adminRedeemBtn.disabled = true;
            adminResetBtn.disabled = true;
        } else {
            console.log("Usuario cliente logueado:", userEmail, "UID:", currentUser.uid); // <--- Opcionalmente, el UID del cliente
            clientSection.classList.remove('hidden'); // Mostrar sección de cliente
            adminSection.classList.add('hidden'); // Ocultar sección de administración
            // Asegurar que los botones de cliente sean visibles
            document.querySelectorAll('.client-control').forEach(btn => btn.classList.remove('hidden'));
            loadStamps(); // Cargar sellos del cliente
        }
    } else {
        // No hay usuario logueado o sesión cerrada
        currentUser = null;
        userDisplay.textContent = 'Invitado';
        authBtn.textContent = 'Iniciar Sesión / Registrarse';
        clientSection.classList.remove('hidden'); // Mostrar sección de cliente
        adminSection.classList.add('hidden'); // Ocultar sección de administración
        // Asegurar que los botones de cliente sean visibles (para anónimo)
        document.querySelectorAll('.client-control').forEach(btn => btn.classList.remove('hidden'));
        signInAnonymously(); // Mantener el flujo anónimo para invitados
    }
});


// --- Lógica para Google Sign-In ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Inicio de sesión con Google exitoso:", result.user.displayName); //
            // onAuthStateChanged se disparará y manejará el resto
        })
        .catch((error) => {
            console.error("Error al iniciar sesión con Google:", error);
            // Si el error es por dominios no autorizados (Auth/unauthorized-domain), el mensaje de Firebase ya lo indica
            messageDisplay.textContent = `Error al iniciar sesión: ${error.message}`;
        });
}

function signOutUser() {
    auth.signOut()
        .then(() => {
            console.log("Sesión cerrada.");
            currentStamps = 0; // Reiniciar sellos visualmente
            updateDisplay(); // Actualizar interfaz del cliente
            messageDisplay.textContent = 'Sesión cerrada. Puedes iniciar sesión o continuar como invitado.';
            // onAuthStateChanged se disparará y cambiará al usuario anónimo
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
            messageDisplay.textContent = `Error al cerrar sesión: ${error.message}`;
        });
}


// --- Lógica de la Interfaz (cliente) ---
function updateDisplay() {
    stampsDisplay.innerHTML = '';
    for (let i = 0; i < MAX_STAMPS; i++) {
        const stamp = document.createElement('div');
        stamp.classList.add('stamp');
        if (i < currentStamps) {
            stamp.classList.add('obtained');
            stamp.textContent = '☕';
        } else {
            stamp.textContent = (i + 1);
        }
        stampsDisplay.appendChild(stamp);
    }

    if (currentStamps >= MAX_STAMPS) {
        messageDisplay.textContent = '¡Felicidades! Has ganado un café gratis. 🎉';
        redeemBtn.classList.remove('hidden');
        addStampBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
    } else {
        const remaining = MAX_STAMPS - currentStamps;
        messageDisplay.textContent = `Te faltan ${remaining} sello${remaining !== 1 ? 's' : ''} para tu café gratis.`;
        redeemBtn.classList.add('hidden');
        addStampBtn.classList.remove('hidden');
        resetBtn.classList.add('hidden');
    }
}

// --- Event Listeners ---

addStampBtn.addEventListener('click', () => {
    // Este botón ahora solo es visible para clientes no administradores
    if (currentStamps < MAX_STAMPS) {
        currentStamps++;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
    }
});

redeemBtn.addEventListener('click', () => {
    // Este botón ahora solo es visible para clientes no administradores
    if (currentStamps >= MAX_STAMPS) {
        currentStamps = 0;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
        alert('¡Recompensa canjeada! Disfruta tu café gratis. 😉');
    }
});

resetBtn.addEventListener('click', () => {
    // Este botón ahora solo es visible para clientes no administradores
    if (confirm('¿Estás seguro de que quieres reiniciar la tarjeta? Esto borrará todos los sellos.')) {
        currentStamps = 0;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
        alert('Tarjeta de lealtad reiniciada.');
    }
});

authBtn.addEventListener('click', () => {
    if (currentUser && !currentUser.isAnonymous) {
        signOutUser();
    } else {
        signInWithGoogle();
    }
});

// Event Listeners para la sección de administración
searchClientBtn.addEventListener('click', () => {
    const email = clientEmailInput.value.trim();
    if (email) {
        searchClientByEmail(email);
    } else {
        adminMessage.textContent = 'Por favor, introduce un email.';
        adminClientInfo.innerHTML = '';
        adminAddStampBtn.disabled = true;
        adminRedeemBtn.disabled = true;
        adminResetBtn.disabled = true;
    }
});

adminAddStampBtn.addEventListener('click', () => {
    if (adminSelectedClientUid && adminSelectedClientStamps < MAX_STAMPS) {
        updateClientStamps(adminSelectedClientUid, adminSelectedClientStamps + 1);
    } else if (adminSelectedClientStamps >= MAX_STAMPS) {
        adminMessage.textContent = 'El cliente ya tiene el máximo de sellos.';
    }
});

adminRedeemBtn.addEventListener('click', () => {
    if (adminSelectedClientUid && adminSelectedClientStamps >= MAX_STAMPS) {
        if (confirm('¿Estás seguro de que quieres canjear la recompensa de este cliente?')) {
            updateClientStamps(adminSelectedClientUid, 0); // Reinicia a 0
            adminMessage.textContent = 'Recompensa canjeada y tarjeta reiniciada.';
        }
    } else if (adminSelectedClientUid) {
        adminMessage.textContent = 'El cliente no tiene suficientes sellos para canjear.';
    }
});

adminResetBtn.addEventListener('click', () => {
    if (adminSelectedClientUid) {
        if (confirm('¿Estás seguro de que quieres reiniciar la tarjeta de este cliente a 0 sellos?')) {
            updateClientStamps(adminSelectedClientUid, 0);
            adminMessage.textContent = 'Tarjeta de cliente reiniciada a 0 sellos.';
        }
    }
});


// --- Inicio de la Aplicación ---
// onAuthStateChanged ya maneja el flujo inicial de signInAnonymously().
