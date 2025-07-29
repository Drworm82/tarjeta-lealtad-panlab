// Importaciones de Firebase SDK (versión modular) - ESTAS DEBEN IR AL PRINCIPIO DEL ARCHIVO
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Tu configuración de Firebase - TAMBIÉN PUEDE IR FUERA DEL DOMContentLoaded
const firebaseConfig = {
  apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo",
  authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
  projectId: "mi-cafeteria-lealtad",
  storageBucket: "mi-cafeteria-lealtad.appspot.com",
  messagingSenderId: "1098066759983",
  appId: "1:1098066759983:web:99be4197dbbb81f6f9d1da"
};

// Inicializa Firebase - TAMBIÉN PUEDE IR FUERA DEL DOMContentLoaded
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// El resto de tu código que interactúa con el DOM debe ir dentro de DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {

    // Referencias a elementos del DOM
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const userPointsDisplay = document.getElementById('userPointsDisplay');
    const messageDisplay = document.getElementById('messageDisplay');
    const adminSection = document.getElementById('admin-section');
    const userSection = document.getElementById('user-section');

    // Elementos de la tarjeta de lealtad
    const stampsDisplay = document.getElementById('stamps-display');
    const progressMessage = document.getElementById('progress-message');

    // Elementos del panel de administración
    const adminEmailInput = document.getElementById('admin-email-input');
    const searchClientBtn = document.getElementById('search-client-btn');
    const clientInfoDiv = document.getElementById('client-info');
    const addStampBtn = document.getElementById('add-stamp-btn');
    const removeStampBtn = document.getElementById('remove-stamp-btn');
    const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
    const resetCardBtn = document.getElementById('reset-card-btn');
    const totalClientsDisplay = document.getElementById('total-clients');
    const pendingFreeCoffeesDisplay = document.getElementById('pending-free-coffees');
    const averageStampsDisplay = document.getElementById('average-stamps');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const reportPeriodSelect = document.getElementById('report-period');
    const reportResultsDiv = document.getElementById('report-results');
    const adminScanQRBtn = document.getElementById('admin-scan-qr-btn');
    const clientQRDisplay = document.getElementById('client-qr-display');
    const closeQrDisplayBtn = document.getElementById('close-qr-display');

    // Variables para el cliente actualmente cargado en el panel de administración
    let currentAdminClient = null;

    // --- Funciones de Autenticación ---

    const googleProvider = new GoogleAuthProvider();

    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error al iniciar sesión:", error.message);
            showMessage(`Error al iniciar sesión: ${error.message}`, 'error');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error.message);
            showMessage(`Error al cerrar sesión: ${error.message}`, 'error');
        }
    });

    // --- Manejo del Estado de Autenticación (Este es el controlador principal de UI) ---

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuario logueado
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            showMessage(`Bienvenido, ${user.displayName || user.email}!`, 'success');

            // Determinar si es administrador
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.isAdmin) {
                    adminSection.style.display = 'block';
                    userSection.style.display = 'none'; // Si es admin, ocultar sección de usuario
                    loadAdminDashboard();
                } else {
                    adminSection.style.display = 'none';
                    userSection.style.display = 'block'; // Mostrar solo sección de usuario
                    loadUserCard(user);
                }
            } else {
                // Nuevo usuario o usuario sin perfil aún
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    stamps: 0,
                    freeCoffees: 0,
                    isAdmin: false,
                    createdAt: Timestamp.now()
                });
                adminSection.style.display = 'none';
                userSection.style.display = 'block'; // Mostrar solo sección de usuario
                loadUserCard(user);
            }

        } else {
            // Usuario no logueado
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            userSection.style.display = 'none';
            adminSection.style.display = 'none';
            showMessage('Por favor, inicia sesión.', 'info');
            clearUserCard();
            clearAdminDashboard();
        }
    });

    // --- Funciones de la Tarjeta de Lealtad del Usuario ---

    async function loadUserCard(user) {
        if (!user) return;

        userIdDisplay.textContent = `ID: ${user.uid}`;
        userEmailDisplay.textContent = `Email: ${user.email}`;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentStamps = userData.stamps || 0;
                userPointsDisplay.textContent = `Sellos: ${currentStamps}`;
                updateStampsDisplay(currentStamps);
                updateProgressMessage(currentStamps);
            } else {
                console.warn("Documento de usuario no encontrado al cargar la tarjeta.");
                updateStampsDisplay(0);
                updateProgressMessage(0);
            }
        } catch (error) {
            console.error("Error al cargar tarjeta de usuario:", error);
            showMessage("Error al cargar tu tarjeta.", 'error');
        }
    }

    function updateStampsDisplay(stamps) {
        stampsDisplay.innerHTML = ''; // Limpiar sellos existentes
        const totalStamps = 10; // Total de sellos para un café gratis

        for (let i = 1; i <= totalStamps; i++) {
            const stampDiv = document.createElement('div');
            stampDiv.classList.add('stamp');
            if (i <= stamps) {
                stampDiv.classList.add('obtained'); // Clase para sellos obtenidos
            }
            stampDiv.textContent = i; // Mostrar el número del sello
            stampsDisplay.appendChild(stampDiv);
        }
    }

    function updateProgressMessage(stamps) {
        const remainingStamps = 10 - stamps;
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

    function clearUserCard() {
        userIdDisplay.textContent = 'ID: N/A';
        userEmailDisplay.textContent = 'Email: N/A';
        userPointsDisplay.textContent = 'Sellos: 0';
        stampsDisplay.innerHTML = '';
        progressMessage.textContent = '';
        progressMessage.style.backgroundColor = '';
        progressMessage.style.color = '';
    }

    // --- Funciones del Panel de Administración ---

    async function loadAdminDashboard() {
        try {
            await loadAdminStats();
            await generateReport(); // Generar reporte inicial (últimos 7 días)
        } catch (error) {
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

            totalClientsDisplay.textContent = totalClients;
            pendingFreeCoffeesDisplay.textContent = totalFreeCoffeesPending;
            averageStampsDisplay.textContent = totalClients > 0 ? (totalStamps / totalClients).toFixed(1) : 0;

        } catch (error) {
            console.error("Error al cargar estadísticas de administración:", error);
            showMessage("Error al cargar estadísticas.", 'error');
        }
    }

    searchClientBtn.addEventListener('click', async () => {
        const searchTerm = adminEmailInput.value.trim();
        if (!searchTerm) {
            showMessage("Por favor, ingresa un Email o UID.", 'warning');
            return;
        }

        try {
            let clientDoc;
            let clientDocRef;

            clientDocRef = doc(db, 'users', searchTerm);
            clientDoc = await getDoc(clientDocRef);

            if (!clientDoc.exists()) {
                const q = query(collection(db, 'users'), where('email', '==', searchTerm));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    clientDoc = querySnapshot.docs[0];
                    clientDocRef = doc(db, 'users', clientDoc.id);
                }
            }

            if (clientDoc && clientDoc.exists()) {
                currentAdminClient = { id: clientDoc.id, ...clientDoc.data() };
                displayClientInfo(currentAdminClient);
                showMessage("Cliente cargado exitosamente.", 'success');
            } else {
                currentAdminClient = null;
                displayClientInfo(null);
                showMessage("Cliente no encontrado.", 'error');
            }

        } catch (error) {
            console.error("Error al buscar cliente:", error);
            showMessage(`Error al buscar cliente: ${error.message}`, 'error');
            currentAdminClient = null;
            displayClientInfo(null);
        }
    });

    function displayClientInfo(client) {
        clientInfoDiv.innerHTML = '';
        if (client) {
            clientInfoDiv.innerHTML = `
                <p><strong>ID:</strong> ${client.id}</p>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Nombre:</strong> ${client.displayName || 'N/A'}</p>
                <p><strong>Sellos Actuales:</strong> <span id="admin-client-stamps">${client.stamps || 0}</span></p>
                <p><strong>Cafés Gratis Pendientes:</strong> <span id="admin-client-freecoffees">${client.freeCoffees || 0}</span></p>
                <div id="admin-client-stamps-display" class="stamps-grid"></div>
                <p><button id="show-client-qr-btn">Mostrar QR del Cliente</button></p>
            `;
            const adminClientStampsDisplay = clientInfoDiv.querySelector('#admin-client-stamps-display');
            updateAdminClientStampsDisplay(client.stamps || 0, adminClientStampsDisplay);

            const showClientQrBtn = clientInfoDiv.querySelector('#show-client-qr-btn');
            if (showClientQrBtn) {
                showClientQrBtn.addEventListener('click', () => {
                    showClientQR(client.id);
                });
            }

        } else {
            clientInfoDiv.innerHTML = '<p>No hay cliente cargado.</p>';
        }
    }

    function updateAdminClientStampsDisplay(stamps, displayElement) {
        displayElement.innerHTML = ''; // Limpiar sellos existentes
        const totalStamps = 10;

        for (let i = 1; i <= totalStamps; i++) {
            const stampDiv = document.createElement('div');
            stampDiv.classList.add('stamp');
            stampDiv.classList.add('admin-stamp');
            if (i <= stamps) {
                stampDiv.classList.add('obtained');
            }
            stampDiv.textContent = i;
            displayElement.appendChild(stampDiv);
        }
    }

    adminScanQRBtn.addEventListener('click', () => {
        showMessage("La funcionalidad de escanear QR requiere configuración avanzada (librerías JS de escaneo y permiso de cámara).", 'info');
    });

    function showClientQR(uid) {
        if (!uid) {
            showMessage("No hay UID de cliente para generar QR.", 'error');
            return;
        }
        const qrCodeUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${uid}`;
        clientQRDisplay.innerHTML = `<img src="${qrCodeUrl}" alt="QR del Cliente">`;
        clientQRDisplay.style.display = 'flex';
    }

    closeQrDisplayBtn.addEventListener('click', () => {
        clientQRDisplay.style.display = 'none';
        clientQRDisplay.innerHTML = '';
    });

    // --- Lógica de Sellos y Café Gratis (Admin) ---

    addStampBtn.addEventListener('click', async () => {
        if (!currentAdminClient) {
            showMessage("Carga un cliente primero.", 'warning');
            return;
        }
        if (currentAdminClient.stamps >= 10) {
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

            if (newStamps === 10) {
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

            displayClientInfo(currentAdminClient);
            loadAdminStats();

        } catch (error) {
            console.error("Error al añadir sello:", error);
            showMessage(`Error al añadir sello: ${error.message}`, 'error');
        }
    });

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
            displayClientInfo(currentAdminClient);
            loadAdminStats();

        } catch (error) {
            console.error("Error al quitar sello:", error);
            showMessage(`Error al quitar sello: ${error.message}`, 'error');
        }
    });

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
            displayClientInfo(currentAdminClient);
            loadAdminStats();

        } catch (error) {
            console.error("Error al canjear café:", error);
            showMessage(`Error al canjear café: ${error.message}`, 'error');
        }
    });

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
            displayClientInfo(currentAdminClient);
            loadAdminStats();

        } catch (error) {
            console.error("Error al reiniciar tarjeta:", error);
            showMessage(`Error al reiniciar tarjeta: ${error.message}`, 'error');
        }
    });

    // --- Reportes y Analíticas (Admin) ---

    reportPeriodSelect.addEventListener('change', generateReport);
    generateReportBtn.addEventListener('click', generateReport);

    async function generateReport() {
        const period = reportPeriodSelect.value;
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
                startDate = new Date(0);
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

            reportResultsDiv.innerHTML = `
                <p><strong>Reporte de los últimos ${period === 'alltime' ? 'tiempos' : period.replace('days', ' días')}:</strong></p>
                <ul>
                    <li>Sellos Añadidos: ${stampsAdded}</li>
                    <li>Cafés Gratuitos Canjeados: ${coffeesRedeemed}</li>
                    <li>Tarjetas Reiniciadas: ${cardsReset}</li>
                    <li>Sellos Quitados: ${stampsRemoved}</li>
                </ul>
            `;

        } catch (error) {
            console.error("Error al generar reporte:", error);
            showMessage(`Error al generar reporte: ${error.message}`, 'error');
        }
    }

    function clearAdminDashboard() {
        totalClientsDisplay.textContent = '0';
        pendingFreeCoffeesDisplay.textContent = '0';
        averageStampsDisplay.textContent = '0';
        clientInfoDiv.innerHTML = '<p>No hay cliente cargado.</p>';
        adminEmailInput.value = '';
        reportResultsDiv.innerHTML = '';
    }

    // --- Función para mostrar mensajes al usuario ---
    function showMessage(msg, type = 'info') {
        messageDisplay.textContent = msg;
        messageDisplay.className = 'message ' + type;
        messageDisplay.style.display = 'block';

        setTimeout(() => {
            messageDisplay.style.display = 'none';
            messageDisplay.textContent = '';
            messageDisplay.className = 'message';
        }, 5000);
    }

}); // Fin del DOMContentLoaded
