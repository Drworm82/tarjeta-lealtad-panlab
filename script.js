/* style.css */

body {
    font-family: Arial, sans-serif;
    background-color: #f7f3ed; /* Color de fondo suave */
    color: #333;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    overflow-x: hidden; /* Evita el scroll horizontal no deseado */
}

header {
    background-color: #7a4a2b; /* Marrón oscuro para la cabecera */
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

header h1 {
    margin: 0;
    font-size: 1.8em;
}

.auth-controls {
    display: flex;
    align-items: center;
}

#user-display {
    margin-right: 15px;
    font-weight: bold;
}

button {
    background-color: #a06e4a; /* Marrón más claro para botones */
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.2s ease;
}

button:hover {
    background-color: #8a5e3a;
}

button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

main {
    flex-grow: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%; /* Asegura que el main ocupe todo el ancho disponible */
    box-sizing: border-box; /* Incluye padding y border en el ancho/alto */
}

.card {
    background-color: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    padding: 25px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 600px;
    text-align: center;
    box-sizing: border-box; /* Incluye padding y border en el ancho/alto */
}

.card h2 {
    color: #7a4a2b;
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.6em;
}

/* Estilos de la Tarjeta de Lealtad */
.stamps-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr); /* 5 columnas */
    gap: 15px;
    margin-bottom: 20px;
    justify-items: center;
    align-items: center;
}

.stamp {
    width: 60px;
    height: 60px;
    background-color: #e0d8cc; /* Color para sello vacío */
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2em;
    font-weight: bold;
    color: #7a4a2b;
    border: 2px solid #a06e4a;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    transition: background-color 0.3s ease, color 0.3s ease, transform 0.1s ease;
}

.stamp.obtained {
    background-color: #a06e4a; /* Color para sello lleno */
    color: white; /* Color del icono */
    font-size: 2em; /* Tamaño más grande para el icono */
    border-color: #7a4a2b;
}

/* Mensajes */
#message, #admin-message {
    margin-top: 15px;
    font-size: 1.1em;
    font-weight: bold;
}

/* Contenedor de Confeti */
.confetti-container {
    position: relative; /* Para posicionar el confeti relativo a este contenedor */
    width: 100%;
    height: 100px; /* Altura para el efecto de confeti */
    overflow: hidden;
    margin-top: 20px;
    display: none; /* Oculto por defecto, activado por JS */
}

.confetti-container.active {
    display: block; /* Muestra el contenedor cuando está activo */
}

.confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background-color: #ccc; /* Color por defecto, sobrescrito por JS */
    border-radius: 50%;
    opacity: 0;
    animation-fill-mode: forwards;
}

/* Animaciones de Confeti (ejemplo de 5 variaciones) */
@keyframes confetti-fall-1 {
    0% { transform: translate(0, -100px) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(50px, 300px) rotate(360deg); opacity: 0; }
}
@keyframes confetti-fall-2 {
    0% { transform: translate(100px, -150px) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(-50px, 350px) rotate(-360deg); opacity: 0; }
}
@keyframes confetti-fall-3 {
    0% { transform: translate(-50px, -200px) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(100px, 400px) rotate(720deg); opacity: 0; }
}
@keyframes confetti-fall-4 {
    0% { transform: translate(150px, -100px) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(-100px, 300px) rotate(-720deg); opacity: 0; }
}
@keyframes confetti-fall-5 {
    0% { transform: translate(-100px, -150px) rotate(0deg); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(50px, 350px) rotate(360deg); opacity: 0; }
}


/* Sección de Administración */
#admin-section {
    background-color: #f0ead8; /* Fondo más claro para admin */
    border: 1px dashed #a06e4a;
}

.admin-controls, .admin-actions {
    display: flex;
    flex-wrap: wrap; /* Permite que los elementos se envuelvan en líneas si no hay espacio */
    gap: 10px; /* Espacio entre los elementos */
    margin-bottom: 15px;
    justify-content: center; /* Centra los botones */
    align-items: center;
}

.admin-controls label {
    font-weight: bold;
    margin-right: 5px;
}

.admin-controls input[type="text"],
.admin-controls input[type="email"] {
    flex-grow: 1; /* Permite que el input crezca */
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    max-width: 250px; /* Limita el ancho del input */
}

.client-info {
    background-color: #f9f9f9;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 5px;
    margin-top: 15px;
    margin-bottom: 20px;
    text-align: left;
}

.client-info p {
    margin: 5px 0;
}

.admin-actions button {
    flex: 1 1 auto; /* Permite que los botones crezcan y se encojan */
    min-width: 120px; /* Ancho mínimo para los botones */
    max-width: 180px; /* Ancho máximo para los botones */
}

/* Colores específicos para botones de administración */
#add-stamp-btn { background-color: #28a745; } /* Verde */
#add-stamp-btn:hover:not(:disabled) { background-color: #218838; }
#remove-stamp-btn { background-color: #dc3545; } /* Rojo */
#remove-stamp-btn:hover:not(:disabled) { background-color: #c82333; }
#redeem-coffee-btn { background-color: #17a2b8; } /* Azul-cian */
#redeem-coffee-btn:hover:not(:disabled) { background-color: #138496; }
#reset-stamps-btn { background-color: #6c757d; } /* Gris */
#reset-stamps-btn:hover:not(:disabled) { background-color: #5a6268; }

/* Estilos para el Código QR y sus instrucciones */
#qrcode-canvas {
    display: block !important; /* Asegura que siempre se muestre cuando sea visible */
    margin: 20px auto; /* Centra el QR */
    max-width: 90%; /* Limita el ancho máximo para que no se desborde */
    height: auto; /* Mantiene la proporción */
    border: 1px solid #ccc; /* Un borde sutil para que sea visible */
    box-shadow: 0 2px 5px rgba(0,0,0,0.1); /* Sombra para destacarlo */
}

#qr-instruction {
    display: block !important; /* Asegura que la instrucción siempre se muestre cuando sea visible */
    text-align: center;
    margin-top: 10px;
    font-size: 0.9em;
    color: #666;
}

/* Para esconder elementos */
.hidden {
    display: none !important; /* Usamos !important para asegurar que se oculte */
}

/* Pie de página */
footer {
    background-color: #7a4a2b;
    color: white;
    text-align: center;
    padding: 10px;
    margin-top: 20px;
    width: 100%;
    box-sizing: border-box; /* Incluye padding en el ancho */
}

/* Media query para pantallas pequeñas (móviles) */
@media (max-width: 600px) {
    header {
        flex-direction: column;
        text-align: center;
        padding: 10px;
    }

    header h1 {
        font-size: 1.5em;
        margin-bottom: 10px;
    }

    .auth-controls {
        flex-direction: column;
        width: 100%;
    }

    #user-display {
        margin-right: 0;
        margin-bottom: 10px;
    }

    button {
        width: 90%; /* Botones más anchos en móvil */
        margin-bottom: 10px;
    }

    main {
        padding: 10px;
    }

    .card {
        padding: 15px;
        margin-bottom: 15px;
    }

    .stamps-grid {
        grid-template-columns: repeat(4, 1fr); /* 4 columnas en pantallas pequeñas para mejor ajuste */
        gap: 10px;
    }

    .stamp {
        width: 50px; /* Sellos un poco más pequeños */
        height: 50px;
        font-size: 1.1em;
    }
    .stamp.obtained {
        font-size: 1.8em;
    }

    .admin-controls input[type="text"],
    .admin-controls input[type="email"] {
        max-width: 100%; /* El input de admin ocupa todo el ancho */
    }

    .admin-actions button {
        min-width: unset; /* Reinicia el min-width */
        width: 100%; /* Botones de acción del admin al 100% en móvil */
    }

    #qrcode-canvas {
        width: 180px; /* Tamaño del QR ligeramente más pequeño en móviles */
        height: 180px;
    }
}

/* Media query para pantallas aún más pequeñas (ej. iPhone 5/SE, viejos Android) */
@media (max-width: 350px) {
    .stamps-grid {
        grid-template-columns: repeat(3, 1fr); /* 3 columnas para pantallas muy estrechas */
    }
    .stamp {
        width: 45px;
        height: 45px;
        font-size: 1em;
    }
    .stamp.obtained {
        font-size: 1.6em;
    }
    #qrcode-canvas {
        width: 150px;
        height: 150px;
    }
}
