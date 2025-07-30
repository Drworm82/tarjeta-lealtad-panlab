// ... (código existente) ...

// --- Manejo del Estado de Autenticación (Controlador principal de UI) ---
onAuthStateChanged(auth, async (user) => {
    // Ocultar todas las secciones por defecto para evitar "flashes" de contenido
    // y para que la animación de entrada funcione desde 0
    if (userSection) userSection.classList.remove('active'); // Remover para animar la entrada
    if (adminSection) adminSection.classList.remove('active'); // Remover para animar la entrada
    if (messageDisplay) messageDisplay.style.display = 'none';

    if (user) {
        // ... (código existente para user logueado) ...

        const userData = userDoc.data();
        if (userData && userData.isAdmin) {
            if (adminSection) {
                adminSection.style.display = 'block';
                setTimeout(() => adminSection.classList.add('active'), 50); // Pequeño retraso para la transición
            }
            loadAdminDashboard();
            if (unsubscribeFromUserCard) {
                unsubscribeFromUserCard();
                unsubscribeFromUserCard = null;
            }
        } else {
            if (userSection) {
                userSection.style.display = 'block';
                setTimeout(() => userSection.classList.add('active'), 50); // Pequeño retraso para la transición
            }
            listenForUserCardChanges(user.uid);
        }

    } else {
        // Usuario no logueado
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        showMessage('Por favor, inicia sesión.', 'info');
        clearUserCard();
        clearAdminDashboard();
        if (unsubscribeFromUserCard) {
            unsubscribeFromUserCard();
            unsubscribeFromUserCard = null;
        }
    }
});

// ... (código existente) ...

// --- Función para mostrar mensajes al usuario (pequeña mejora) ---
function showMessage(msg, type = 'info') {
    if (!messageDisplay) {
        console.warn("Elemento 'messageDisplay' no encontrado. No se pueden mostrar mensajes.");
        return;
    }
    messageDisplay.textContent = msg;
    messageDisplay.className = 'message ' + type; // Resetear clases y añadir la nueva
    messageDisplay.style.display = 'block'; // Asegurarse de que sea visible para la animación

    // Aquí, la animación de entrada ya la maneja CSS con @keyframes fadeInSlideDown
    // La animación de salida se gestiona con el setTimeout que oculta el elemento.

    setTimeout(() => {
        // Para una animación de salida suave, podríamos añadir una clase temporal de salida
        // messageDisplay.classList.add('fade-out');
        // messageDisplay.addEventListener('animationend', function handler() {
        //     messageDisplay.style.display = 'none';
        //     messageDisplay.textContent = '';
        //     messageDisplay.className = 'message'; // Limpiar clases
        //     messageDisplay.removeEventListener('animationend', handler);
        // });
        // Por ahora, simplemente lo ocultamos después del tiempo:
        messageDisplay.style.display = 'none';
        messageDisplay.textContent = '';
        messageDisplay.className = 'message';
    }, 5000);
}

// ... (resto del código) ...
