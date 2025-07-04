// main.js
import { AudioController } from './audio/AudioController.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const soundButtonsContainer = document.getElementById('sound-selection-container');
    const volumeSlider = document.getElementById('volumeSlider');
    const playbackStatusDiv = document.getElementById('playbackStatus');

    let audioController;

    try {
        audioController = new AudioController();
    } catch (error) {
        console.error("Failed to initialize AudioController:", error);
        if (playbackStatusDiv) {
            playbackStatusDiv.textContent = "Audio playback not supported by this browser.";
        }
        // Disable all audio controls if AudioController failed to initialize
        if (soundButtonsContainer) {
            Array.from(soundButtonsContainer.getElementsByTagName('button')).forEach(btn => btn.disabled = true);
        }
        if (volumeSlider) volumeSlider.disabled = true;
        return; // Stop further execution
    }

    // --- UI Update Functions ---
    function updatePlaybackStatus(message) {
        if (playbackStatusDiv) {
            playbackStatusDiv.textContent = message;
        }
        console.log(`UI Status: ${message}`);
    }

    function updateActiveButton(soundId, status) {
        if (!soundButtonsContainer) return;
        const buttons = soundButtonsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            const soundIdFromButton = button.dataset.sound;
            const isTargetButton = soundIdFromButton === soundId;

            if (isTargetButton) {
                switch (status) {
                    case 'playing':
                    case 'resumed':
                        button.classList.add('active-sound-button');
                        button.setAttribute('aria-pressed', 'true');
                        break;
                    case 'paused':
                        button.classList.add('active-sound-button'); // Keep visual active state
                        button.setAttribute('aria-pressed', 'false');
                        break;
                    case 'loading':
                        // When loading, we can make it look active, but not yet "pressed"
                        button.classList.add('active-sound-button');
                        button.setAttribute('aria-pressed', 'false');
                        // Consider adding a distinct "loading" class if specific spinner/animation is desired
                        // e.g., button.classList.add('sound-button--loading');
                        break;
                    case 'loaded': // Sound is ready, but not necessarily playing yet.
                        button.classList.add('active-sound-button'); // Mark as current/selectable
                        button.setAttribute('aria-pressed', 'false');
                        // button.classList.remove('sound-button--loading');
                        break;
                    case 'stopped': // Sound explicitly stopped or another sound started
                    case 'error':   // Error specific to this sound
                        button.classList.remove('active-sound-button');
                        button.setAttribute('aria-pressed', 'false');
                        // button.classList.remove('sound-button--loading');
                        break;
                    default: // Includes 'unsupported' or any other unhandled status
                        button.classList.remove('active-sound-button');
                        button.setAttribute('aria-pressed', 'false');
                        // button.classList.remove('sound-button--loading');
                }
            } else {
                // Ensure other buttons are not active and not pressed
                button.classList.remove('active-sound-button');
                button.setAttribute('aria-pressed', 'false');
                // button.classList.remove('sound-button--loading'); // If loading class is used
            }
        }
        // console.log(`UI Active Button: ${soundId}, Status: ${status}`);
    }

    // --- Initialize AudioController and Preload Sounds ---
    updatePlaybackStatus('Loading sounds...');

    let preloadingFailedCompletely = false;
    const handlePreloadError = (event) => {
        if (event.detail.message && (event.detail.message.startsWith('Failed to load any sounds') || event.detail.message.startsWith('Critical error during sound preloading'))) {
            preloadingFailedCompletely = true;
            // updatePlaybackStatus is already called by the main 'audiostatechange' listener
        }
        if (event.detail.status === 'unsupported') {
            preloadingFailedCompletely = true;
        }
    };
    document.addEventListener('audiostatechange', handlePreloadError);

    audioController.preloadAllSounds().then(preloadResult => {
        document.removeEventListener('audiostatechange', handlePreloadError);

        if (!preloadingFailedCompletely && audioController.isApiSupported()) {
            if (preloadResult.loadedCount > 0) {
                // Check if a message was already set by a 'playing' or 'paused' event during preload (unlikely but possible)
                const currentStatusMessage = playbackStatusDiv.textContent;
                if (currentStatusMessage === 'Loading sounds...' || currentStatusMessage === 'Sound preloading complete.') {
                     updatePlaybackStatus('Select a sound to play.');
                }
            } else if (Object.keys(audioController.sounds).filter(id => audioController.sounds[id].preload).length > 0) {
                // This case should be covered by the 'Failed to load any sounds' event from preloadAllSounds.
                // If for some reason it's not, set a fallback.
                if (playbackStatusDiv.textContent === 'Sound preloading complete.' || playbackStatusDiv.textContent === 'Loading sounds...') {
                    updatePlaybackStatus('No sounds available to play. Please try again later.');
                }
            } else { // No sounds configured to preload
                 if (playbackStatusDiv.textContent === 'Loading sounds...' || playbackStatusDiv.textContent === 'Sound preloading complete.') {
                    updatePlaybackStatus('No sounds configured for preloading.');
                 }
            }
        } else if (!audioController.isApiSupported()) {
            // Message already set by 'unsupported' event, handled by the main audiostatechange listener
        }
        // If preloadingFailedCompletely is true, an error message is already set by the event listener.
    }).catch(error => {
        document.removeEventListener('audiostatechange', handlePreloadError);
        if (audioController.isApiSupported()){
          updatePlaybackStatus('Error initializing application.');
        }
        console.error("Error initializing audio preloader:", error);
    });


    // --- Debounce Utility ---
    let debounceTimeout;
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // --- Event Handlers ---
    const handleSoundButtonClick = (event) => {
        if (event.target.tagName === 'BUTTON') {
            const clickedSoundId = event.target.dataset.sound;
            // Basic check, AudioController will also validate
            if (!clickedSoundId) return;

            const currentAudioState = audioController.getCurrentSoundInfo();

            if (audioController.audioContext.state === 'suspended') {
                audioController.resume();
                // If the context was suspended and user clicks a different sound, play it.
                // If it's the same sound, resuming the context should be enough.
                // If it was the same sound but was "stopped" while suspended, play it.
                if (!currentAudioState || clickedSoundId !== currentAudioState.id || !currentAudioState.isPlaying) {
                    audioController.play(clickedSoundId);
                }
            } else if (currentAudioState && clickedSoundId === currentAudioState.id && currentAudioState.isPlaying) {
                audioController.pause();
            } else {
                audioController.play(clickedSoundId);
            }
            // Direct UI updates removed from here. They will be handled by the 'audiostatechange' event listener.
        }
    };

    // --- Event Listeners ---
    if (soundButtonsContainer) {
        soundButtonsContainer.addEventListener('click', debounce(handleSoundButtonClick, 300));
    }

    document.addEventListener('audiostatechange', (event) => {
        const { status, soundId, message } = event.detail;

        if (message) { // Message always comes from AudioController now
            updatePlaybackStatus(message);
        }

        updateActiveButton(soundId, status);

        if (status === 'unsupported') {
            if (soundButtonsContainer) {
                Array.from(soundButtonsContainer.getElementsByTagName('button')).forEach(btn => btn.disabled = true);
            }
            if (volumeSlider) volumeSlider.disabled = true;
        }
    });

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            const volumeValue = parseFloat(event.target.value);
            audioController.setVolume(volumeValue);

            // Update ARIA value for volume slider
            const currentVolumePercent = Math.round(volumeValue * 100);
            volumeSlider.setAttribute('aria-valuenow', currentVolumePercent.toString());
            volumeSlider.setAttribute('aria-valuetext', `Volume ${currentVolumePercent}%`);

            // Save preferences to localStorage
            try {
                const prefs = JSON.parse(localStorage.getItem('soundscape-preferences')) || {};
                prefs.volume = volumeValue; // raw linear value
                prefs.lastUsed = new Date().toISOString();
                prefs.version = "1.0";
                localStorage.setItem('soundscape-preferences', JSON.stringify(prefs));
            } catch (lsError) {
                console.warn("Could not save preferences to localStorage:", lsError);
            }
        });
    }

    // ESC Key to Pause Sound
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const currentAudioState = audioController.getCurrentSoundInfo();
            if (currentAudioState && currentAudioState.isPlaying) {
                audioController.pause(); // This will dispatch an 'audiostatechange' event for UI updates
            }
        }
    });

    // --- Initial UI & ARIA Setup ---
    // updatePlaybackStatus('Select a sound to play.'); // Handled by events or initial check after preload

    // Initialize aria-pressed for all sound buttons
    if (soundButtonsContainer) {
        const buttons = soundButtonsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            button.setAttribute('aria-pressed', 'false');
        }
    }
    // updateActiveButton(null, null); // Initial state: no button active, no specific status

    // Load volume from localStorage or set default, then apply
    let initialVolume = 0.7; // Default volume
    const localStorageKey = 'soundscape-preferences';
    const currentAppVersion = "1.0";

    try {
        const savedPrefsString = localStorage.getItem(localStorageKey);
        if (savedPrefsString) {
            const savedPrefs = JSON.parse(savedPrefsString);

            if (savedPrefs && savedPrefs.version === currentAppVersion && typeof savedPrefs.volume === 'number') {
                const parsedVolume = parseFloat(savedPrefs.volume);
                if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
                    initialVolume = parsedVolume;
                    console.log(`Loaded volume ${initialVolume} from preferences (lastUsed: ${savedPrefs.lastUsed}, version: ${savedPrefs.version})`);
                } else {
                    console.warn("Invalid saved volume value in preferences, using default and removing item.");
                    localStorage.removeItem(localStorageKey); // Remove invalid item
                }
            } else if (savedPrefs && savedPrefs.version !== currentAppVersion) {
                console.warn(`Preference version mismatch (found ${savedPrefs.version}, expected ${currentAppVersion}), using default volume and resetting prefs.`);
                localStorage.removeItem(localStorageKey); // Clear old version
            } else {
                 console.warn("Preference data invalid or missing fields, using default volume and resetting prefs.");
                 localStorage.removeItem(localStorageKey); // Clear invalid data
            }
        }
    } catch (lsError) {
        console.warn("Could not load preferences from localStorage, using default:", lsError);
        // Potentially clear corrupted item, especially if parsing failed
        if (lsError.name === 'SyntaxError' || lsError instanceof TypeError) { // Added TypeError for robustness
           localStorage.removeItem(localStorageKey);
           console.log("Removed corrupted preferences item from localStorage.");
        }
    }

    // Apply the determined initial volume
    if (volumeSlider) {
        volumeSlider.value = initialVolume.toString();
    }
    // Set initial volume in AudioController
    audioController.setVolume(initialVolume);

    // Initialize ARIA value for volume slider
    if (volumeSlider) {
        const appliedVolumePercent = Math.round(initialVolume * 100);
        volumeSlider.setAttribute('aria-valuenow', appliedVolumePercent.toString());
        volumeSlider.setAttribute('aria-valuetext', `Volume ${appliedVolumePercent}%`);
    }
});
