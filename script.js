const MAX_STAMPS = 10;
let currentStamps = 0;
let currentUser = null; // Variable para guardar el usuario actual

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

// Referencias a elementos HTML
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const addStampBtn = document.getElementById('add-stamp-btn');
const redeemBtn = document.getElementById('redeem-btn');
const resetBtn = document.getElementById('reset-btn');

// Nuevas referencias para el login
const userDisplay = document.getElementById('user-display');
const authBtn = document.getElementById('auth-btn');

// --- Funciones para interactuar con Firebase ---

// Función para cargar los sellos del usuario actual
function loadStamps() {
    if (!currentUser || !currentUser.uid) { // Asegurarse de que currentUser y su UID existen
        console.warn("No hay usuario autenticado para cargar sellos.");
        currentStamps = 0; // Mostrar 0 sellos si no hay usuario
        updateDisplay();
        return;
    }
    const userRef = db.collection('loyaltyCards').doc(currentUser.uid);

    userRef.get().then((doc) => {
        if (doc.exists) {
            currentStamps = doc.data().stamps || 0;
            console.log("Sellos cargados:", currentStamps);
        } else {
            console.log("No hay tarjeta para este usuario, creando una nueva.");
            currentStamps = 0; // Si no existe, empieza con 0
            userRef.set({ stamps: 0 }); // Crea el documento
        }
        updateDisplay();
    }).catch((error) => {
        console.error("Error al cargar los sellos:", error);
        messageDisplay.textContent = "Error al cargar la tarjeta. Intenta de nuevo.";
    });
}

// Función para guardar los sellos del usuario actual
function saveStamps() {
    if (!currentUser || !currentUser.uid) { // Asegurarse de que currentUser y su UID existen
        console.warn("No hay usuario autenticado para guardar sellos. No se guardará.");
        return;
    }
    const userRef = db.collection('loyaltyCards').doc(currentUser.uid);
    userRef.set({ stamps: currentStamps })
        .then(() => {
            console.log("Sellos guardados con éxito.");
        })
        .catch((error) => {
            console.error("Error al guardar los sellos:", error);
            messageDisplay.textContent = "Error al guardar la tarjeta.";
        });
}

// Manejar el cambio de estado de autenticación (cuando un usuario inicia/cierra sesión)
auth.onAuthStateChanged((user) => {
    if (user) {
        // Usuario logueado (anónimo o con proveedor)
        currentUser = user;
        console.log("Usuario actual:", currentUser.uid, currentUser.isAnonymous ? "(Anónimo)" : `(Autenticado: ${currentUser.displayName || currentUser.email})`);
        userDisplay.textContent = `Hola, ${currentUser.displayName || currentUser.email || 'Invitado'}!`;
        authBtn.textContent = 'Cerrar Sesión';
        loadStamps(); // Cargar sellos para el usuario actual
    } else {
        // No hay usuario logueado, intentar login anónimo
        currentUser = null;
        userDisplay.textContent = 'Invitado';
        authBtn.textContent = 'Iniciar Sesión / Registrarse';
        signInAnonymously(); // Mantener el flujo anónimo si no hay otra sesión
    }
});

// --- Lógica para Google Sign-In ---
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            // Esto se dispara en onAuthStateChanged, donde se maneja el currentUser
            console.log("Inicio de sesión con Google exitoso:", result.user.displayName);
            // Si el usuario era anónimo y ahora inicia sesión con Google,
            // vinculamos la cuenta anónima a la cuenta de Google para mantener los sellos.
            if (result.credential.accessToken && result.user.isAnonymous) {
                // Esto es más avanzado: vincula la cuenta anónima a la de Google
                // Pero en este caso, onAuthStateChanged manejará la carga de sellos del nuevo UID
                // Para una migración real de datos, necesitarías una lógica más compleja
                // que lea los sellos del UID anónimo ANTES de cambiar el currentUser
                // y luego los escriba en el nuevo UID del usuario de Google.
                // Por simplicidad, por ahora simplemente cargaremos los sellos del nuevo UID.
            }
        })
        .catch((error) => {
            console.error("Error al iniciar sesión con Google:", error);
            messageDisplay.textContent = `Error al iniciar sesión: ${error.message}`;
        });
}

function signOutUser() {
    auth.signOut()
        .then(() => {
            console.log("Sesión cerrada.");
            // onAuthStateChanged se disparará y volverá al usuario anónimo.
            currentStamps = 0; // Reiniciar los sellos visualmente
            updateDisplay();
            messageDisplay.textContent = 'Sesión cerrada. Puedes iniciar sesión o continuar como invitado.';
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
            messageDisplay.textContent = `Error al cerrar sesión: ${error.message}`;
        });
}


// --- Lógica de la Interfaz ---

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
    if (currentStamps < MAX_STAMPS) {
        currentStamps++;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
    }
});

redeemBtn.addEventListener('click', () => {
    if (currentStamps >= MAX_STAMPS) {
        currentStamps = 0;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
        alert('¡Recompensa canjeada! Disfruta tu café gratis. 😉');
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres reiniciar la tarjeta? Esto borrará todos los sellos.')) {
        currentStamps = 0;
        saveStamps(); // Guarda en Firebase
        updateDisplay();
        alert('Tarjeta de lealtad reiniciada.');
    }
});

authBtn.addEventListener('click', () => {
    if (currentUser && !currentUser.isAnonymous) { // Si el usuario no es anónimo, significa que está logueado con Google
        signOutUser();
    } else {
        signInWithGoogle(); // Si es anónimo o no hay nadie, intenta Google Sign-In
    }
});


// NOTA: onAuthStateChanged ya maneja el inicio de la aplicación
// y la lógica de signInAnonymously().
