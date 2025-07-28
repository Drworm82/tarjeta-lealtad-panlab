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

// --- Funciones para interactuar con Firebase ---

// Iniciar sesión de forma anónima o mantener la sesión
function signInAnonymously() {
    auth.signInAnonymously()
        .then((userCredential) => {
            currentUser = userCredential.user;
            console.log("Usuario anónimo logueado:", currentUser.uid);
            loadStamps(); // Carga los sellos después de identificar al usuario
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error al iniciar sesión anónima:", errorCode, errorMessage);
            messageDisplay.textContent = "Error al conectar la tarjeta. Intenta de nuevo.";
        });
}

// Cargar sellos desde Firestore para el usuario actual
function loadStamps() {
    if (!currentUser) {
        console.warn("No hay usuario autenticado para cargar sellos.");
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

// Guardar sellos en Firestore para el usuario actual
function saveStamps() {
    if (!currentUser) {
        console.warn("No hay usuario autenticado para guardar sellos.");
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

// --- Lógica de la Interfaz (similar a la anterior) ---

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

// --- Inicio de la Aplicación ---
// Cuando la aplicación carga, intenta autenticar un usuario anónimo
signInAnonymously();
