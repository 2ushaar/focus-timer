const { listen } = window.__TAURI__.event;

// --- ELEMENTS ---
const circle = document.querySelector('.progress-ring__circle');
const timerText = document.getElementById('timer');
const statusText = document.getElementById('status');
const priorityStage = document.getElementById('priority-stage'); // NEW
const secondaryListEl = document.getElementById('secondary-task-list'); // NEW
const inputEl = document.getElementById('new-task-input');

// --- CONSTANTS ---
const CIRCUMFERENCE = 628; 
const PULSE_INTERVAL_MS = 15 * 60 * 1000;

// --- STATE ---
let countdownInterval;
let pulseInterval;
let tasks = [
    // { id: 1, text: "Finish Report", done: false },
    // { id: 2, text: "Email Team", done: false }
];

// --- INITIALIZATION ---
initDisplay();
renderTasks();
startPulseTimer();

// --- EVENTS ---
listen('clipboard-text-captured', (event) => {
    const text = event.payload;
    const wordCount = text.split(/\s+/).length;
    let totalSeconds = Math.ceil((wordCount / 250) * 60);
    if (totalSeconds < 10) totalSeconds = 10;
    startTimer(totalSeconds, wordCount);
});

inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const text = inputEl.value.trim();
        if (text) {
            addNewTask(text);
            inputEl.value = '';
        }
    }
});

// --- CORE TASK LOGIC ---

function addNewTask(text) {
    tasks.push({ id: Date.now(), text: text, done: false });
    renderTasks();
}

function renderTasks() {
    // 1. Separate Tasks
    const activeTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);
    
    // 2. Identify Priority (First active task)
    const priorityTask = activeTasks.length > 0 ? activeTasks[0] : null;
    
    // 3. Identify Secondary (Rest of active + all done)
    const secondaryTasks = [...activeTasks.slice(1), ...doneTasks];

    // --- RENDER PRIORITY STAGE ---
    priorityStage.innerHTML = "";
    if (priorityTask) {
        const pEl = document.createElement('div');
        pEl.className = "priority-card";
        pEl.id = "priority-task"; // For pulse animation
        pEl.setAttribute('data-id', priorityTask.id);
        
        pEl.innerHTML = `
            <div class="circle-tick"></div>
            <span style="font-weight:600; font-size: 1.1rem;">${priorityTask.text}</span>
        `;
        
        // Complete Priority Task
        pEl.addEventListener('click', () => {
             toggleTask(priorityTask.id);
        });
        
        priorityStage.appendChild(pEl);
    } else {
        // Empty State
        priorityStage.innerHTML = `<div class="placeholder-text">All caught up! 🎉</div>`;
    }

    // --- RENDER SECONDARY LIST ---
    secondaryListEl.innerHTML = "";
    secondaryTasks.forEach(task => {
        const el = document.createElement('div');
        el.className = `secondary-card ${task.done ? 'done' : ''}`;
        el.setAttribute('data-id', task.id);
        
        el.innerHTML = `
            <div class="circle-tick ${task.done ? 'checked' : ''}">
                ${task.done ? '✔' : ''}
            </div>
            <span>${task.text}</span>
        `;

        el.addEventListener('click', () => toggleTask(task.id));
        secondaryListEl.appendChild(el);
    });
}

function toggleTask(id) {
    // 1. Find the elements
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Find the DOM element for this task (Priority or Secondary)
    // We search both containers just in case
    let cardEl = null;
    let tickEl = null;

    // Check Priority Stage
    const priorityCard = document.getElementById('priority-stage').firstElementChild;
    if (priorityCard && tasks.indexOf(task) === tasks.findIndex(t => !t.done)) {
        cardEl = priorityCard;
        tickEl = priorityCard.querySelector('.circle-tick');
    } 
    // Check Secondary List
    else {
        const secondaryItems = Array.from(document.querySelectorAll('.secondary-card'));
        // This is a rough lookup, relying on index matching logic or we can add data-id to HTML
        // Better way: Add `data-id="${task.id}"` to your HTML generation in renderTasks()
        cardEl = document.querySelector(`[data-id="${id}"]`);
        if (cardEl) tickEl = cardEl.querySelector('.circle-tick');
    }

    // 2. Play Animation & Sound (Positive Reinforcement)
    if (!task.done && tickEl) {
        playPopSound(); // Play Sound
        tickEl.classList.add('pop-animation'); // Green Burst
        
        // If it's the priority card, slide it away
        if (cardEl) cardEl.classList.add('task-card-exit');
    }

    // 3. Wait for animation, then update State
    setTimeout(() => {
        task.done = !task.done;
        
        // Remove glow if priority changed
        const priorityEl = document.getElementById('priority-task');
        if(priorityEl) priorityEl.classList.remove('pulse-glow');
        
        renderTasks();
    }, 350); // 350ms delay to let the user enjoy the pop
}

// --- PULSE REMINDER ---
function startPulseTimer() {
    if (pulseInterval) clearInterval(pulseInterval);
    pulseInterval = setInterval(() => {
        const priorityEl = document.getElementById('priority-task');
        if (priorityEl) {
            priorityEl.classList.add('pulse-glow');
            setTimeout(() => priorityEl.classList.remove('pulse-glow'), 10000);
        }
    }, PULSE_INTERVAL_MS);
}

// --- TIMER VISUALS ---
function startTimer(duration, words) {
    if (countdownInterval) clearInterval(countdownInterval);
    statusText.innerText = `${words} words detected`;
    circle.style.stroke = "#d0bcff"; 
    
    let timeLeft = duration;
    updateDisplay(timeLeft, duration);

    countdownInterval = setInterval(() => {
        timeLeft--;
        updateDisplay(timeLeft, duration);
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            timerFinished();
        }
    }, 1000);
}

function timerFinished() {
    timerText.innerText = "00:00";
    statusText.innerText = "Done!";
    circle.style.stroke = "#4caf50";
    circle.style.strokeDashoffset = 0;
}

function updateDisplay(timeLeft, totalTime) {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerText.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    const percent = timeLeft / totalTime;
    const offset = CIRCUMFERENCE - (percent * CIRCUMFERENCE);
    circle.style.strokeDashoffset = offset;
}

function initDisplay() {
    circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = CIRCUMFERENCE;
    circle.style.stroke = "rgba(255,255,255,0.2)";
}

// A simple satisfying "Pop" sound (Base64 encoded to avoid external files)
const successSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // (Shortened for brevity, use a real path or the full base64 string below)

// ACTUALLY, use this function for a synthetic 'pop' using AudioContext (Cleaner, no file needed)
function playPopSound() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // High pitch sine wave dropping fast (a "bloop" sound)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

    // Volume envelope
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

const streamContainer = document.querySelector('.focus-stream');

if (streamContainer) {
    streamContainer.addEventListener('click', () => {
        // Trigger the visual surge
        streamContainer.classList.add('stream-surge');
        
        // Play a subtle sound (reuse your pop sound or a lower hum)
        playPopSound(); 

        // Remove class after animation finishes so we can click again
        setTimeout(() => {
            streamContainer.classList.remove('stream-surge');
        }, 600);
    });
}

// OPTIONAL: Update toggleTask to also trigger the surge
// In your toggleTask function, add:
/*
    const stream = document.querySelector('.focus-stream');
    if(stream) {
        stream.classList.add('stream-surge');
        setTimeout(() => stream.classList.remove('stream-surge'), 600);
    }
*/