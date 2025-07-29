// ... (parte superior del script.js) ...

let clientListener = null; // Para almacenar el listener de Firestore del cliente actual
let adminClientListener = null; // Para almacenar el listener de Firestore del cliente en el panel de admin

// ... (dentro de onAuthStateChanged) ...

onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        // ... (resto del código de user-display y authBtn) ...
        
        // Determinar si es administrador
        if (currentUser.email === adminUserEmail) {
            adminSection.classList.remove('hidden');
            userDisplay.textContent += ' (Admin)';
            setAdminControlsEnabled(false);
            clearAdminClientInfo(); // Asegura que el panel de admin se limpie y sus listeners se desactiven
            
            // Si el admin inicia sesión, y había un listener de usuario normal activo, lo desactivamos.
            if (clientListener) {
                clientListener(); 
                clientListener = null;
            }

        } else {
            adminSection.classList.add('hidden');
            // Si un usuario normal inicia sesión, y había un listener de admin activo, lo desactivamos.
            if (adminClientListener) {
                adminClientListener(); 
                adminClientListener = null;
            }
        }
        
        // Cargar y escuchar los sellos del usuario actual (siempre para el usuario logueado, sea admin o no)
        loadAndListenForStamps(currentUser.email);

    } else {
        currentUser = null;
        // ... (resto del código para cerrar sesión) ...
        
        // Detener *ambos* listeners al cerrar sesión
        if (clientListener) {
            clientListener(); 
            clientListener = null;
        }
        if (adminClientListener) {
            adminClientListener(); 
            adminClientListener = null;
        }
        clearAdminClientInfo(); // Asegurarse de limpiar el panel de admin también
    }
});

// ... (más abajo en la función searchClientBtn.addEventListener) ...

searchClientBtn.addEventListener('click', async () => {
    // ... (código para obtener email y validación) ...

    try {
        const clientDocRef = doc(db, 'loyaltyCards', email);

        // Desuscribir el listener *del admin* anterior si existe para evitar múltiples escuchas
        if (adminClientListener) {
            adminClientListener();
            adminClientListener = null;
        }
        // IMPORTANTE: También asegurarse de que el listener del usuario normal se desactive
        // si un admin está buscando a ese mismo usuario para evitar conflictos.
        if (clientListener && currentUser && currentUser.email === email) {
            clientListener();
            clientListener = null;
        }

        const clientDoc = await getDoc(clientDocRef); // ... (resto del código) ...

        if (clientDoc.exists()) {
            // ... (resto del código para mostrar info del cliente) ...

            // Escuchar cambios en los sellos del cliente buscado en tiempo real en el panel de admin
            adminClientListener = onSnapshot(clientDocRef, docSnapshot => {
                if (docSnapshot.exists()) {
                    const latestStamps = docSnapshot.data().stamps || 0;
                    document.getElementById('admin-current-stamps').textContent = latestStamps;
                } else {
                    clearAdminClientInfo();
                    adminMessage.textContent = `El cliente ${email} ya no existe.`;
                    adminMessage.style.color = '#d9534f';
                }
            }, error => {
                console.error("Error al escuchar sellos del cliente en admin:", error);
                adminMessage.textContent = 'Error al escuchar sellos del cliente: ' + error.message;
                adminMessage.style.color = '#d9534f';
            });

        } else {
            // ... (resto del código para cliente no encontrado) ...
        }
    } catch (error) {
        // ... (manejo de errores) ...
    }
});

// ... (función clearAdminClientInfo) ...

function clearAdminClientInfo() {
    adminClientInfo.innerHTML = '<p>No hay cliente cargado.</p>';
    setAdminControlsEnabled(false);
    targetClientEmail = null;
    // Detener el listener del cliente buscado en admin si existía
    if (adminClientListener) { 
        adminClientListener();
        adminClientListener = null;
    }
}
