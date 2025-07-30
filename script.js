// Importaciones de Firebase SDK (versión modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// Agregamos onSnapshot y orderBy para escucha en tiempo real y ordenación
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo",
  authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
  projectId: "mi-cafeteria-lealtad",
  storageBucket: "mi-cafeteria-lealtad.appspot.com",
  messagingSenderId: "1098066759983",
  appId: "1:1098066759983:web:99be4197dbbb81f6f9d1da"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constantes ---
const STAMPS_PER_FREE_COFFEE = 10; // Define cuántos sellos se necesitan para un café gratis

// Variables para referencias a elementos del DOM (se inicializan en DOMContentLoaded)
let loginBtn, logoutBtn, userIdDisplay, userEmailDisplay, userPointsDisplay, messageDisplay, adminSection, userSection;
let stampsDisplay, progressMessage, userFreeCoffeesDisplay;
let userQrCodeContainer, userQrCodeDisplay; // Contenedor y canvas para el QR del usuario
let userTransactionsHistoryDiv; // Nueva variable para el historial de transacciones del usuario

let adminEmailInput, searchClientBtn, clientInfoDiv, addStampBtn, removeStampBtn, redeemCoffeeBtn, resetCardBtn;
let totalClientsDisplay, pendingFreeCoffeesDisplay, averageStampsDisplay;
let generateReportBtn, reportPeriodSelect, reportResultsDiv;
let adminScanQRBtn, clientQRDisplay, closeQrDisplayBtn;


// Variables para el cliente actualmente cargado en el panel de administración
let currentAdminClient = null;

// Variable para guardar el "unsubscriber" de la escucha en tiempo real del usuario
let unsubscribeFromUserCard = null;

// Asegura que el DOM esté completamente cargado antes de interactuar con él
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a elementos del DOM aquí
    loginBtn = document.getElementById('loginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userIdDisplay = document.getElementById('userIdDisplay');
    userEmailDisplay = document.getElementById('userEmailDisplay'); // Se inicializa aquí
    userPointsDisplay = document.getElementById('userPointsDisplay');
    messageDisplay = document.getElementById('messageDisplay');
    adminSection = document.getElementById('admin-section');
    userSection = document.getElementById('user-section');

    stampsDisplay = document.getElementById('stamps-display');
    progressMessage = document.getElementById('progress-message');
    userFreeCoffeesDisplay = document.getElementById('userFreeCoffeesDisplay');

    // Referencias para el QR del usuario (ahora un canvas)
    userQrCodeContainer = document.getElementById('user-qr-container');
    userQrCodeDisplay = document.getElementById('user-qr-code'); // Este ahora es el CANVASS
    userTransactionsHistoryDiv = document.getElementById('user-transactions-history'); // Historial del usuario


    adminEmailInput = document.getElementById('admin-email-input');
    searchClientBtn = document.getElementById('search-client-btn');
    clientInfoDiv = document.getElementById('client-info');
    addStampBtn = document.getElementById('add-stamp-btn');
    removeStampBtn = document.getElementById('remove-stamp-btn');
    redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
    resetCardBtn = document.getElementById('reset-card-btn');
    totalClientsDisplay = document.getElementById('total-clients');
    pendingFreeCoffeesDisplay = document.getElementById('pending-free-coffees');
    averageStampsDisplay = document.getElementById('average-stamps');
    generateReportBtn = document.getElementById('generate-report-btn');
    reportPeriodSelect = document.getElementById('report-period');
    reportResultsDiv = document.getElementById('report-results');
    adminScanQRBtn = document.getElementById('admin-scan-qr-btn');
    clientQRDisplay = document.getElementById('client-qr-display');
    closeQrDisplayBtn = document.getElementById('close-qr-display');


    // --- Funciones de Autenticación ---

    const googleProvider = new GoogleAuthProvider();

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error("Error al iniciar sesión:", error.message);
                showMessage(`Error al iniciar sesión: ${error.message}`, 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Al cerrar sesión, también detenemos la escucha en tiempo real
                if (unsubscribeFromUserCard) {
                    unsubscribeFromUserCard();
                    unsubscribeFromUserCard = null;
                }
                await signOut(auth);
            } catch (error) {
                console.error("Error al cerrar sesión:", error.message);
                showMessage(`Error al cerrar sesión: ${error.message}`, 'error');
            }
        });
    }


    // --- Manejo del Estado de Autenticación (Este es el controlador principal de UI) ---
    onAuthStateChanged(auth, async (user) => {
        // Ocultar todas las secciones por defecto para evitar "flashes" de contenido
        // y para que la animación de entrada funcione desde 0
        if (userSection) userSection.classList.remove('active'); // Remover para animar la entrada
        if (adminSection) adminSection.classList.remove('active'); // Remover para animar la entrada
        if (messageDisplay) messageDisplay.style.display = 'none'; // Ocultar mensaje inicial

        if (user) {
            // Usuario logueado
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            showMessage(`Bienvenido, ${user.displayName || user.email}!`, 'success');

            // Cargar datos del usuario para determinar su rol (admin/normal)
            const userDocRef = doc(db, 'users', user.uid);
            let userDoc = await getDoc(userDocRef);

            // Si el documento del usuario no existe, crearlo
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    stamps: 0,
                    freeCoffees: 0,
                    isAdmin: false, // Por defecto no es admin
                    createdAt: Timestamp.now()
                });
                // Vuelve a obtener el documento después de crearlo para asegurar que exista
                userDoc = await getDoc(userDocRef);
            }

            // Ahora que tenemos el documento actualizado, determinamos el rol
            const userData = userDoc.data();
            if (userData && userData.isAdmin) {
                if (adminSection) {
                    adminSection.style.display = 'block';
                    setTimeout(() => adminSection.classList.add('active'), 50); // Pequeño retraso para la transición
                }
                loadAdminDashboard();
                // Si el usuario es admin, asegurarnos de que no estamos escuchando su tarjeta en tiempo real
                if (unsubscribeFromUserCard) {
                    unsubscribeFromUserCard();
                    unsubscribeFromUserCard = null;
                }
            } else {
                if (userSection) {
                    userSection.style.display = 'block';
                    setTimeout(() => userSection.classList.add('active'), 50); // Pequeño retraso para la transición
                }
                // Usamos onSnapshot para escuchar cambios en tiempo real en la tarjeta del usuario
                listenForUserCardChanges(user.uid);
                // Cargar el historial de transacciones del usuario
                loadUserTransactions(user.uid);
            }

        } else {
            // Usuario no logueado
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            showMessage('Por favor, inicia sesión.', 'info');
            clearUserCard();
            clearAdminDashboard();
            // Detener cualquier escucha activa al cerrar sesión
            if (unsubscribeFromUserCard) {
                unsubscribeFromUserCard();
                unsubscribeFromUserCard = null;
            }
        }
    });

    // --- Funciones de la Tarjeta de Lealtad del Usuario ---

    // Función para escuchar cambios en tiempo real en la tarjeta del usuario
    function listenForUserCardChanges(uid) {
        if (!uid) {
            console.error("UID no proporcionado para escuchar cambios en la tarjeta.");
            return;
        }

        const userDocRef = doc(db, 'users', uid);

        // Si ya hay una suscripción activa, la cerramos primero para evitar duplicados
        if (unsubscribeFromUserCard) {
            unsubscribeFromUserCard();
        }

        unsubscribeFromUserCard = onSnapshot(userDocRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                const currentStamps = userData.stamps || 0;
                const freeCoffees = userData.freeCoffees || 0;

                if (userIdDisplay) userIdDisplay.textContent = `${userData.uid || uid}`; // Solo el UID, la etiqueta "ID de Usuario:" ya está en HTML
                // *** CORRECCIÓN DEL EMAIL DUPLICADO AQUÍ ***
                if (userEmailDisplay) userEmailDisplay.textContent = userData.email || 'N/A'; // Solo el email, la etiqueta "Email:" ya está en HTML
                if (userPointsDisplay) userPointsDisplay.textContent = `${currentStamps}`; // Solo el número, la etiqueta "Sellos Actuales:" ya está en HTML
                if (userFreeCoffeesDisplay) userFreeCoffeesDisplay.textContent = freeCoffees;

                updateStampsDisplay(currentStamps);
                updateProgressMessage(currentStamps);

                // Generar QR (ahora con qrious)
                if (userQrCodeDisplay) {
                    try {
                        // Limpiar el canvas antes de dibujar un nuevo QR
                        const canvas = userQrCodeDisplay;
                        const context = canvas.getContext('2d');
                        if (context) context.clearRect(0, 0, canvas.width, canvas.height); // Asegurar que el contexto existe

                        new QRious({
                            element: userQrCodeDisplay, // El elemento canvas
                            value: uid, // El UID es el valor a codificar
                            size: 150, // Tamaño del QR
                            level: 'H' // Nivel de corrección de error (L, M, Q, H)
                        });
                        if (userQrCodeContainer) userQrCodeContainer.style.display = 'flex';
                    } catch (qrError) {
                        console.error("Error al generar QR con qrious:", qrError);
                        if (userQrCodeContainer) userQrCodeContainer.style.display = 'none';
                    }
                } else {
                    console.error("Elemento canvas 'user-qr-code' no encontrado.");
                    if (userQrCodeContainer) userQrCodeContainer.style.display = 'none';
                }

            } else {
                console.warn("Documento de usuario no encontrado o eliminado.");
                clearUserCard(); // Limpiar si el documento no existe
            }
        }, (error) => {
            console.error("Error al escuchar cambios en la tarjeta del usuario:", error);
            showMessage("Error al cargar tu tarjeta en tiempo real.", 'error');
            clearUserCard();
        });
    }

    function updateStampsDisplay(stamps) {
        if (!stampsDisplay) return;
        stampsDisplay.innerHTML = '';
        const totalStamps = STAMPS_PER_FREE_COFFEE;

        for (let i = 1; i <= totalStamps; i++) {
            const stampDiv = document.createElement('div');
            stampDiv.classList.add('stamp');
            // Cambiado para usar imagen de café para sellos obtenidos
            if (i <= stamps) {
                stampDiv.classList.add('obtained');
                stampDiv.innerHTML = '<img src="https://img.icons8.com/emoji/48/hot-beverage.png" alt="Café">'; // Icono de café
            } else {
                stampDiv.textContent = i; // Mostrar número si no está obtenido
            }
            stampsDisplay.appendChild(stampDiv);
        }
    }

    function updateProgressMessage(stamps) {
        if (!progressMessage) return;
        const remainingStamps = STAMPS_PER_FREE_COFFEE - stamps;
        if (remainingStamps <= 0) {
            progressMessage.textContent = '¡Felicidades! Tienes un café gratis para canjear.';
            progressMessage.style.backgroundColor = '#d4edda';
            progressMessage.style.color = '#155724';
        } else {
            progressMessage.textContent = `¡Casi lo tienes! Te faltan ${remainingStamps} sellos para tu café gratis.`;
            progressMessage.style.backgroundColor = '#ffeeba';
            progressMessage.style.color = '#856404';
        }
    }

    // --- Función: Cargar historial de transacciones del usuario ---
    async function loadUserTransactions(uid) {
        if (!userTransactionsHistoryDiv) return;

        userTransactionsHistoryDiv.innerHTML = '<p>Cargando historial...</p>'; // Mensaje de carga

        try {
            const transactionsRef = collection(db, 'transactions');
            // Consulta las transacciones para este usuario, ordenadas por fecha descendente
            const q = query(transactionsRef,
                            where('userId', '==', uid),
                            orderBy('timestamp', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                userTransactionsHistoryDiv.innerHTML = '<p>No hay transacciones registradas aún.</p>';
                return;
            }

            const ul = document.createElement('ul');
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                const date = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'Fecha desconocida';

                let description = '';
                switch (data.type) {
                    case 'stamp_added':
                        description = `Sello añadido (total: ${data.stampsAfter})`;
                        li.classList.add('transaction-type-stamp_added');
                        break;
                    case 'free_coffee_earned':
                        description = `¡Café gratis ganado! (Tienes ${data.earnedCoffeeCount})`;
                        li.classList.add('transaction-type-free_coffee_earned');
                        break;
                    case 'coffee_redeemed':
                        description = `Café gratis canjeado (restantes: ${data.freeCoffeesRemaining})`;
                        li.classList.add('transaction-type-coffee_redeemed');
                        break;
                    case 'stamp_removed':
                        description = `Sello quitado (total: ${data.stampsAfter})`;
                        li.classList.add('transaction-type-stamp_removed');
                        break;
                    case 'card_reset':
                        description = `Tarjeta reiniciada`;
                        li.classList.add('transaction-type-card_reset');
                        break;
                    default:
                        description = `Transacción tipo: ${data.type}`;
                }

                li.innerHTML = `<span>${description}</span><span>${date}</span>`;
                ul.appendChild(li);
            });
            userTransactionsHistoryDiv.innerHTML = ''; // Limpiar el mensaje de carga
            userTransactionsHistoryDiv.appendChild(ul);

        } catch (error) {
            console.error("Error al cargar el historial de transacciones:", error);
            userTransactionsHistoryDiv.innerHTML = '<p class="message error">Error al cargar el historial. Inténtalo de nuevo.</p>';
        }
    }


    function clearUserCard() {
        if (userIdDisplay) userIdDisplay.textContent = 'N/A';
        if (userEmailDisplay) userEmailDisplay.textContent = 'N/A';
        if (userPointsDisplay) userPointsDisplay.textContent = '0';
        if (userFreeCoffeesDisplay) userFreeCoffeesDisplay.textContent = '0';
        if (stampsDisplay) stampsDisplay.innerHTML = '';
        if (progressMessage) {
            progressMessage.textContent = '';
            progressMessage.style.backgroundColor = '';
            progressMessage.style.color = '';
        }
        // Limpiar y ocultar el contenedor del QR del usuario
        if (userQrCodeContainer) userQrCodeContainer.style.display = 'none';
        if (userQrCodeDisplay) {
            // Si es canvas, también se puede limpiar
            const canvas = userQrCodeDisplay;
            const context = canvas.getContext('2d');
            if (context) context.clearRect(0, 0, canvas.width, canvas.height);
        }
        // Limpiar el historial de transacciones del usuario
        if (userTransactionsHistoryDiv) userTransactionsHistoryDiv.innerHTML = '<p>No hay transacciones registradas aún.</p>';
    }


    // --- Funciones del Panel de Administración ---

    async function loadAdminDashboard() {
        try {
            await loadAdminStats();
            await generateReport();
        }
        catch (error) {
            console.error("Error al cargar el panel de administración:", error);
            showMessage("Error al cargar el panel de administración.", 'error');
        }
    }

    async function loadAdminStats() {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);

            let totalClients = 0;
            let totalStamps = 0;
            let totalFreeCoffeesPending = 0;

            querySnapshot.forEach(doc => {
                totalClients++;
                const userData = doc.data();
                totalStamps += userData.stamps || 0;
                totalFreeCoffeesPending += userData.freeCoffees || 0;
            });

            if (totalClientsDisplay) totalClientsDisplay.textContent = totalClients;
            if (pendingFreeCoffeesDisplay) pendingFreeCoffeesDisplay.textContent = totalFreeCoffeesPending;
            if (averageStampsDisplay) averageStampsDisplay.textContent = totalClients > 0 ? (totalStamps / totalClients).toFixed(1) : 0;

        } catch (error) {
            console.error("Error al cargar estadísticas de administración:", error);
            showMessage("Error al cargar estadísticas.", 'error');
        }
    }

    // Refactorización: Centralizar la actualización de la UI del cliente admin
    function updateAdminClientUI() {
        if (!clientInfoDiv) return; // Asegurarse de que el elemento exista

        if (!currentAdminClient) {
            clientInfoDiv.innerHTML = '<p>No hay cliente cargado.</p>';
            return;
        }

        clientInfoDiv.innerHTML = `
            <p><strong>ID:</strong> ${currentAdminClient.id}</p>
            <p><strong>Email:</strong> ${currentAdminClient.email}</p>
            <p><strong>Nombre:</strong> ${currentAdminClient.displayName || 'N/A'}</p>
            <p><strong>Sellos Actuales:</strong> <span id="admin-client-stamps">${currentAdminClient.stamps || 0}</span></p>
            <p><strong>Cafés Gratis Pendientes:</strong> <span id="admin-client-freecoffees">${currentAdminClient.freeCoffees || 0}</span></p>
            <div id="admin-client-stamps-display" class="stamps-grid"></div>
            <p><button id="show-client-qr-btn" class="action-button">Mostrar QR del Cliente</button></p>
        `;
        const adminClientStampsDisplay = clientInfoDiv.querySelector('#admin-client-stamps-display');
        updateAdminClientStampsDisplay(currentAdminClient.stamps || 0, adminClientStampsDisplay);

        const showClientQrBtn = clientInfoDiv.querySelector('#show-client-qr-btn');
        if (showClientQrBtn) {
            showClientQrBtn.addEventListener('click', () => {
                showClientQR(currentAdminClient.id);
            });
        }
    }


    if (searchClientBtn) {
        searchClientBtn.addEventListener('click', async () => {
            const searchTerm = adminEmailInput.value.trim();
            if (!searchTerm) {
                showMessage("Por favor, ingresa un Email o UID.", 'warning');
                return;
            }

            try {
                let clientDoc;
                let clientDocRef;

                // Intenta buscar por UID primero
                clientDocRef = doc(db, 'users', searchTerm);
                clientDoc = await getDoc(clientDocRef);

                // Si no se encuentra por UID, busca por email
                if (!clientDoc.exists()) {
                    const q = query(collection(db, 'users'), where('email', '==', searchTerm));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        clientDoc = querySnapshot.docs[0];
                        clientDocRef = doc(db, 'users', clientDoc.id); // Establece la referencia correcta
                    }
                }

                if (clientDoc && clientDoc.exists()) {
                    currentAdminClient = { id: clientDoc.id, ...clientDoc.data() };
                    updateAdminClientUI(); // Usar la función refactorizada
                    showMessage("Cliente cargado exitosamente.", 'success');
                } else {
                    currentAdminClient = null;
                    updateAdminClientUI(); // Limpiar UI si no se encuentra
                    showMessage("Cliente no encontrado.", 'error');
                }

            } catch (error) {
                console.error("Error al buscar cliente:", error);
                showMessage(`Error al buscar cliente: ${error.message}`, 'error');
                currentAdminClient = null;
                updateAdminClientUI(); // Limpiar UI en caso de error
            }
        });
    }


    function updateAdminClientStampsDisplay(stamps, displayElement) {
        if (!displayElement) return;
        displayElement.innerHTML = '';
        const totalStamps = STAMPS_PER_FREE_COFFEE;

        for (let i = 1; i <= totalStamps; i++) {
            const stampDiv = document.createElement('div');
            stampDiv.classList.add('stamp');
            stampDiv.classList.add('admin-stamp');
            if (i <= stamps) {
                stampDiv.classList.add('obtained');
                stampDiv.innerHTML = '<img src="https://img.icons8.com/emoji/48/hot-beverage.png" alt="Café">';
            } else {
                stampDiv.textContent = i;
            }
            displayElement.appendChild(stampDiv);
        }
    }

    if (adminScanQRBtn) {
        adminScanQRBtn.addEventListener('click', () => {
            showMessage("La funcionalidad de escanear QR requiere configuración avanzada (librerías JS de escaneo y permiso de cámara).", 'info');
        });
    }


    function showClientQR(uid) {
        if (!uid) {
            showMessage("No hay UID de cliente para generar QR.", 'error');
            return;
        }
        if (clientQRDisplay) {
            // Reutilizamos qrious para el QR del admin también
            const canvas = document.createElement('canvas');
            clientQRDisplay.innerHTML = ''; // Limpiar cualquier contenido previo
            clientQRDisplay.appendChild(canvas);
            new QRious({
                element: canvas,
                value: uid,
                size: 150,
                level: 'H'
            });
            clientQRDisplay.style.display = 'flex';
        }
    }

    if (closeQrDisplayBtn) {
        closeQrDisplayBtn.addEventListener('click', () => {
            if (clientQRDisplay) {
                clientQRDisplay.style.display = 'none';
                clientQRDisplay.innerHTML = '';
            }
        });
    }


    // --- Lógica de Sellos y Café Gratis (Admin) ---

    if (addStampBtn) {
        addStampBtn.addEventListener('click', async () => {
            if (!currentAdminClient) {
                showMessage("Carga un cliente primero.", 'warning');
                return;
            }
            if (currentAdminClient.stamps >= STAMPS_PER_FREE_COFFEE) { // Usar constante
                showMessage("El cliente ya tiene el máximo de sellos. Canjea su café gratis primero.", 'warning');
                return;
            }

            try {
                const newStamps = currentAdminClient.stamps + 1;
                await updateDoc(doc(db, 'users', currentAdminClient.id), { stamps: newStamps });
                currentAdminClient.stamps = newStamps;

                await addDoc(collection(db, 'transactions'), {
                    type: 'stamp_added',
                    userId: currentAdminClient.id,
                    adminId: auth.currentUser.uid,
                    timestamp: Timestamp.now(),
                    stampsBefore: newStamps - 1,
                    stampsAfter: newStamps
                });

                if (newStamps === STAMPS_PER_FREE_COFFEE) { // Usar constante
                    const newFreeCoffees = (currentAdminClient.freeCoffees || 0) + 1;
                    await updateDoc(doc(db, 'users', currentAdminClient.id), {
                        stamps: 0,
                        freeCoffees: newFreeCoffees
                    });
                    currentAdminClient.stamps = 0;
                    currentAdminClient.freeCoffees = newFreeCoffees;

                    await addDoc(collection(db, 'transactions'), {
                        type: 'free_coffee_earned',
                        userId: currentAdminClient.id,
                        adminId: auth.currentUser.uid,
                        timestamp: Timestamp.now(),
                        earnedCoffeeCount: newFreeCoffees
                    });

                    showMessage(`¡Se añadió un sello y el cliente ganó un café gratis!`, 'success');
                } else {
                    showMessage(`Se añadió un sello. Nuevo total: ${newStamps}.`, 'success');
                }

                updateAdminClientUI(); // Usar la función refactorizada
                loadAdminStats();

            } catch (error) {
                console.error("Error al añadir sello:", error);
                showMessage(`Error al añadir sello: ${error.message}`, 'error');
            }
        });
    }


    if (removeStampBtn) {
        removeStampBtn.addEventListener('click', async () => {
            if (!currentAdminClient) {
                showMessage("Carga un cliente primero.", 'warning');
                return;
            }
            if (currentAdminClient.stamps <= 0) {
                showMessage("El cliente no tiene sellos para quitar.", 'warning');
                return;
            }

            try {
                const newStamps = currentAdminClient.stamps - 1;
                await updateDoc(doc(db, 'users', currentAdminClient.id), { stamps: newStamps });
                currentAdminClient.stamps = newStamps;

                await addDoc(collection(db, 'transactions'), {
                    type: 'stamp_removed',
                    userId: currentAdminClient.id,
                    adminId: auth.currentUser.uid,
                    timestamp: Timestamp.now(),
                    stampsBefore: newStamps + 1,
                    stampsAfter: newStamps
                });

                showMessage(`Se quitó un sello. Nuevo total: ${newStamps}.`, 'success');
                updateAdminClientUI(); // Usar la función refactorizada
                loadAdminStats();

            } catch (error) {
                console.error("Error al quitar sello:", error);
                showMessage(`Error al quitar sello: ${error.message}`, 'error');
            }
        });
    }


    if (redeemCoffeeBtn) {
        redeemCoffeeBtn.addEventListener('click', async () => {
            if (!currentAdminClient) {
                showMessage("Carga un cliente primero.", 'warning');
                return;
            }
            if ((currentAdminClient.freeCoffees || 0) <= 0) {
                showMessage("El cliente no tiene cafés gratis pendientes para canjear.", 'warning');
                return;
            }

            try {
                const newFreeCoffees = currentAdminClient.freeCoffees - 1;
                await updateDoc(doc(db, 'users', currentAdminClient.id), { freeCoffees: newFreeCoffees });
                currentAdminClient.freeCoffees = newFreeCoffees;

                await addDoc(collection(db, 'transactions'), {
                    type: 'coffee_redeemed',
                    userId: currentAdminClient.id,
                    adminId: auth.currentUser.uid,
                    timestamp: Timestamp.now(),
                    freeCoffeesRemaining: newFreeCoffees
                });

                showMessage(`Se canjeó un café gratis. Quedan ${newFreeCoffees}.`, 'success');
                updateAdminClientUI(); // Usar la función refactorizada
                loadAdminStats();

            } catch (error) {
                console.error("Error al canjear café:", error);
                showMessage(`Error al canjear café: ${error.message}`, 'error');
            }
        });
    }


    if (resetCardBtn) {
        resetCardBtn.addEventListener('click', async () => {
            if (!currentAdminClient) {
                showMessage("Carga un cliente primero.", 'warning');
                return;
            }
            if (!confirm("¿Estás seguro de reiniciar la tarjeta de este cliente? Esto pondrá sus sellos a 0 y sus cafés gratis a 0.")) {
                return;
            }

            try {
                await updateDoc(doc(db, 'users', currentAdminClient.id), {
                    stamps: 0,
                    freeCoffees: 0
                });
                currentAdminClient.stamps = 0;
                currentAdminClient.freeCoffees = 0;

                await addDoc(collection(db, 'transactions'), {
                    type: 'card_reset',
                    userId: currentAdminClient.id,
                    adminId: auth.currentUser.uid,
                    timestamp: Timestamp.now()
                });

                showMessage("Tarjeta reiniciada exitosamente.", 'success');
                updateAdminClientUI(); // Usar la función refactorizada
                loadAdminStats();

            } catch (error) {
                console.error("Error al reiniciar tarjeta:", error);
                showMessage(`Error al reiniciar tarjeta: ${error.message}`, 'error');
            }
        });
    }


    // --- Reportes y Analíticas (Admin) ---

    if (reportPeriodSelect) reportPeriodSelect.addEventListener('change', generateReport);
    if (generateReportBtn) generateReportBtn.addEventListener('click', generateReport);


    async function generateReport() {
        const period = reportPeriodSelect ? reportPeriodSelect.value : 'alltime';
        let startDate = new Date();

        switch (period) {
            case '7days':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90days':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case 'alltime':
            default:
                startDate = new Date(0); // Desde el Epoch (1 de enero de 1970)
                break;
        }

        const startDateTimestamp = Timestamp.fromDate(startDate);

        try {
            const transactionsRef = collection(db, 'transactions');
            const q = query(transactionsRef, where('timestamp', '>=', startDateTimestamp));
            const querySnapshot = await getDocs(q);

            let stampsAdded = 0;
            let coffeesRedeemed = 0;
            let cardsReset = 0;
            let stampsRemoved = 0;

            querySnapshot.forEach(doc => {
                const data = doc.data();
                switch (data.type) {
                    case 'stamp_added':
                        stampsAdded++;
                        break;
                    case 'free_coffee_earned':
                        // Estos se registran como transacciones separadas pero se contabilizan al añadir sello
                        break;
                    case 'coffee_redeemed':
                        coffeesRedeemed++;
                        break;
                    case 'card_reset':
                        cardsReset++;
                        break;
                    case 'stamp_removed':
                        stampsRemoved++;
                        break;
                }
            });

            if (reportResultsDiv) {
                reportResultsDiv.innerHTML = `
                    <p><strong>Reporte de los últimos ${period === 'alltime' ? 'tiempos' : period.replace('days', ' días')}:</strong></p>
                    <ul>
                        <li>Sellos Añadidos: ${stampsAdded}</li>
                        <li>Cafés Gratuitos Canjeados: ${coffeesRedeemed}</li>
                        <li>Tarjetas Reiniciadas: ${cardsReset}</li>
                        <li>Sellos Quitados: ${stampsRemoved}</li>
                    </ul>
                `;
            }

        } catch (error) {
            console.error("Error al generar reporte:", error);
            showMessage(`Error al generar reporte: ${error.message}`, 'error');
        }
    }

    function clearAdminDashboard() {
        if (totalClientsDisplay) totalClientsDisplay.textContent = '0';
        if (pendingFreeCoffeesDisplay) pendingFreeCoffeesDisplay.textContent = '0';
        if (averageStampsDisplay) averageStampsDisplay.textContent = '0';
        if (adminEmailInput) adminEmailInput.value = '';
        if (reportResultsDiv) reportResultsDiv.innerHTML = '';
        if (clientQRDisplay) {
            clientQRDisplay.style.display = 'none';
            clientQRDisplay.innerHTML = '';
        }
        currentAdminClient = null; // Limpiar el cliente cargado
        updateAdminClientUI(); // Asegurarse de que la UI del cliente se limpie también
    }

    // --- Función para mostrar mensajes al usuario ---
    function showMessage(msg, type = 'info') {
        if (!messageDisplay) {
            console.warn("Elemento 'messageDisplay' no encontrado. No se pueden mostrar mensajes.");
            return;
        }
        messageDisplay.textContent = msg;
        messageDisplay.className = 'message ' + type; // Resetear clases y añadir la nueva
        messageDisplay.style.display = 'block'; // Asegurarse de que sea visible para la animación

        setTimeout(() => {
            // Para una animación de salida suave, podrías añadir una clase temporal de salida en CSS
            // Por simplicidad, aquí lo ocultamos directamente:
            messageDisplay.style.display = 'none';
            messageDisplay.textContent = '';
            messageDisplay.className = 'message'; // Limpiar clases para el siguiente mensaje
        }, 5000);
    }

}); // Fin del DOMContentLoaded
