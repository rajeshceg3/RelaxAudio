// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const soundButtonsContainer = document.getElementById('sound-selection-container');
    const volumeSlider = document.getElementById('volumeSlider');
    const playbackStatusDiv = document.getElementById('playbackStatus');
    // Note: const audioPlayer = document.getElementById('audioPlayer'); // Not directly used for Web Audio API control

    // --- Web Audio API Setup ---
    let audioContext;
    let masterGainNode;
    // Try-catch for browser compatibility (older Safari versions)
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        // Initial volume will be set after checking localStorage
    } catch (e) {
        console.error("Web Audio API is not supported in this browser.", e);
        playbackStatusDiv.textContent = "Audio playback not supported by this browser.";
        // Disable all audio controls if Web Audio API is not supported
        if(soundButtonsContainer) {
            Array.from(soundButtonsContainer.getElementsByTagName('button')).forEach(btn => btn.disabled = true);
        }
        if(volumeSlider) volumeSlider.disabled = true;
        return; // Stop further execution
    }


    // --- Sound Data & State ---
    const sounds = {
        rain: { id: 'rain', filePath: 'rain.mp3', displayName: 'Rain', audioBuffer: null, sourceNode: null },
        ocean: { id: 'ocean', filePath: 'waves.mp3', displayName: 'Ocean Waves', audioBuffer: null, sourceNode: null },
        wind: { id: 'wind', filePath: 'wind.mp3', displayName: 'Wind', audioBuffer: null, sourceNode: null },
    };
    let currentSoundId = null; // ID of the currently playing/paused sound
    // let isLoading = false; // Replaced by loadingStates
    let loadingStates = {}; // Tracks loading state per soundId

    // --- UI Update Functions ---
    function updatePlaybackStatus(message) {
        if (playbackStatusDiv) {
            playbackStatusDiv.textContent = message;
        }
    }

    function updateActiveButton(playingSoundId) {
        if (!soundButtonsContainer) return;
        const buttons = soundButtonsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            const isCurrentButton = button.dataset.sound === playingSoundId;
            if (isCurrentButton) {
                button.classList.add('active-sound-button');
                button.setAttribute('aria-pressed', 'true');
            } else {
                button.classList.remove('active-sound-button');
                button.setAttribute('aria-pressed', 'false');
            }
        }
    }


    // --- Audio Loading ---
    async function loadSound(soundId) {
        if (!sounds[soundId]) {
            console.error("Unknown soundId:", soundId);
            updatePlaybackStatus(`Error: Unknown sound ${soundId}.`);
            return null;
        }
        if (sounds[soundId].audioBuffer) { // Already loaded
            return sounds[soundId].audioBuffer;
        }
        if (loadingStates[soundId]) { // Currently loading this specific sound
            console.log(`Already attempting to load ${sounds[soundId].displayName}.`);
            // updatePlaybackStatus(`Still loading ${sounds[soundId].displayName}...`); // Optional: give feedback
            return null;
        }

        loadingStates[soundId] = true;
        // currentSoundId should not be set here, only when play actually starts or is intended.
        updatePlaybackStatus(`Loading ${sounds[soundId].displayName}...`);
        try {
            const response = await fetch(sounds[soundId].filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${sounds[soundId].filePath}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            // decodeAudioData can throw an error if the audio format is not supported or the file is corrupt
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            sounds[soundId].audioBuffer = audioBuffer;
            updatePlaybackStatus(`Loaded: ${sounds[soundId].displayName}.`);
            // isLoading = false; // Handled by loadingStates
            loadingStates[soundId] = false;
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${soundId}:`, error);
            updatePlaybackStatus(`Error loading ${sounds[soundId].displayName}.`);
            // isLoading = false; // Handled by loadingStates
            loadingStates[soundId] = false;
            sounds[soundId].audioBuffer = null; // Mark as not loaded
            updateActiveButton(null); // Ensure no button is active if loading fails
            return null;
        }
    }

    // --- Playback Controls ---
    function playSound(soundId) {
        if (!audioContext || !sounds[soundId]) {
            console.error("Cannot play sound: missing context or sound data for ID", soundId);
            updatePlaybackStatus("Error: Sound data not found.");
            updateActiveButton(null);
            return;
        }

        // Set the target sound ID immediately, so UI can reflect intent
        // currentSoundId = soundId; // This will be set in startSourceNode after successful start

        const playLogic = (audioBuffer) => {
            if (!audioBuffer) {
                updatePlaybackStatus(`Cannot play ${sounds[soundId].displayName}: audio data missing.`);
                updateActiveButton(null); // Clear active button if buffer is not available
                // Attempt to load again if buffer is null but soundId is valid
                if(sounds[soundId] && !sounds[soundId].audioBuffer && !loadingStates[soundId]) {
                    console.log("Retrying load for", soundId);
                    // updatePlaybackStatus(`Retrying load for ${sounds[soundId].displayName}...`);
                    loadSound(soundId).then(reloadedBuffer => {
                        if(reloadedBuffer) playLogic(reloadedBuffer);
                        // If reloadedBuffer is null, an error message was already set by loadSound
                    });
                }
                return;
            }

            // Stop any currently playing sound ONLY if it's different from the new one
            if (currentSoundId && currentSoundId !== soundId && sounds[currentSoundId] && sounds[currentSoundId].sourceNode) {
                try {
                    sounds[currentSoundId].sourceNode.stop();
                } catch (e) { /* Ignore if already stopped */ }
                sounds[currentSoundId].sourceNode = null;
            }
             // If the same sound is re-triggered, stop the old source before creating a new one
            else if (currentSoundId === soundId && sounds[soundId].sourceNode) {
                 try {
                    sounds[soundId].sourceNode.stop(); // Stop existing source if playing same sound again
                } catch (e) { /* Ignore */ }
                sounds[soundId].sourceNode = null;
            }
            // If a different sound is playing, its button will be deactivated when the new one starts.

            // Ensure context is running
            if (audioContext.state === 'suspended') {
                // Indicate intent to play this sound upon resume
                currentSoundId = soundId;
                updateActiveButton(currentSoundId); // Show active button for the sound that will play
                updatePlaybackStatus(`Resuming to play ${sounds[soundId].displayName}...`);
                audioContext.resume().then(() => {
                    // Check if the soundId to play is still the one intended
                    if (currentSoundId === soundId) {
                        startSourceNode(soundId, audioBuffer);
                    } else {
                        // Another sound was selected in the meantime, playLogic for that sound will handle it.
                        // This can happen if user clicks another button very quickly.
                        console.log("Sound selection changed while resuming. New sound will be handled.");
                         // updateActiveButton(null); // Or let the new sound's playLogic handle active button
                    }
                });
            } else {
                startSourceNode(soundId, audioBuffer);
            }
        };

        if (!sounds[soundId].audioBuffer) {
            // updatePlaybackStatus(`Loading ${sounds[soundId].displayName} for playback...`); // loadSound already does this
            // Tentatively mark this as the button that might become active
            // updateActiveButton(soundId); // No, do this only when it's certain to play or is current target
            loadSound(soundId).then(loadedBuffer => {
                if (loadedBuffer) playLogic(loadedBuffer);
                // If loadedBuffer is null, loadSound already set an error message and cleared active button
            });
        } else {
            playLogic(sounds[soundId].audioBuffer); // Already loaded, just play
        }
    }

    function startSourceNode(soundId, audioBuffer) {
        if (audioContext.state !== 'running') {
            console.warn("AudioContext not running. Cannot start source node for", soundId);
            updatePlaybackStatus(`Audio system paused. Resume to play ${sounds[soundId].displayName}.`);
            currentSoundId = soundId; // Set as intent, button will be updated if needed by resume logic
            updateActiveButton(soundId); // Show this button as active target
            return;
        }

        // If there's an existing source for this soundId (e.g. from a previous play attempt that was paused/stopped uncleanly), clear it.
        if (sounds[soundId] && sounds[soundId].sourceNode) { // Check specific soundId, not currentSoundId
             try { sounds[soundId].sourceNode.stop(); } catch(e) {/* Already stopped or invalid state */}
             sounds[soundId].sourceNode = null;
        }

        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.loop = true;
        sourceNode.connect(masterGainNode);
        try {
            sourceNode.start(0);
        } catch (e) {
            console.error("Error starting source node:", e);
            updatePlaybackStatus(`Error playing ${sounds[soundId].displayName}.`);
            updateActiveButton(null); // Clear active button on error
            if (currentSoundId === soundId) { // If this was the intended sound
                currentSoundId = null;
            }
            return;
        }

        sounds[soundId].sourceNode = sourceNode;
        currentSoundId = soundId; // This is the actively playing sound
        updatePlaybackStatus(`Playing: ${sounds[soundId].displayName}`);
        updateActiveButton(currentSoundId);
    }

    function pauseSound() {
        if (audioContext && audioContext.state === 'running' && currentSoundId && sounds[currentSoundId] && sounds[currentSoundId].sourceNode) {
            audioContext.suspend().then(() => {
                updatePlaybackStatus(`Paused: ${sounds[currentSoundId].displayName}`);
                // Update aria-pressed for the paused button
                if (soundButtonsContainer) {
                    const button = soundButtonsContainer.querySelector(`button[data-sound="${currentSoundId}"]`);
                    if (button) {
                        button.setAttribute('aria-pressed', 'false');
                        // Class 'active-sound-button' remains as per previous requirement to keep it highlighted.
                    }
                }
            });
        }
    }

    function resumeSound() {
        if (audioContext && audioContext.state === 'suspended') {
            // currentSoundId should reflect the sound that was playing or was intended to play.
            // The button for currentSoundId should already be active.
            if (currentSoundId && sounds[currentSoundId]) {
                updatePlaybackStatus(`Resuming: ${sounds[currentSoundId].displayName}...`);
                audioContext.resume().then(() => {
                    updatePlaybackStatus(`Playing: ${sounds[currentSoundId].displayName}`);
                    // Ensure the source node is playing. If context was suspended *before* source.start(),
                    // it might not auto-play. If it was suspended *after* source.start(), it should resume.
                    // The Web Audio API should handle resuming the source node if it was already started.
                    // If sounds[currentSoundId].sourceNode is null or not playing, playSound will create/start it.
                    if (!sounds[currentSoundId].sourceNode || sounds[currentSoundId].sourceNode.playbackState !== AudioBufferSourceNode.PLAYING_STATE) {
                        // This typically means the source was never started or was stopped.
                        // Re-initiate play for the current sound.
                        playSound(currentSoundId);
                    }
                    // If it is playing, the status update is correct. Button is already active.
                });
            } else {
                // No specific sound was active, just resume context
                audioContext.resume().then(() => {
                    updatePlaybackStatus("Resumed. Select a sound.");
                    updateActiveButton(null); // No sound is active
                });
            }
        }
    }

    // --- Event Listeners ---
    if (soundButtonsContainer) {
        soundButtonsContainer.addEventListener('click', (event) => {
            if (event.target.tagName === 'BUTTON') {
                const clickedSoundId = event.target.dataset.sound;
                if (!clickedSoundId || !sounds[clickedSoundId]) {
                    console.warn("Button clicked for unknown sound:", clickedSoundId);
                    return;
                }

                // If context needs user interaction to start/resume
                if (audioContext.state === 'suspended') {
                    // If the click is on the already "active" (even if paused) sound, resume it.
                    if (clickedSoundId === currentSoundId) {
                        resumeSound();
                    } else {
                        // Clicked a new sound while context is suspended.
                        // playSound will handle resuming context and then starting the new sound.
                        // currentSoundId will be updated by playSound/startSourceNode.
                        // The active button will be updated by playSound/startSourceNode.
                        playSound(clickedSoundId);
                    }
                } else if (clickedSoundId === currentSoundId) { // Clicked on the currently playing sound
                    if (sounds[clickedSoundId].sourceNode) { // And it's actually playing/has a source
                        pauseSound();
                    } else {
                        // Sound was current, but not playing (e.g. error, or finished - not for looped)
                        playSound(clickedSoundId); // Try to play it again
                    }
                } else { // Clicked on a new sound (and context is running)
                    playSound(clickedSoundId);
                }
            }
        });
    }

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (event) => {
            if (masterGainNode) {
                const volumeValue = parseFloat(event.target.value);
                masterGainNode.gain.value = volumeValue;

                // Update ARIA value for volume slider
                const currentVolumePercent = Math.round(volumeValue * 100);
                volumeSlider.setAttribute('aria-valuenow', currentVolumePercent.toString());

                // Save volume to localStorage
                try {
                    localStorage.setItem('soundscape-volume-preference', volumeValue.toString());
                } catch (lsError) {
                    console.warn("Could not save volume to localStorage:", lsError);
                }
            }
        });
    }

    // ESC Key to Pause Sound
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (audioContext && audioContext.state === 'running' && currentSoundId && sounds[currentSoundId] && sounds[currentSoundId].sourceNode) {
                pauseSound();
            }
        }
    });

    // Initial UI & ARIA setup
    updatePlaybackStatus('Select a sound to play.');

    // Initialize aria-pressed for all sound buttons
    if (soundButtonsContainer) {
        const buttons = soundButtonsContainer.getElementsByTagName('button');
        for (let button of buttons) {
            button.setAttribute('aria-pressed', 'false');
        }
    }
    updateActiveButton(null); // Ensure no button is class-active and all aria-pressed are false initially

    // Load volume from localStorage or set default, then apply
    let initialVolume = 0.7; // Default volume as per PRD
    try {
        const savedVolume = localStorage.getItem('soundscape-volume-preference');
        if (savedVolume !== null) {
            const parsedVolume = parseFloat(savedVolume);
            if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
                initialVolume = parsedVolume;
            } else {
                console.warn("Invalid saved volume value found in localStorage, using default:", savedVolume);
                localStorage.removeItem('soundscape-volume-preference'); // Remove invalid item
            }
        }
    } catch (lsError) {
        console.warn("Could not access localStorage for volume preference:", lsError);
    }

    // Apply the determined initial volume
    if (volumeSlider) {
        volumeSlider.value = initialVolume.toString();
    }
    if (masterGainNode) {
        masterGainNode.gain.value = initialVolume;
    }

    // Initialize ARIA value for volume slider based on the applied initial volume
    if (volumeSlider) {
        const appliedVolumePercent = Math.round(initialVolume * 100);
        volumeSlider.setAttribute('aria-valuenow', appliedVolumePercent.toString());
    }

    // No sounds are preloaded by default in this version, loading happens on first play attempt.
});
