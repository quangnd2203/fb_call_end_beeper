let hasBeeped = false;
let audioContext = null;
let scanTimeout = null;

// Initialize AudioContext once and reuse
function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        audioContext = new AudioContextClass();
    }
    // Resume if suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playBeepSound() {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    try {
        // Generate beep times dynamically (26 beeps, 0.4s apart, total 10s)
        const beepCount = 26;
        const beepInterval = 0.4;
        const beepDuration = 0.15;
        
        const baseTime = ctx.currentTime;
        
        for (let i = 0; i < beepCount; i++) {
            const startTime = baseTime + (i * beepInterval);
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = "square";
            osc.frequency.value = 1200;
            
            osc.start(startTime);
            osc.stop(startTime + beepDuration);
            
            gain.gain.setValueAtTime(1, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + beepDuration);
        }
        console.log("LOG: Beeped");
    } catch (e) {
        console.error("Audio Error:", e);
    }
}

// Throttled scan function to avoid excessive scanning
function scanForCallEnd() {
    if (hasBeeped) return;
    
    // Clear any pending scan
    if (scanTimeout) {
        clearTimeout(scanTimeout);
    }
    
    // Throttle: only scan after a short delay to batch mutations
    scanTimeout = setTimeout(() => {
        if (hasBeeped) return;
        
        const endKeywords = [
            "Cuộc gọi đã kết thúc",
            "Call ended",
            "The call has ended",
            "Video chat ended"
        ];
        
        // Use textContent instead of innerText for better performance
        const bodyText = document.body.textContent || document.body.innerText;
        const foundText = endKeywords.some(keyword => bodyText.includes(keyword));
        
        if (foundText) {
            console.log("Call ended");
            playBeepSound();
            hasBeeped = true;
            
            // Reset after 10s
            setTimeout(() => {
                hasBeeped = false;
            }, 10000);
        }
    }, 100); // 100ms throttle
}

// Optimized observer - only watch for text changes
const observer = new MutationObserver(() => {
    scanForCallEnd();
});

// Start observing when DOM is ready
if (document.body) {
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true // Watch for text changes
    });
} else {
    // Wait for body if not ready
    document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    });
}

// Initial scan after page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(scanForCallEnd, 2000);
    });
} else {
    setTimeout(scanForCallEnd, 2000);
}

console.log("FB Call Beeper: Watching in this window ->", window.location.href);