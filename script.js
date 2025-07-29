// Importaciones de Firebase SDK (versión modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// Variables para referencias a elementos del DOM (se inicializan en DOMContentLoaded)
let loginBtn, logoutBtn, userIdDisplay, userEmailDisplay, userPointsDisplay, messageDisplay, adminSection, userSection;
let stampsDisplay, progressMessage, userFreeCoffeesDisplay;
let showUserQrBtn, userQRDisplay, closeUserQrDisplay;
let adminEmailInput, searchClientBtn, clientInfoDiv, addStampBtn, removeStampBtn, redeemCoffeeBtn, resetCardBtn;
let totalClientsDisplay, pendingFreeCoffeesDisplay, averageStampsDisplay;
let generateReportBtn, reportPeriodSelect, reportResultsDiv;
let adminScanQRBtn, clientQRDisplay, closeQrDisplayBtn;


// Variables para el cliente actualmente cargado en el panel de administración
let currentAdminClient = null;

// Asegura que el DOM esté completamente cargado antes de interactuar con él
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar referencias a elementos del DOM aquí
    loginBtn = document.getElementById('loginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userIdDisplay = document.getElementById('userIdDisplay');
    userEmailDisplay = document.getElementById('userEmailDisplay');
    userPointsDisplay = document.getElementById('userPointsDisplay');
    messageDisplay = document.getElementById('messageDisplay');
    adminSection = document.getElementById('admin-section');
    userSection = document.getElementById('user-section');

    stampsDisplay = document.getElementById('stamps-display');
    progressMessage = document.getElementById('progress-message');
    userFreeCoffeesDisplay = document.getElementById('userFreeCoffeesDisplay');

    showUserQrBtn = document.getElementById('showUserQrBtn');
    userQRDisplay = document.getElementById('user-qr-display');
    closeUserQrDisplay = document.getElementById('closeUserQrDisplay');


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
        if (userSection) userSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';
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
                if (adminSection) adminSection.style.display = 'block';
                loadAdminDashboard();
            } else {
                if (userSection) userSection.style.display = 'block';
                loadUserCard(user);
            }

        } else {
            // Usuario no logueado
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            showMessage('Por favor, inicia sesión.', 'info');
            clearUserCard();
            clearAdminDashboard();
        }
    });

    // --- Funciones de la Tarjeta de Lealtad del Usuario ---

    async function loadUserCard(user) {
        if (!user) return;

        if (userIdDisplay) userIdDisplay.textContent = `ID: ${user.uid}`;
        if (userEmailDisplay) userEmailDisplay.textContent = `Email: ${user.email}`;

        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentStamps = userData.stamps || 0;
                const freeCoffees = userData.freeCoffees || 0;

                if (userPointsDisplay) userPointsDisplay.textContent = `Sellos: ${currentStamps}`;
                if (userFreeCoffeesDisplay) userFreeCoffeesDisplay.textContent = freeCoffees;

                updateStampsDisplay(currentStamps);
                updateProgressMessage(currentStamps);
            } else {
                console.warn("Documento de usuario no encontrado al cargar la tarjeta.");
                updateStampsDisplay(0);
                updateProgressMessage(0);
                if (userFreeCoffeesDisplay) userFreeCoffeesDisplay.textContent = '0';
            }
        } catch (error) {
            console.error("Error al cargar tarjeta de usuario:", error);
            showMessage("Error al cargar tu tarjeta.", 'error');
        }
    }

    function updateStampsDisplay(stamps) {
        if (!stampsDisplay) return;
        stampsDisplay.innerHTML = '';
        const totalStamps = 10;

        for (let i = 1; i <= totalStamps; i++) {
            const stampDiv = document.createElement('div');
            stampDiv.classList.add('stamp');
            if (i <= stamps) {
                stampDiv.classList.add('obtained');
            }
            stampDiv.textContent = i;
            stampsDisplay.appendChild(stampDiv);
        }
    }

    function updateProgressMessage(stamps) {
        if (!progressMessage) return;
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
        if (userIdDisplay) userIdDisplay.textContent = 'ID: N/A';
        if (userEmailDisplay) userEmailDisplay.textContent = 'Email: N/A';
        if (userPointsDisplay) userPointsDisplay.textContent = 'Sellos: 0';
        if (userFreeCoffeesDisplay) userFreeCoffeesDisplay.textContent = '0';
        if (stampsDisplay) stampsDisplay.innerHTML = '';
        if (progressMessage) {
            progressMessage.textContent = '';
            progressMessage.style.backgroundColor = '';
            progressMessage.style.color = '';
        }
        if (userQRDisplay) {
            userQRDisplay.style.display = 'none';
            userQRDisplay.innerHTML = '';
        }
    }

    if (showUserQrBtn) {
        showUserQrBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user && userQRDisplay) {
                userQRDisplay.innerHTML = `<img src="https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${user.uid}" alt="QR de Mi Tarjeta">`;
                userQRDisplay.style.display = 'flex';
            } else {
                showMessage("No se pudo generar el QR. Por favor, inicia sesión.", 'error');
            }
        });
    }

    if (closeUserQrDisplay) {
        closeUserQrDisplay.addEventListener('click', () => {
            if (userQRDisplay) {
                userQRDisplay.style.display = 'none';
                userQRDisplay.innerHTML = '';
            }
        });
    }


    // --- Funciones del Panel de Administración ---

    async function loadAdminDashboard() {
        try {
            await loadAdminStats();
            await generateReport();
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

            if (totalClientsDisplay) totalClientsDisplay.textContent = totalClients;
            if (pendingFreeCoffeesDisplay) pendingFreeCoffeesDisplay.textContent = totalFreeCoffeesPending;
            if (averageStampsDisplay) averageStampsDisplay.textContent = totalClients > 0 ? (totalStamps / totalClients).toFixed(1) : 0;

        } catch (error) {
            console.error("Error al cargar estadísticas de administración:", error);
            showMessage("Error al cargar estadísticas.", 'error');
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
    }


    function displayClientInfo(client) {
        if (!clientInfoDiv) return;
        clientInfoDiv.innerHTML = '';
        if (client) {
            clientInfoDiv.innerHTML = `
                <p><strong>ID:</strong> ${client.id}</p>
                <p><strong>Email:</strong> ${client.email}</p>
                <p><strong>Nombre:</strong> ${client.displayName || 'N/A'}</p>
                <p><strong>Sellos Actuales:</strong> <span id="admin-client-stamps">${client.stamps || 0}</span></p>
                <p><strong>Cafés Gratis Pendientes:</strong> <span id="admin-client-freecoffees">${client.freeCoffees || 0}</span></p>
                <div id="admin-client-stamps-display" class="stamps-grid"></div>
                <p><button id="show-client-qr-btn" class="action-button">Mostrar QR del Cliente</button></p>
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
        if (!displayElement) return;
        displayElement.innerHTML = '';
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
            clientQRDisplay.innerHTML = `<img src="https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${uid}" alt="QR del Cliente">`;
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
                displayClientInfo(currentAdminClient);
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
                displayClientInfo(currentAdminClient);
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
                displayClientInfo(currentAdminClient);
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
        if (clientInfoDiv) clientInfoDiv.innerHTML = '<p>No hay cliente cargado.</p>';
        if (adminEmailInput) adminEmailInput.value = '';
        if (reportResultsDiv) reportResultsDiv.innerHTML = '';
        if (clientQRDisplay) {
            clientQRDisplay.style.display = 'none';
            clientQRDisplay.innerHTML = '';
        }
    }

    // --- Función para mostrar mensajes al usuario ---
    function showMessage(msg, type = 'info') {
        if (!messageDisplay) {
            console.warn("Elemento 'messageDisplay' no encontrado. No se pueden mostrar mensajes.");
            return;
        }
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
