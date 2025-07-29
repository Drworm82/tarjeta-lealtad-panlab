// script.js

// --- Importaciones de Firebase SDK (Versión 9 Modular) ---
// Importa solo las funciones que necesitas para reducir el tamaño del bundle
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, runTransaction, onSnapshot, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, collectionGroup } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Configuración de Firebase (TUS CREDENCIALES) ---
// ASEGÚRATE DE QUE ESTAS CREDENCIALES SON LAS CORRECTAS DE TU PROYECTO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCe8vr10Y8eSv38H6oRJdHJVjHnMZOnspo", // ¡ACTUALIZA CON TU API KEY REAL!
    authDomain: "mi-cafeteria-lealtad.firebaseapp.com",
    projectId: "mi-cafeteria-lealtad",
    storageBucket: "mi-cafeteria-lealtad.appspot.com", // Nota: .firebasestorage.app es un subdominio, .appspot.com es el bucket real
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
// IMPORTANTE: Reemplaza con los UIDs reales de tus administradores.
// Puedes encontrar los UIDs en la sección "Authentication" de tu Firebase Console.
const ADMIN_UIDS = ['TU_UID_ADMIN_1', 'TU_UID_ADMIN_2']; // Ejemplo: ['abcdef1234567890abcdef1234567890']

// Listeners de Firestore
let clientListener = null; // Para el usuario normal
let adminClientListener = null; // Para el cliente cargado en el panel de admin

// Almacena el UID del cliente actualmente seleccionado en el panel de administración
let targetClientUid = null; // Cambiado de targetClientEmail a targetClientUid para mayor claridad

// --- Elementos del DOM ---
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
const qrInstruction = document.getElementById('qr-instruction');
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

// 3. Variables de estado adicionales
let currentClientData = null; // Para almacenar datos del cliente cargado en admin (objeto)

// 4. Funciones de la UI

// Función para mostrar Toastify
function showToast(message, type = 'info', duration = 3000) {
    let backgroundColor;
    switch (type) {
        case 'success': backgroundColor = 'linear-gradient(to right, #5cb85c, #4CAF50)'; break;
        case 'error': backgroundColor = 'linear-gradient(to right, #d9534f, #f44336)'; break;
        case 'warning': backgroundColor = 'linear-gradient(to right, #f0ad4e, #FF9800)'; break;
        case 'info': default: backgroundColor = 'linear-gradient(to right, #5bc0de, #2196F3)'; break;
    }

    Toastify({
        text: message,
        duration: duration,
        newWindow: true,
        close: true,
        gravity: "bottom",
        position: "right",
        stopOnFocus: true,
        style: { background: backgroundColor, borderRadius: "5px", boxShadow: "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)" },
        onClick: function(){}
    }).showToast();
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
    if (!qrcodeCanvas || !qrcodeCanvas.getContext) {
        console.error("qrcodeCanvas no encontrado o no es un elemento canvas válido.");
        return;
    }

    const canvas = qrcodeCanvas;
    const context = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 200;
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Placeholder simple si no se usa una librería QR externa
    context.fillStyle = '#7a4a2b';
    context.font = '16px Arial';
    context.textAlign = 'center';
    context.fillText('Código QR aquí', canvas.width / 2, canvas.height / 2);
    context.fillText('(Muestra este al barista)', canvas.width / 2, canvas.height / 2 + 20);
    context.fillText(`UID: ${uid.substring(0, 8)}...`, canvas.width / 2, canvas.height / 2 + 40);
}

// Deshabilita todos los controles del panel de administración
function setAdminLoading(isLoading) {
    const spinnerHtml = isLoading ? '<span class="spinner"></span>' : '';
    searchClientBtn.innerHTML = isLoading ? `Buscando... ${spinnerHtml}` : 'Buscar Cliente';
    searchClientBtn.disabled = isLoading;
    scanQrBtn.disabled = isLoading;
    clientUidInput.disabled = isLoading;
    setAdminActionsEnabled(!isLoading && currentClientData); // Mantener habilitados si hay cliente
    adminSection.classList.toggle('loading', isLoading); // Añadir clase de carga a la sección
    adminMessage.textContent = isLoading ? 'Procesando...' : ''; // Mensaje genérico de procesamiento
    adminMessage.style.color = '#5bc0de';
}

// Habilita/deshabilita botones de acción del admin
function setAdminActionsEnabled(enabled) {
    addStampBtn.disabled = !enabled;
    removeStampBtn.disabled = !enabled;
    redeemCoffeeBtn.disabled = !enabled;
    resetStampsBtn.disabled = !enabled;
}

// Resetea la info del cliente en el panel de admin
function resetAdminClientInfo() {
    loadedClientName.textContent = 'No hay cliente cargado.';
    loadedClientUid.textContent = 'N/A';
    adminCurrentStamps.textContent = 'N/A';
    adminMessage.textContent = '';
    clientUidInput.value = '';
    currentClientData = null;
    targetClientUid = null; // Reiniciar también el targetClientUid
    setAdminActionsEnabled(false); // Deshabilitar botones de acción
}

// Actualiza la información del cliente cargado en el panel de admin
function updateAdminClientInfo(clientData) {
    if (clientData) {
        loadedClientName.textContent = clientData.displayName || clientData.email || 'N/A';
        loadedClientUid.textContent = clientData.uid || 'N/A';
        adminCurrentStamps.textContent = `${clientData.stamps || 0}/${MAX_STAMPS}`;
        adminMessage.textContent = ''; // Limpiar mensajes anteriores
        currentClientData = clientData; // Almacena los datos del cliente cargado
        targetClientUid = clientData.uid; // Actualizar targetClientUid
        setAdminActionsEnabled(true); // Habilitar botones de acción
    } else {
        resetAdminClientInfo();
    }
}


// 5. Funciones de Datos (Firestore)

// Cargar tarjeta de lealtad para un usuario (con listener en tiempo real)
async function loadLoyaltyCard(uid) {
    // Desuscribir listener anterior si existe
    if (clientListener) {
        clientListener(); // onSnapshot devuelve una función de desuscripción
    }

    const userDocRef = doc(db, 'users', uid);
    clientListener = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            const previousStamps = currentClientData ? currentClientData.stamps : 0; // Para la animación
            currentClientData = { ...userData, uid: docSnap.id }; // Actualizar datos locales
            renderStamps(userData.stamps || 0, previousStamps);
        } else {
            // Si el documento no existe, crearlo con 0 sellos
            setDoc(userDocRef, {
                stamps: 0,
                rewardsRedeemed: 0,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                email: currentUser.email, // Guardar email del usuario logueado
                displayName: currentUser.displayName || '' // Guardar nombre del usuario logueado
            }).then(() => {
                console.log("Documento de usuario creado con éxito.");
                renderStamps(0, 0); // Renderizar 0 sellos para la nueva tarjeta
                showToast("¡Bienvenido! Hemos creado tu tarjeta de lealtad.", 'success');
            }).catch(error => {
                console.error("Error al crear documento de usuario:", error);
                showToast(`Error al crear tu tarjeta: ${error.message}`, 'error');
            });
        }
    }, (error) => {
        console.error("Error al escuchar cambios en la tarjeta de lealtad:", error);
        showToast(`Error al cargar tu tarjeta: ${error.message}`, 'error');
    });
}

// Cargar historial de sellos para un usuario
async function loadStampsHistory(uid) {
    stampsHistoryList.innerHTML = '<li>Cargando historial...</li>';
    const historyColRef = collection(db, 'users', uid, 'history');
    const q = query(historyColRef, orderBy('timestamp', 'desc'), limit(10));

    try {
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            stampsHistoryList.innerHTML = '<li>No hay historial de sellos todavía.</li>';
            return;
        }

        stampsHistoryList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const entry = doc.data();
            const li = document.createElement('li');
            const date = entry.timestamp ? entry.timestamp.toDate().toLocaleString() : 'Fecha desconocida';
            li.innerHTML = `<span class="description">${entry.type}: ${entry.description}</span><span class="timestamp">${date}</span>`;
            stampsHistoryList.appendChild(li);
        });
    } catch (error) {
        console.error("Error cargando historial:", error);
        stampsHistoryList.innerHTML = '<li>Error al cargar el historial.</li>';
        showToast(`Error al cargar historial: ${error.message}`, 'error');
    }
}

// Añadir sello para un cliente específico (desde admin)
async function addStamp(uid, previousStamps) {
    if (!uid) {
        showToast('Error: UID de cliente no cargado.', 'error');
        return;
    }
    setAdminLoading(true);

    const userRef = doc(db, 'users', uid);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                // Si el documento no existe, lo creamos con 1 sello
                const newStamps = 1;
                transaction.set(userRef, {
                    stamps: newStamps,
                    rewardsRedeemed: 0,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                    email: clientUidInput.value.includes('@') ? clientUidInput.value : null, // Usar email si es un email
                    displayName: clientUidInput.value.includes('@') ? clientUidInput.value.split('@')[0] : null // Nombre básico
                });
                // Registrar en el historial
                const historyEntry = {
                    type: 'Sello Añadido',
                    description: `Sello ${newStamps}/${MAX_STAMPS} (Tarjeta creada)`,
                    timestamp: serverTimestamp(),
                    adminUid: currentUser.uid
                };
                transaction.set(collection(userRef, 'history').doc(), historyEntry);
                showToast(`Cliente nuevo creado y sello añadido. Total: ${newStamps}.`, 'success');
            } else {
                const currentStamps = userDoc.data().stamps || 0;
                if (currentStamps < MAX_STAMPS) {
                    const newStamps = currentStamps + 1;
                    transaction.update(userRef, {
                        stamps: newStamps,
                        lastUpdated: serverTimestamp()
                    });
                    // Registrar en el historial
                    const historyEntry = {
                        type: 'Sello Añadido',
                        description: `Sello ${newStamps}/${MAX_STAMPS}`,
                        timestamp: serverTimestamp(),
                        adminUid: currentUser.uid
                    };
                    transaction.set(collection(userRef, 'history').doc(), historyEntry);
                    showToast(`Sello añadido. Nuevo total: ${newStamps}.`, 'success');
                } else {
                    showToast('El cliente ya tiene el máximo de sellos. No se puede añadir más.', 'warning');
                }
            }
        });
        // Actualizar dashboard y historial después de la transacción
        loadAdminDashboard();
        loadStampsHistory(uid);

        // Animación visual en el panel de admin si el sello se añadió correctamente
        if (adminCurrentStamps && previousStamps < MAX_STAMPS) {
            const stampsSpan = document.createElement('span');
            stampsSpan.textContent = ' ☕';
            stampsSpan.style.display = 'inline-block';
            stampsSpan.style.fontSize = '1.2em';
            stampsSpan.style.color = '#5bc0de';
            stampsSpan.classList.add('animate');
            adminCurrentStamps.appendChild(stampsSpan);
            stampsSpan.addEventListener('animationend', () => {
                stampsSpan.remove();
            }, { once: true });
        }

    } catch (error) {
        console.error("Error añadiendo sello:", error);
        showToast(`Error al añadir sello: ${error.message}`, 'error');
    } finally {
        setAdminLoading(false);
    }
}

// Quitar sello para un cliente específico (desde admin)
async function removeStamp(uid) {
    if (!uid) {
        showToast('Error: UID de cliente no cargado.', 'error');
        return;
    }
    setAdminLoading(true);

    const userRef = doc(db, 'users', uid);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                showToast('Error: Cliente no encontrado.', 'error');
                return Promise.reject(new Error('Cliente no encontrado'));
            }

            const currentStamps = userDoc.data().stamps || 0;
            if (currentStamps > 0) {
                const newStamps = currentStamps - 1;
                transaction.update(userRef, {
                    stamps: newStamps,
                    lastUpdated: serverTimestamp()
                });
                const historyEntry = {
                    type: 'Sello Quitado',
                    description: `Sello ${newStamps}/${MAX_STAMPS}`,
                    timestamp: serverTimestamp(),
                    adminUid: currentUser.uid
                };
                transaction.set(collection(userRef, 'history').doc(), historyEntry);
                showToast(`Sello quitado. Nuevo total: ${newStamps}.`, 'success');
            } else {
                showToast('El cliente ya tiene 0 sellos. No se puede quitar más.', 'warning');
            }
        });
        loadAdminDashboard();
        loadStampsHistory(uid);
    } catch (error) {
        console.error("Error quitando sello:", error);
        showToast(`Error al quitar sello: ${error.message}`, 'error');
    } finally {
        setAdminLoading(false);
    }
}

// Canjear café gratis para un cliente (desde admin)
async function redeemCoffee(uid) {
    if (!uid) {
        showToast('Error: UID de cliente no cargado.', 'error');
        return;
    }
    setAdminLoading(true);

    const userRef = doc(db, 'users', uid);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                showToast('Error: Cliente no encontrado.', 'error');
                return Promise.reject(new Error('Cliente no encontrado'));
            }

            const currentStamps = userDoc.data().stamps || 0;
            let rewardsRedeemed = userDoc.data().rewardsRedeemed || 0;

            if (currentStamps < MAX_STAMPS) {
                showToast('Error: El cliente no tiene suficientes sellos para canjear un café gratis.', 'error');
                return Promise.reject(new Error('No suficientes sellos'));
            }

            transaction.update(userRef, {
                stamps: 0,
                rewardsRedeemed: rewardsRedeemed + 1,
                lastUpdated: serverTimestamp()
            });
            const historyEntry = {
                type: 'Café Canjeado',
                description: 'Canjeó un café gratis. Sellos reiniciados.',
                timestamp: serverTimestamp(),
                adminUid: currentUser.uid
            };
            transaction.set(collection(userRef, 'history').doc(), historyEntry);
            showToast(`Café gratis canjeado. Sellos reiniciados. El cliente ha canjeado ${rewardsRedeemed + 1} cafés.`, 'success');
        });
        loadAdminDashboard();
        loadStampsHistory(uid);
    } catch (error) {
        console.error("Error canjeando café:", error);
        showToast(`Error al canjear café: ${error.message}`, 'error');
    } finally {
        setAdminLoading(false);
    }
}

// Reiniciar tarjeta para un cliente (desde admin)
async function resetStamps(uid) {
    if (!uid) {
        showToast('Error: UID de cliente no cargado.', 'error');
        return;
    }
    setAdminLoading(true);

    const userRef = doc(db, 'users', uid);
    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                // Si el documento no existe, lo creamos con 0 sellos
                transaction.set(userRef, {
                    stamps: 0,
                    rewardsRedeemed: 0,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp(),
                    email: clientUidInput.value.includes('@') ? clientUidInput.value : null,
                    displayName: clientUidInput.value.includes('@') ? clientUidInput.value.split('@')[0] : null
                });
                const historyEntry = {
                    type: 'Tarjeta Reiniciada',
                    description: 'Tarjeta creada/reiniciada a 0 sellos.',
                    timestamp: serverTimestamp(),
                    adminUid: currentUser.uid
                };
                transaction.set(collection(userRef, 'history').doc(), historyEntry);
                showToast(`Cliente nuevo creado y tarjeta reiniciada a 0 sellos.`, 'info');
            } else {
                const currentStamps = userDoc.data().stamps || 0;
                transaction.update(userRef, {
                    stamps: 0,
                    lastUpdated: serverTimestamp()
                });
                const historyEntry = {
                    type: 'Tarjeta Reiniciada',
                    description: `Tarjeta reiniciada desde ${currentStamps} sellos a 0.`,
                    timestamp: serverTimestamp(),
                    adminUid: currentUser.uid
                };
                transaction.set(collection(userRef, 'history').doc(), historyEntry);
                showToast(`Tarjeta reiniciada a 0 sellos.`, 'info');
            }
        });
        loadAdminDashboard();
        loadStampsHistory(uid);
    } catch (error) {
        console.error("Error reiniciando tarjeta:", error);
        showToast(`Error al reiniciar tarjeta: ${error.message}`, 'error');
    } finally {
        setAdminLoading(false);
    }
}

// Cargar datos para el dashboard de administración
async function loadAdminDashboard() {
    try {
        const usersColRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersColRef);
        let totalCustomers = 0;
        let pendingRewards = 0;
        let totalStamps = 0;

        usersSnapshot.forEach(doc => {
            totalCustomers++;
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
        showToast(`Error al cargar dashboard: ${error.message}`, 'error');
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

    try {
        // Consulta de colección grupal para 'history'
        const historyCollectionGroupRef = collectionGroup(db, 'history');
        let q = query(historyCollectionGroupRef);

        if (startDate) {
            q = query(historyCollectionGroupRef, where('timestamp', '>=', startDate));
        }

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(doc => {
            const entry = doc.data();
            switch (entry.type) {
                case 'Sello Añadido':
                    stampsAdded++;
                    break;
                case 'Café Canjeado':
                    rewardsRedeemed++;
                    break;
                case 'Tarjeta Reiniciada':
                    cardsReset++;
                    break;
                case 'Sello Quitado':
                    stampsRemoved++;
                    break;
            }
        });

        stampsAddedStat.textContent = stampsAdded;
        rewardsRedeemedStat.textContent = rewardsRedeemed;
        cardsResetStat.textContent = cardsReset;
        stampsRemovedStat.textContent = stampsRemoved;

    } catch (error) {
        console.error("Error generando reporte:", error);
        showToast(`Error al generar reporte: ${error.message}`, 'error');
    }
}


// 6. Funciones de Autenticación
async function handleAuth() {
    if (currentUser) {
        // Cerrar sesión
        try {
            await signOut(auth);
            showToast('Sesión cerrada correctamente.', 'info');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showToast(`Error al cerrar sesión: ${error.message}`, 'error');
        }
    } else {
        // Iniciar sesión con Google
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            console.log('Usuario inició sesión:', user.displayName || user.email);

            // Verificar si el usuario ya tiene un documento en Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                // Si es un nuevo usuario, crear documento
                await setDoc(userDocRef, {
                    email: user.email,
                    displayName: user.displayName || '',
                    stamps: 0,
                    rewardsRedeemed: 0,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });
                showToast(`Bienvenido, ${user.displayName || user.email}! Tu tarjeta de lealtad ha sido creada.`, 'success');
            } else {
                // Si el usuario ya existe, actualizar displayName/email si han cambiado
                const existingData = userDocSnap.data();
                if (existingData.email !== user.email || existingData.displayName !== (user.displayName || '')) {
                    await updateDoc(userDocRef, {
                        email: user.email,
                        displayName: user.displayName || '',
                        lastUpdated: serverTimestamp()
                    });
                    showToast(`Bienvenido de nuevo, ${user.displayName || user.email}!`, 'info');
                } else {
                    showToast(`Bienvenido de nuevo, ${user.displayName || user.email}!`, 'info');
                }
            }
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
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
            showToast(`${errorMessage} (Código: ${error.code})`, 'error', 7000);
        }
    }
}

// Escuchador de cambios de estado de autenticación
onAuthStateChanged(auth, user => {
    updateUI(user);
});

// 7. Event Listeners del Panel de Administración

// Búsqueda de cliente por UID o Email
searchClientBtn.addEventListener('click', async () => {
    const input = clientUidInput.value.trim();
    if (!input) {
        showToast('Por favor, ingrese un Email o UID de cliente.', 'warning');
        resetAdminClientInfo();
        return;
    }

    setAdminLoading(true);

    try {
        let userFoundData = null;
        let userFoundUid = null;

        // Intentar buscar por UID directamente
        const userDoc = await getDoc(doc(db, 'users', input));
        if (userDoc.exists()) {
            userFoundData = userDoc.data();
            userFoundUid = userDoc.id;
        } else {
            // Si no se encuentra por UID, intentar buscar por email
            const q = query(collection(db, 'users'), where('email', '==', input), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                userFoundData = docSnap.data();
                userFoundUid = docSnap.id;
            }
        }

        if (userFoundData) {
            updateAdminClientInfo({ ...userFoundData, uid: userFoundUid });
            loadStampsHistory(userFoundUid); // Cargar historial del cliente cargado
            showToast('Cliente cargado con éxito.', 'success');
        } else {
            showToast('Cliente no encontrado. Verifique el Email/UID.', 'error');
            resetAdminClientInfo();
        }
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        showToast(`Error al buscar cliente: ${error.message}`, 'error');
        resetAdminClientInfo();
    } finally {
        setAdminLoading(false);
    }
});

// Event listeners para los botones de acción del admin
addStampBtn.addEventListener('click', () => {
    if (targetClientUid) {
        addStamp(targetClientUid, currentClientData ? currentClientData.stamps : 0);
    } else {
        showToast('Por favor, cargue un cliente primero.', 'warning');
    }
});

removeStampBtn.addEventListener('click', () => {
    if (targetClientUid) {
        removeStamp(targetClientUid);
    } else {
        showToast('Por favor, cargue un cliente primero.', 'warning');
    }
});

redeemCoffeeBtn.addEventListener('click', () => {
    if (targetClientUid) {
        redeemCoffee(targetClientUid);
    } else {
        showToast('Por favor, cargue un cliente primero.', 'warning');
    }
});

resetStampsBtn.addEventListener('click', () => {
    if (targetClientUid) {
        resetStamps(targetClientUid);
    } else {
        showToast('Por favor, cargue un cliente primero.', 'warning');
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
