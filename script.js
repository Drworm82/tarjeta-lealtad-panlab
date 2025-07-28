const MAX_STAMPS = 10;
let currentStamps = 0;

const stampsDisplay = document.getElementById('stamps-display');
const messageDisplay = document.getElementById('message');
const addStampBtn = document.getElementById('add-stamp-btn');
const redeemBtn = document.getElementById('redeem-btn');
const resetBtn = document.getElementById('reset-btn');

function saveStamps() {
    localStorage.setItem('coffeeStamps', currentStamps);
}

function loadStamps() {
    const savedStamps = localStorage.getItem('coffeeStamps');
    if (savedStamps !== null) {
        currentStamps = parseInt(savedStamps, 10);
    }
}

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

addStampBtn.addEventListener('click', () => {
    if (currentStamps < MAX_STAMPS) {
        currentStamps++;
        saveStamps();
        updateDisplay();
    }
});

redeemBtn.addEventListener('click', () => {
    if (currentStamps >= MAX_STAMPS) {
        currentStamps = 0;
        saveStamps();
        updateDisplay();
        alert('¡Recompensa canjeada! Disfruta tu café gratis. 😉');
    }
});

resetBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres reiniciar la tarjeta? Esto borrará todos los sellos.')) {
        currentStamps = 0;
        saveStamps();
        updateDisplay();
        alert('Tarjeta de lealtad reiniciada.');
    }
});

loadStamps();
updateDisplay();