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
let adminScanQRBtn, clientQRDisplay, closeQrDisplayBtn; // QR para mostrar el cliente
let qrReaderDiv, qrReaderResultsDiv, qrScannedUidP, confirmScannedUidBtn, stopQrScanBtn; // QR para escanear del admin

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
    userEmailDisplay = document.getElementById('userEmailDisplay');
    userPointsDisplay = document.getElementById('userPointsDisplay');
    messageDisplay = document.getElementById('messageDisplay');
    adminSection = document.getElementById('admin-section');
    userSection = document.getElementById('user-section');

    stampsDisplay = document.getElementById('stamps-display');
    progressMessage = document.getElementById('progress-message');
    userFreeCoffeesDisplay = document.getElementById('userFreeCoffeesDisplay');

    // Referencias para el QR del usuario (ahora un canvas)
    userQrCodeContainer = document.getElementById('user-qr-container');
    userQrCodeDisplay = document.getElementById('user-qr-code');
    userTransactionsHistoryDiv = document.getElementById('user-transactions-history');

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

    // Referencias para el escáner de QR del admin
    adminScanQRBtn = document.getElementById('admin-scan-qr-btn');
    clientQRDisplay = document.getElementById('client-qr-display'); // Contenedor para el QR del cliente buscado
    closeQrDisplayBtn = document.getElementById('close-qr-display');

    qrReaderDiv = document.getElementById('qr-reader'); // Contenedor para la vista de la cámara
    qrReaderResultsDiv = document.getElementById('qr-reader-results'); // Contenedor para el resultado del escaneo
    qrScannedUidP = document.getElementById('qr-scanned-uid'); // Párrafo para mostrar el UID escaneado
    confirmScannedUidBtn = document.getElementById('confirm-scanned-uid-btn'); // Botón para cargar el UID escaneado
    stopQrScanBtn = document.getElementById('stop-qr-scan-btn'); // Botón para detener el escáner


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
        if (userSection) userSection.style.display = 'none';
        if (adminSection) adminSection.style.display = 'none';
        if (messageDisplay) messageDisplay.style.display = 'none';

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

                if (userId
