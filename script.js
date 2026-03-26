/* =========================================
   CORE VARIABLES & ASSETS
   ========================================= */
let bibleData = [];
let quotesData = []; 
let baseSoulCount = 0; 

const introPrayer = new Audio('intro-prayer.mp3'); 
const backgroundMusic = new Audio('bg-music.mp3');
backgroundMusic.loop = true;

/* =========================================
   1. EXCEL DATA LOADING (Dual Sheets)
   ========================================= */
async function loadExcel() {
    try {
        const response = await fetch('database.xlsx');
        if (!response.ok) throw new Error("Database file not found. Ensure 'database.xlsx' is in the root folder.");
        
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 1. Load Feeling-based Verses from "Questions"
        const qSheet = workbook.Sheets["Questions"];
        if (qSheet) {
            bibleData = XLSX.utils.sheet_to_json(qSheet);
        }

        // 2. Load Stats from "Stats"
        const statsSheet = workbook.Sheets["Stats"];
        if (statsSheet) {
            const statsData = XLSX.utils.sheet_to_json(statsSheet);
            if (statsData && statsData.length > 0) {
                baseSoulCount = parseInt(statsData[0].Total) || 0;
            } else {
                baseSoulCount = 0;
            }
            updateCounterUI();
        }
        
        // 3. Load Dove Quotes from "Quotes"
        const quoteSheet = workbook.Sheets["Quotes"];
        if (quoteSheet) {
            quotesData = XLSX.utils.sheet_to_json(quoteSheet);
        }
        
        // Finalize UI
        createCategoryButtons();
        setupDoveInteraction(); 

    } catch (error) {
        console.error("Excel Error:", error);
    }
}

/* =========================================
   2. UI GENERATION (Dynamic Buttons)
   ========================================= */
function createCategoryButtons() {
    const container = document.getElementById('category-container');
    if (!container || bibleData.length === 0) return;

    const categories = [...new Set(bibleData.map(item => item.Category))];
    container.innerHTML = ""; 

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat;
        btn.onclick = () => showVerse(cat);
        container.appendChild(btn);
    });
}

/* =========================================
   3. CLICKABLE DOVE LOGIC
   ========================================= */
function setupDoveInteraction() {
    const dove = document.getElementById('flying-dove');
    if (!dove) return;

    dove.onclick = () => {
        if (quotesData.length === 0) return;

        const randomQuote = quotesData[Math.floor(Math.random() * quotesData.length)];
        
        document.getElementById('quote-text').innerText = randomQuote.Verse;
        document.getElementById('quote-source').innerText = `— ${randomQuote.Source}`;
        document.getElementById('quoteModal').style.display = 'block';
        
        speakQuote(randomQuote.Verse);
    };
}

function speakQuote(text) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.85;
    msg.pitch = 1.1; 
    msg.voice = getDevotionalVoice();
    window.speechSynthesis.speak(msg);
}

/* =========================================
   4. MAIN VERSE DISPLAY LOGIC
   ========================================= */
function showVerse(category) {
    introPrayer.pause();
    introPrayer.currentTime = 0; 
    
    const filtered = bibleData.filter(item => item.Category === category);
    if (filtered.length === 0) return;

    const randomEntry = filtered[Math.floor(Math.random() * filtered.length)];

    document.getElementById('reflection-section').classList.add('hidden');
    document.getElementById('prayer-section').classList.add('hidden');
    document.getElementById('btn-show-reflection').classList.remove('hidden');
    document.getElementById('btn-show-prayer').classList.remove('hidden');

    document.getElementById('feeling-text').innerText = `Are you feeling... ${randomEntry.Feeling}?`;
    document.getElementById('bible-verse').innerText = randomEntry['Bible Verse'];
    document.getElementById('reflection-text').innerText = randomEntry.Reflection;
    document.getElementById('prayer-text').innerText = randomEntry['Personal Prayer'];

    let verseText = randomEntry['Bible Verse'];
    verseText = verseText.replace(/(\d+):(\d+)/g, " Chapter $1, Verse $2. ");
    verseText = verseText.replace(/(\d+)-(\d+)/g, " $1 to $2. ");
    verseText = verseText.replace(/;/g, ". ... "); 
    verseText = verseText.replace(/[:—]/g, "");

    const finalSpeech = `Are you feeling... ${randomEntry.Feeling}? ... ... Here is a message for you... ${verseText}`;
    const msg = new SpeechSynthesisUtterance(finalSpeech);
    msg.rate = 0.82; 
    msg.pitch = 0.88; 
    msg.voice = getDevotionalVoice();

    msg.onstart = () => { backgroundMusic.volume = 0.1; };
    msg.onend = () => { backgroundMusic.volume = 0.4; };

    window.speechSynthesis.cancel(); 
    window.speechSynthesis.speak(msg);

    document.getElementById('verseModal').style.display = 'block';
}

/* =========================================
   5. SPEECH & VOICE SETUP
   ========================================= */
function getDevotionalVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.name.includes('Christopher') && v.name.includes('Neural')) || 
           voices.find(v => v.name.includes('Guy') && v.name.includes('Neural')) ||
           voices.find(v => v.name.includes('Google US English')) || 
           voices.find(v => v.name.includes('David')) ||
           voices[0];
}

/* =========================================
   6. GLOBAL EVENT LISTENERS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    window.speechSynthesis.onvoiceschanged = () => getDevotionalVoice();

    const listen = (id, func) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', func);
    };

    listen('btn-close-quote', () => {
        document.getElementById('quoteModal').style.display = 'none';
        window.speechSynthesis.cancel();
    });

    listen('btn-show-reflection', () => {
        document.getElementById('reflection-section').classList.remove('hidden');
        document.getElementById('btn-show-reflection').classList.add('hidden');
    });

    listen('btn-show-prayer', () => {
        document.getElementById('prayer-section').classList.remove('hidden');
        document.getElementById('btn-show-prayer').classList.add('hidden');
    });

    listen('btn-close', () => {
        document.getElementById('verseModal').style.display = 'none';
        window.speechSynthesis.cancel(); 
    });

    // Welcome Screen Logic
    listen('btn-pray', () => {
        recordSoulReached();
        
        // Safety: Enter app immediately in case audio fails to trigger 'onended'
        enterApp(); 

        backgroundMusic.volume = 0.2; 
        backgroundMusic.play().catch(e => console.log("Audio Blocked"));
        
        setTimeout(() => {
            backgroundMusic.volume = 0.1; 
            introPrayer.play().catch(e => {
                console.log("Prayer Audio Blocked");
                backgroundMusic.volume = 0.4;
            });
            
            introPrayer.onended = () => {
                backgroundMusic.volume = 0.4;
            };
        }, 1000); 
    });

    listen('btn-skip', (e) => {
        e.preventDefault();
        recordSoulReached();
        introPrayer.pause(); 
        backgroundMusic.play().catch(e => console.log("Audio Blocked"));
        enterApp();
    });

    listen('mode-toggle', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        const icon = document.querySelector('#mode-toggle .control-icon');
        if(icon) icon.innerText = isDark ? '☀️' : '🌙';
    });

    let isMuted = false;
    listen('music-toggle', () => {
        isMuted = !isMuted;
        backgroundMusic.muted = isMuted;
        introPrayer.muted = isMuted;

        const btn = document.getElementById('music-toggle');
        const icon = btn.querySelector('.control-icon');
        const label = btn.querySelector('.control-label');

        if (isMuted) {
            if(icon) icon.innerText = '🔇';
            if(label) label.innerText = 'MUSIC OFF';
            btn.classList.remove('active');
            window.speechSynthesis.cancel();
        } else {
            if(icon) icon.innerText = '🔊';
            if(label) label.innerText = 'MUSIC ON';
            btn.classList.add('active');
        }
    });
});

function enterApp() {
    const welcome = document.getElementById('welcome-screen');
    if(welcome) {
        welcome.style.opacity = '0';
        setTimeout(() => { welcome.style.display = 'none'; }, 500);
    }
}

loadExcel();

function handleTab(element, tabName) {
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    element.classList.add('active');
}

/* =========================================
   7. STATS & SOUL COUNTER LOGIC
   ========================================= */
function recordSoulReached() {
    let sessionCount = parseInt(localStorage.getItem('souls_reached') || "0");
    sessionCount++;
    localStorage.setItem('souls_reached', sessionCount);
    updateCounterUI();
}

function updateCounterUI() {
    const pillCount = document.querySelector('.pill-count');
    if (pillCount) {
        let sessionCount = parseInt(localStorage.getItem('souls_reached') || "0");
        pillCount.innerText = (baseSoulCount + sessionCount).toLocaleString();
    }
}
