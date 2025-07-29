// script.js

// 1. Configuración de Firebase
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Reemplaza con tu API Key
    authDomain: "YOUR_AUTH_DOMAIN", // Reemplaza con tu Auth Domain
    projectId: "YOUR_PROJECT_ID", // Reemplaza con tu Project ID
    storageBucket: "YOUR_STORAGE_BUCKET", // Reemplaza con tu Storage Bucket
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Reemplaza con tu Messaging Sender ID
    appId: "YOUR_APP_ID" // Reemplaza con tu App ID
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Constantes
const MAX_STAMPS = 10;
const ADMIN_UIDS = ['YOUR_ADMIN_UID_1', 'YOUR_ADMIN_UID_2']; // Reemplaza con los UIDs de tus administradores
// Ejemplo: const ADMIN_UIDS = ['abcdef1234567890abcdef1234567890', 'fedcba0987654321fedcba0987654321'];

// 2. Referencias a elementos del DOM
const userNameElement = document.getElementById('user-name');
const authBtn = document.getElementById('auth-btn');

// Secciones
const loyaltyCardSection = document.getElementById('loyalty-card');
const qrSection = document.getElementById('qr-section');
const historySection = document.getElementById('history-section');
const adminSection = document.getElementById('admin-section');
const adminDashboard = document.getElementById('admin-dashboard');
const reportSection = document.getElementById('report-section');

// Elementos de la tarjeta de lealtad
const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const qrcodeCanvas = document.getElementById('qrcode-canvas');
const stampsHistoryList = document.getElementById('stamps-history-list');

// Elementos del panel de administración
const clientUidInput = document.getElementById('client-uid-input');
const searchClientBtn = document.getElementById('search-client-btn');
const scanQrBtn = document.getElementById('scan-qr-btn');
const loadedClientName = document.getElementById('loaded-client-name');
const loadedClientUid = document.getElementById('loaded-client-uid');
const adminCurrentStamps = document.getElementById('admin-current-stamps');
const addStampBtn = document.getElementById('add-stamp-btn');
const removeStampBtn = document.getElementById('remove-stamp-btn');
const redeemCoffeeBtn = document.getElementById('redeem-coffee-btn');
const resetStampsBtn = document.getElementById('reset-stamps-btn');
const adminMessage = document.getElementById('admin-message');

// Elementos del dashboard de administración
const totalCustomersStat = document.getElementById('total-customers-stat');
const pendingRewardsStat = document.getElementById('pending-rewards-stat');
const averageStampsStat = document.getElementById('average-stamps-stat');

// Elementos de reportes
const reportPeriodSelect = document.getElementById('report-period-select');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportPeriodDisplay = document.getElementById('report-period-display');
const stampsAddedStat = document.getElementById('stamps-added-stat');
const rewardsRedeemedStat = document.getElementById('rewards-redeemed-stat');
const cardsResetStat = document.getElementById('cards-reset-stat');
const stampsRemovedStat = document.getElementById('stamps-removed-stat');

// Elementos del escáner QR
const qrScannerOverlay = document.getElementById('qr-scanner-overlay');
const qrScannerContainer = document.getElementById('qr-scanner-container');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const scannerMessage = document.getElementById('scanner-message');
let html5QrCode = null; // Instancia del lector QR

// 3. Variables de estado
let currentUser = null;
let currentClientData = null; // Para almacenar datos del cliente cargado en admin
let currentClientDocRef = null; // Referencia al documento del cliente en admin

// 4. Funciones de la UI

// Muestra/oculta secciones basado en el rol del usuario
function updateUI(user) {
    currentUser = user;
    if (user) {
        userNameElement.textContent = user.displayName || user.email;
        authBtn.textContent = 'Cerrar Sesión';
        if (ADMIN_UIDS.includes(user.uid)) {
            // Es un administrador
            loyaltyCardSection.classList.add('hidden');
            qrSection.classList.add('hidden');
            historySection.classList.add('hidden');
            adminSection.classList.remove('hidden');
            adminDashboard.classList.remove('hidden');
            reportSection.classList.remove('hidden');
            loadAdminDashboard();
            generateReport(); // Generar reporte inicial
            // Asegúrate de que el cliente cargado se reinicie al iniciar sesión como admin
            resetAdminClientInfo();
        } else {
            // Es un cliente normal
            adminSection.classList.add('hidden');
            adminDashboard.classList.add('hidden');
            reportSection.classList.add('hidden');
            loyaltyCardSection.classList.remove('hidden');
            qrSection.classList.remove('hidden');
            historySection.classList.remove('hidden');
            loadLoyaltyCard(user.uid);
            loadStampsHistory(user.uid);
            generateQRCode(user.uid);
        }
    } else {
        // No hay usuario logueado
        userNameElement.textContent = 'Invitado';
        authBtn.textContent = 'Iniciar Sesión';
        loyaltyCardSection.classList.add('hidden');
        qrSection.classList.add('hidden');
        historySection.classList.add('hidden');
        adminSection.classList.add('hidden');
        adminDashboard.classList.add('hidden');
        reportSection.classList.add('hidden');
        // Mostrar un mensaje o una pantalla de inicio de sesión si no hay nadie logueado
    }
}

// Renderiza los sellos en la tarjeta de lealtad del cliente
function renderStamps(stampsCount, previousStamps = 0) {
    stampsDisplay.innerHTML = ''; // Limpiar sellos existentes
    for (let i = 0; i < MAX_STAMPS; i++) {
        const stamp = document.createElement('div');
        stamp.classList.add('stamp');
        if (i < stampsCount) {
            stamp.classList.add('obtained');
            stamp.innerHTML = ''; // ¡IMPORTANTE! NO insertar texto aquí. El icono viene de CSS ::before
            stamp.style.color = 'transparent'; // Oculta cualquier texto residual si lo hubiera

            // Si este sello acaba de ser obtenido (i.e., era el primero nuevo), animarlo
            if (i === stampsCount - 1 && stampsCount > previousStamps) {
                 stamp.classList.add('animate-stamp'); // Usa la nueva clase CSS para la animación
                 // Eliminar la clase de animación después de que termine para que se pueda repetir
                 stamp.addEventListener('animationend', () => {
                     stamp.classList.remove('animate-stamp');
                 }, { once: true });
            }
        } else {
            stamp.textContent = (i + 1); // Muestra el número para los sellos no obtenidos
        }
        stampsDisplay.appendChild(stamp);
    }

    if (stampsCount === MAX_STAMPS) {
        messageDisplay.textContent = '¡Felicidades! Tienes un café gratis. ¡Canjéalo en barra!';
        messageDisplay.style.backgroundColor = '#d4edda'; // Verde claro
        messageDisplay.style.color = '#155724'; // Verde oscuro
        triggerConfetti();
    } else if (stampsCount > 0) {
        const remaining = MAX_STAMPS - stampsCount;
        messageDisplay.textContent = `¡Casi lo tienes! Te faltan ${remaining} sellos para tu café gratis.`;
        messageDisplay.style.backgroundColor = '#e2f0d9'; // Otro verde claro
        messageDisplay.style.color = '#388e3c'; // Verde más oscuro
    } else {
        messageDisplay.textContent = '¡Bienvenido! Acumula sellos por cada café.';
        messageDisplay.style.backgroundColor = '#e8f5e9'; // Suave verde
        messageDisplay.style.color = '#333'; // Gris oscuro
    }
}

// Genera el QR code
function generateQRCode(uid) {
    // Verificar si qrcodeCanvas existe y si tiene un contexto 2D
    if (!qrcodeCanvas || !qrcodeCanvas.getContext) {
        console.error("qrcodeCanvas no encontrado o no es un elemento canvas válido.");
        return;
    }

    const canvas = qrcodeCanvas;
    const context = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    context.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas

    // Intentar usar la librería qrcode.js si está disponible (requiere importación)
    // Para que esto funcione, necesitarías <script src="https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js"></script>
    // o una similar. Si la tienes, descomenta el siguiente bloque:
    /*
    if (typeof QRCode !== 'undefined') {
        // Limpiar el canvas si hay un QR anterior
        if (canvas._qrcode) { // qrcode.js a veces almacena la instancia
            canvas._qrcode.clear();
        }
        canvas.innerHTML = ''; // Asegurarse de que no haya contenido previo
        // Crear una nueva instancia de QRCode.js en el canvas
        canvas._qrcode = new QRCode(canvas, { // Almacenar la instancia para poder limpiarla
            text: uid,
            width: 200,
            height: 200,
            colorDark : "#7a4a2b",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    } else {
        // Fallback si la librería qrcode.js no está cargada
        console.warn("Librería qrcode.js no encontrada. Mostrando texto placeholder.");
        context.fillStyle = '#7a4a2b';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('Código QR aquí', canvas.width / 2, canvas.height / 2);
        context.fillText('(Librería no cargada)', canvas.width / 2, canvas.height / 2 + 20);
    }
    */
    // Si no estás usando la librería 'qrcode.js' y solo quieres un placeholder:
    context.fillStyle = '#7a4a2b';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText('Código QR aquí', canvas.width / 2, canvas.height / 2);
    context.fillText('(Muestra este al barista)', canvas.width / 2, canvas.height / 2 + 20);
    context.fillText(`UID: ${uid.substring(0, 8)}...`, canvas.width / 2, canvas.height / 2 + 40); // Mostrar parte del UID
}


// 5. Funciones de Datos (Firestore)

// Cargar tarjeta de lealtad para un usuario
async function loadLoyaltyCard(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        const stamps = userData.stamps || 0;
        // previousStamps se usa para la animación, pasamos 0 en la carga inicial
        renderStamps(stamps, 0);
    } else {
        // Si el usuario no tiene documento, crearlo y renderizar 0 sellos
        await db.collection('users').doc(uid).set({ stamps: 0, rewardsRedeemed: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        renderStamps(0, 0);
    }
}

// Cargar historial de sellos para un usuario
async function loadStampsHistory(uid) {
    stampsHistoryList.innerHTML = '';
    const historySnapshot = await db.collection('users').doc(uid).collection('history')
                                    .orderBy('timestamp', 'desc')
                                    .limit(10) // Limitar a las últimas 10 transacciones
                                    .get();

    if (historySnapshot.empty) {
        const li = document.createElement('li');
        li.textContent = 'No hay historial de sellos todavía.';
        stampsHistoryList.appendChild(li);
        return;
    }

    historySnapshot.forEach(doc => {
        const entry = doc.data();
        const li = document.createElement('li');
        const date = entry.timestamp ? entry.timestamp.toDate().toLocaleString() : 'Fecha desconocida';
        li.innerHTML = `<span class="description">${entry.type}: ${entry.description}</span><span class="timestamp">${date}</span>`;
        stampsHistoryList.appendChild(li);
    });
}

// Añadir sello para un cliente específico (desde admin)
async function addStamp(uid, previousStamps) {
    if (!uid) {
        adminMessage.textContent = 'Error: UID de cliente no cargado.';
        adminMessage.style.color = 'red';
        return;
    }
    setAdminLoading(true);
    adminMessage.textContent = '';

    const userRef = db.collection('users').doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                adminMessage.textContent = 'Error: Cliente no encontrado.';
                adminMessage.style.color = 'red';
                return Promise.reject(new Error('Cliente no encontrado')); // Rechazar la transacción si el cliente no existe
            }

            let currentStamps = userDoc.data().stamps || 0;
            let rewardsRedeemed = userDoc.data().rewardsRedeemed || 0;
            const newStamps = Math.min(currentStamps + 1, MAX_STAMPS); // No exceder el máximo

            transaction.update(userRef, {
                stamps: newStamps,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registrar en el historial del usuario
            const historyEntry = {
                type: 'Sello Añadido',
                description: `Sello ${newStamps}/${MAX_STAMPS}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                adminUid: currentUser.uid // UID del administrador que hizo la acción
            };
            transaction.set(userRef.collection('history').doc(), historyEntry);

            // Actualizar datos del cliente cargado localmente (para la UI del admin)
            currentClientData = { ...userDoc.data(), stamps: newStamps, rewardsRedeemed: rewardsRedeemed };
            updateAdminClientInfo(currentClientData);

            adminMessage.textContent = `Sello añadido. ${newStamps}/${MAX_STAMPS} sellos.`;
            adminMessage.style.color = 'green';
            
            // Trigger confetti if max stamps reached after adding
            if (newStamps === MAX_STAMPS && currentStamps < MAX_STAMPS) {
                triggerConfetti();
            }
        });
    } catch (error) {
        console.error("Error añadiendo sello:", error);
        adminMessage.textContent = `Error al añadir sello: ${error.message}`;
        adminMessage.style.color = 'red';
    } finally {
        setAdminLoading(false);
    }
}

// Quitar sello para un cliente específico (desde admin)
async function removeStamp(uid) {
    if (!uid) {
        adminMessage.textContent = 'Error: UID de cliente no cargado.';
        adminMessage.style.color = 'red';
        return;
    }
    setAdminLoading(true);
    adminMessage.textContent = '';

    const userRef = db.collection('users').doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                adminMessage.textContent = 'Error: Cliente no encontrado.';
                adminMessage.style.color = 'red';
                return Promise.reject(new Error('Cliente no encontrado'));
            }

            let currentStamps = userDoc.data().stamps || 0;
            const newStamps = Math.max(0, currentStamps - 1); // No ir por debajo de 0

            transaction.update(userRef, {
                stamps: newStamps,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registrar en el historial del usuario
            const historyEntry = {
                type: 'Sello Quitado',
                description: `Sello ${newStamps}/${MAX_STAMPS}`,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                adminUid: currentUser.uid
            };
            transaction.set(userRef.collection('history').doc(), historyEntry);

            // Actualizar datos del cliente cargado localmente
            currentClientData = { ...userDoc.data(), stamps: newStamps };
            updateAdminClientInfo(currentClientData);

            adminMessage.textContent = `Sello quitado. ${newStamps}/${MAX_STAMPS} sellos.`;
            adminMessage.style.color = 'green';
        });
    } catch (error) {
        console.error("Error quitando sello:", error);
        adminMessage.textContent = `Error al quitar sello: ${error.message}`;
        adminMessage.style.color = 'red';
    } finally {
        setAdminLoading(false);
    }
}

// Canjear café gratis para un cliente (desde admin)
async function redeemCoffee(uid) {
    if (!uid) {
        adminMessage.textContent = 'Error: UID de cliente no cargado.';
        adminMessage.style.color = 'red';
        return;
    }
    setAdminLoading(true);
    adminMessage.textContent = '';

    const userRef = db.collection('users').doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                adminMessage.textContent = 'Error: Cliente no encontrado.';
                adminMessage.style.color = 'red';
                return Promise.reject(new Error('Cliente no encontrado'));
            }

            let currentStamps = userDoc.data().stamps || 0;
            let rewardsRedeemed = userDoc.data().rewardsRedeemed || 0;

            if (currentStamps < MAX_STAMPS) {
                adminMessage.textContent = 'Error: El cliente no tiene suficientes sellos para canjear un café gratis.';
                adminMessage.style.color = 'red';
                return Promise.reject(new Error('No suficientes sellos'));
            }

            transaction.update(userRef, {
                stamps: 0, // Reiniciar sellos
                rewardsRedeemed: rewardsRedeemed + 1,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registrar en el historial del usuario
            const historyEntry = {
                type: 'Café Canjeado',
                description: 'Canjeó un café gratis. Sellos reiniciados.',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                adminUid: currentUser.uid
            };
            transaction.set(userRef.collection('history').doc(), historyEntry);

            // Actualizar datos del cliente cargado localmente
            currentClientData = { ...userDoc.data(), stamps: 0, rewardsRedeemed: rewardsRedeemed + 1 };
            updateAdminClientInfo(currentClientData);

            adminMessage.textContent = `Café gratis canjeado. Sellos reiniciados. El cliente ha canjeado ${rewardsRedeemed + 1} cafés.`;
            adminMessage.style.color = 'green';
        });
    } catch (error) {
        console.error("Error canjeando café:", error);
        adminMessage.textContent = `Error al canjear café: ${error.message}`;
        adminMessage.style.color = 'red';
    } finally {
        setAdminLoading(false);
    }
}

// Reiniciar tarjeta para un cliente (desde admin)
async function resetStamps(uid) {
    if (!uid) {
        adminMessage.textContent = 'Error: UID de cliente no cargado.';
        adminMessage.style.color = 'red';
        return;
    }
    setAdminLoading(true);
    adminMessage.textContent = '';

    const userRef = db.collection('users').doc(uid);
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                adminMessage.textContent = 'Error: Cliente no encontrado.';
                adminMessage.style.color = 'red';
                return Promise.reject(new Error('Cliente no encontrado'));
            }

            transaction.update(userRef, {
                stamps: 0,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Registrar en el historial del usuario
            const historyEntry = {
                type: 'Tarjeta Reiniciada',
                description: 'Todos los sellos de la tarjeta han sido reiniciados.',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                adminUid: currentUser.uid
            };
            transaction.set(userRef.collection('history').doc(), historyEntry);

            // Actualizar datos del cliente cargado localmente
            currentClientData = { ...userDoc.data(), stamps: 0 };
            updateAdminClientInfo(currentClientData);

            adminMessage.textContent = `Tarjeta de sellos reiniciada a 0.`;
            adminMessage.style.color = 'green';
        });
    } catch (error) {
        console.error("Error reiniciando tarjeta:", error);
        adminMessage.textContent = `Error al reiniciar tarjeta: ${error.message}`;
        adminMessage.style.color = 'red';
    } finally {
        setAdminLoading(false);
    }
}

// Cargar datos para el dashboard de administración
async function loadAdminDashboard() {
    try {
        const usersSnapshot = await db.collection('users').get();
        let totalCustomers = usersSnapshot.size;
        let pendingRewards = 0;
        let totalStamps = 0;

        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            totalStamps += (userData.stamps || 0);
            if (userData.stamps && userData.stamps >= MAX_STAMPS) {
                pendingRewards++;
            }
        });

        const averageStamps = totalCustomers > 0 ? (totalStamps / totalCustomers).toFixed(1) : 0;

        totalCustomersStat.textContent = totalCustomers;
        pendingRewardsStat.textContent = pendingRewards;
        averageStampsStat.textContent = averageStamps;

    } catch (error) {
        console.error("Error cargando dashboard:", error);
    }
}

// Generar Reporte
async function generateReport() {
    const period = reportPeriodSelect.value;
    let startDate = null;

    if (period !== 'all') {
        const days = parseInt(period);
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
    }

    reportPeriodDisplay.textContent = period === 'all' ? 'todo el tiempo' : `últimos ${period} días`;

    let stampsAdded = 0;
    let rewardsRedeemed = 0;
    let cardsReset = 0;
    let stampsRemoved = 0;

    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
        let historyQuery = userDoc.ref.collection('history');

        if (startDate) {
            historyQuery = historyQuery.where('timestamp', '>=', startDate);
        }

        const historySnapshot = await historyQuery.get();

        historySnapshot.forEach(historyDoc => {
            const entry = historyDoc.data();
            if (entry.type === 'Sello Añadido') {
                stampsAdded++;
            } else if (entry.type === 'Café Canjeado') {
                rewardsRedeemed++;
            } else if (entry.type === 'Tarjeta Reiniciada') {
                cardsReset++;
            } else if (entry.type === 'Sello Quitado') {
                stampsRemoved++;
            }
        });
    }

    stampsAddedStat.textContent = stampsAdded;
    rewardsRedeemedStat.textContent = rewardsRedeemed;
    cardsResetStat.textContent = cardsReset;
    stampsRemovedStat.textContent = stampsRemoved;
}


// 6. Funciones de Autenticación
function handleAuth() {
    if (currentUser) {
        // Cerrar sesión
        auth.signOut().then(() => {
            console.log('Usuario cerró sesión');
        }).catch((error) => {
            console.error('Error al cerrar sesión:', error);
        });
    } else {
        // Iniciar sesión con Google (puedes usar un popup o redirect)
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                console.log('Usuario inició sesión:', user.displayName);
                // Si es un nuevo usuario, crear documento en Firestore
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (!doc.exists) {
                        db.collection('users').doc(user.uid).set({
                            email: user.email,
                            displayName: user.displayName,
                            stamps: 0,
                            rewardsRedeemed: 0,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
            })
            .catch((error) => {
                console.error('Error al iniciar sesión:', error);
                alert(`Error al iniciar sesión: ${error.message}`);
            });
    }
}

// Escuchador de cambios de estado de autenticación
auth.onAuthStateChanged(user => {
    updateUI(user);
});

// 7. Funciones del Panel de Administración

// Actualiza la información del cliente cargado
function updateAdminClientInfo(clientData) {
    if (clientData) {
        loadedClientName.textContent = clientData.displayName || clientData.email || 'N/A';
        loadedClientUid.textContent = clientData.uid || 'N/A';
        adminCurrentStamps.textContent = `${clientData.stamps || 0}/${MAX_STAMPS}`;
        adminMessage.textContent = ''; // Limpiar mensajes anteriores
        currentClientData = clientData; // Almacena los datos del cliente cargado
    } else {
        resetAdminClientInfo();
    }
}

// Resetea la info del cliente en el panel de admin
function resetAdminClientInfo() {
    loadedClientName.textContent = 'No hay cliente cargado.';
    loadedClientUid.textContent = 'N/A';
    adminCurrentStamps.textContent = 'N/A';
    adminMessage.textContent = '';
    clientUidInput.value = '';
    currentClientData = null;
    currentClientDocRef = null;
    // Deshabilitar botones de acción hasta que se cargue un cliente
    setAdminActionsEnabled(false);
}

// Habilita/deshabilita botones de acción del admin
function setAdminActionsEnabled(enabled) {
    addStampBtn.disabled = !enabled;
    removeStampBtn.disabled = !enabled;
    redeemCoffeeBtn.disabled = !enabled;
    resetStampsBtn.disabled = !enabled;
}

// Habilita/deshabilita el estado de carga del admin
function setAdminLoading(isLoading) {
    const spinnerHtml = isLoading ? '<span class="spinner"></span>' : '';
    searchClientBtn.innerHTML = isLoading ? `Buscando... ${spinnerHtml}` : 'Buscar Cliente';
    searchClientBtn.disabled = isLoading;
    scanQrBtn.disabled = isLoading;
    clientUidInput.disabled = isLoading;
    setAdminActionsEnabled(!isLoading && currentClientData); // Mantener habilitados si hay cliente
    adminSection.classList.toggle('loading', isLoading); // Añadir clase de carga a la sección
}

// Búsqueda de cliente por UID o Email
searchClientBtn.addEventListener('click', async () => {
    const input = clientUidInput.value.trim();
    if (!input) {
        adminMessage.textContent = 'Por favor, ingrese un Email o UID de cliente.';
        adminMessage.style.color = 'orange';
        resetAdminClientInfo();
        return;
    }

    setAdminLoading(true);
    adminMessage.textContent = ''; // Limpiar mensajes anteriores

    try {
        let userFound = null;
        let querySnapshot;

        // Intentar buscar por UID directamente
        const userDoc = await db.collection('users').doc(input).get();
        if (userDoc.exists) {
            userFound = { ...userDoc.data(), uid: userDoc.id };
            currentClientDocRef = userDoc.ref;
        } else {
            // Si no se encuentra por UID, intentar buscar por email
            querySnapshot = await db.collection('users').where('email', '==', input).limit(1).get();
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                userFound = { ...doc.data(), uid: doc.id };
                currentClientDocRef = doc.ref;
            }
        }

        if (userFound) {
            updateAdminClientInfo(userFound);
            setAdminActionsEnabled(true);
            adminMessage.textContent = 'Cliente cargado con éxito.';
            adminMessage.style.color = 'green';
        } else {
            adminMessage.textContent = 'Cliente no encontrado. Verifique el Email/UID.';
            adminMessage.style.color = 'red';
            resetAdminClientInfo();
        }
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        adminMessage.textContent = `Error al buscar cliente: ${error.message}`;
        adminMessage.style.color = 'red';
        resetAdminClientInfo();
    } finally {
        setAdminLoading(false);
    }
});

// Event listeners para los botones de acción del admin
addStampBtn.addEventListener('click', () => {
    if (currentClientData && currentClientData.uid) {
        const stampsBefore = currentClientData.stamps || 0;
        addStamp(currentClientData.uid, stampsBefore);

        // NUEVO: Animación visual en el panel de admin si el sello se añadió correctamente
        if (adminCurrentStamps && stampsBefore < MAX_STAMPS) { // Solo animar si no estaba al máximo
            const stampsSpan = document.createElement('span');
            stampsSpan.textContent = ' ☕'; // Un pequeño ícono de café
            stampsSpan.style.display = 'inline-block'; // Para que la animación funcione mejor
            stampsSpan.style.fontSize = '1.2em'; // Controla el tamaño del emoji en la animación del admin
            stampsSpan.style.color = '#5bc0de'; // Color para que se vea en el mensaje
            stampsSpan.classList.add('animate'); // Aplica la clase de animación (usa la keyframe 'bounceIn' global)

            // Añadir temporalmente el ícono animado junto al número de sellos
            adminCurrentStamps.appendChild(stampsSpan);

            stampsSpan.addEventListener('animationend', () => {
                stampsSpan.remove(); // Eliminar el ícono animado después de la animación
            }, { once: true });
        }

    } else {
        adminMessage.textContent = 'Por favor, cargue un cliente primero.';
        adminMessage.style.color = 'orange';
    }
});

removeStampBtn.addEventListener('click', () => {
    if (currentClientData && currentClientData.uid) {
        removeStamp(currentClientData.uid);
    } else {
        adminMessage.textContent = 'Por favor, cargue un cliente primero.';
        adminMessage.style.color = 'orange';
    }
});

redeemCoffeeBtn.addEventListener('click', () => {
    if (currentClientData && currentClientData.uid) {
        redeemCoffee(currentClientData.uid);
    } else {
        adminMessage.textContent = 'Por favor, cargue un cliente primero.';
        adminMessage.style.color = 'orange';
    }
});

resetStampsBtn.addEventListener('click', () => {
    if (currentClientData && currentClientData.uid) {
        resetStamps(currentClientData.uid);
    } else {
        adminMessage.textContent = 'Por favor, cargue un cliente primero.';
        adminMessage.style.color = 'orange';
    }
});

// Event listeners para reportes
reportPeriodSelect.addEventListener('change', generateReport);
generateReportBtn.addEventListener('click', generateReport);


// 8. Escáner QR (para administración)
scanQrBtn.addEventListener('click', () => {
    qrScannerOverlay.classList.remove('hidden');
    scannerMessage.textContent = 'Cargando cámara...';
    startQrScanner();
});

closeScannerBtn.addEventListener('click', () => {
    qrScannerOverlay.classList.add('hidden');
    stopQrScanner();
});

function startQrScanner() {
    html5QrCode = new Html5Qrcode("reader");
    Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
            // Preferir la cámara trasera si está disponible
            const rearCamera = devices.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('trasera'));
            const cameraId = rearCamera ? rearCamera.id : devices[0].id; // Usar trasera o la primera disponible

            html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText, decodedResult) => {
                    // Acción al escanear exitosamente
                    scannerMessage.textContent = `UID escaneado: ${decodedText}`;
                    clientUidInput.value = decodedText; // Poner el UID en el campo de entrada
                    qrScannerOverlay.classList.add('hidden'); // Ocultar escáner
                    stopQrScanner(); // Detener la cámara
                    // Opcional: buscar el cliente automáticamente después de escanear
                    searchClientBtn.click();
                },
                (errorMessage) => {
                    // Errores de escaneo (no es un QR válido o problemas de lectura)
                    scannerMessage.textContent = `Escaneando...`; // O mostrar un mensaje de error específico
                }
            ).catch((err) => {
                scannerMessage.textContent = `Error al iniciar cámara: ${err}. Asegúrate de permitir el acceso a la cámara.`;
                console.error("Error al iniciar QR scanner: ", err);
            });
        } else {
            scannerMessage.textContent = "No se encontraron cámaras QR en este dispositivo.";
            console.error("No se encontraron cámaras QR.");
        }
    }).catch(err => {
        scannerMessage.textContent = `Error al obtener cámaras: ${err}`;
        console.error("Error al obtener cámaras: ", err);
    });
}

function stopQrScanner() {
    // CORRECCIÓN: Usar html5QrCode.isScanning para verificar si el escáner está activo
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            console.log("QR scanner detenido.");
            scannerMessage.textContent = "Escáner detenido.";
        }).catch((err) => {
            console.error("Error al detener QR scanner:", err);
        });
    }
}

// 9. Funcionalidad de Confeti
function triggerConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    if (!confettiContainer) return;

    confettiContainer.classList.add('active'); // Activa la visibilidad del contenedor
    confettiContainer.innerHTML = ''; // Limpia confeti anterior

    const colors = ['#f06292', '#ffeb3b', '#8bc34a', '#2196f3', '#9c27b0', '#ff9800'];

    for (let i = 0; i < 50; i++) { // Generar 50 trozos de confeti
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.top = `${Math.random() * -20}%`; // Empieza un poco fuera de la pantalla
        // Usar variables CSS para animaciones dinámicas
        confetti.style.setProperty('--rand-x', `${(Math.random() - 0.5) * 500}px`); // Caída horizontal aleatoria
        confetti.style.setProperty('--rand-y', `${500 + Math.random() * 200}px`); // Caída vertical más allá de la pantalla
        confetti.style.animation = `confetti-fall-${Math.floor(Math.random() * 5) + 1} ${2 + Math.random() * 3}s ease-out forwards`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`; // Pequeño retraso aleatorio

        confettiContainer.appendChild(confetti);
    }

    // Desactivar el confeti después de un tiempo
    setTimeout(() => {
        confettiContainer.classList.remove('active');
        // No limpiar inmediatamente para permitir que el último confeti termine de caer
        setTimeout(() => {
            confettiContainer.innerHTML = '';
        }, 1000); // Limpiar después de que las animaciones hayan terminado
    }, 3000); // El contenedor se desactiva después de 3 segundos
}

// 10. Event Listeners Globales
authBtn.addEventListener('click', handleAuth);

// Asegurarse de deshabilitar los botones de acción del admin al cargar la página si no hay cliente
setAdminActionsEnabled(false);
