// src/js/audio/AudioController.js
/**
 * Manages all Web Audio API logic, sound loading, playback controls, and volume.
 */
export class AudioController {
    /**
     * Initializes the AudioContext, master gain node, and sound definitions.
     * @throws {Error} If the Web Audio API is not supported in the browser.
     */
    constructor() {
        this.audioContext = null;
        this.masterGainNode = null;
        /** @type {Object.<string, SoundDefinition>} */
        this.sounds = {
            sereneView: { id: 'sereneView', name: 'Serene View', filePath: '/assets/audio/serene-view.mp3', fallbackPath: '', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            valleySunset: { id: 'valleySunset', name: 'Valley Sunset', filePath: '/assets/audio/valley-sunset.mp3', fallbackPath: '', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            meditationMusic: { id: 'meditationMusic', name: 'Meditation Music', filePath: '/assets/audio/meditation-music.mp3', fallbackPath: '', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            softPiano: { id: 'softPiano', name: 'Soft Piano Calm', filePath: '/assets/audio/soft-piano-calm.mp3', fallbackPath: '', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            peacefulRelaxing: { id: 'peacefulRelaxing', name: 'Peaceful And Relaxing', filePath: '/assets/audio/peaceful-relaxing.mp3', fallbackPath: '', duration: 0, preload: true, audioBuffer: null, sourceNode: null }
        };
        /** @type {string|null} */
        this.currentSoundId = null;
        /** @type {boolean} */
        this.isPlaying = false;
        /** @type {Object.<string, boolean>} */
        this.loadingStates = {};

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.connect(this.audioContext.destination);
        } catch (e) {
            console.error("Web Audio API is not supported.", e);
            this._dispatchEvent('unsupported', null, "Audio playback not supported by this browser.");
            throw new Error("Web Audio API not supported");
        }
    }

    /**
     * Dispatches a custom 'audiostatechange' event.
     * @param {string} status - The current audio state (e.g., 'loading', 'playing', 'paused', 'error').
     * @param {string|null} [soundId=null] - The ID of the sound related to the event.
     * @param {string} [message=''] - An optional message associated with the event.
     * @private
     */
    _dispatchEvent(status, soundId = null, message = '') {
        const detail = { status, soundId };
        if (message) detail.message = message;
        else if (soundId && this.sounds[soundId]) {
            const soundName = this.sounds[soundId].name;
            if (status === 'loading') detail.message = `Loading ${soundName}...`;
            else if (status === 'loaded') detail.message = `Loaded: ${soundName}`;
            else if (status === 'playing') detail.message = `Playing: ${soundName}`;
            else if (status === 'paused') detail.message = `Paused: ${soundName}`;
            else if (status === 'resumed') detail.message = `Playing: ${soundName}`;
            else if (status === 'error') detail.message = `Error with ${soundName}.`;
            else if (status === 'info') detail.message = 'Information update.'; // Generic info
        }

        document.dispatchEvent(new CustomEvent('audiostatechange', { detail }));
    }

    /**
     * Loads a single audio file, decodes it, and stores the buffer.
     * Attempts to load from a fallback path if the primary path fails.
     * Dispatches 'loading', 'loaded', or 'error' events.
     * @param {string} soundId - The ID of the sound to load.
     * @param {boolean} [useFallback=false] - Whether to attempt loading the fallback path.
     * @returns {Promise<AudioBuffer|null>} The decoded AudioBuffer or null if loading fails.
     * @private
     */
    async _loadSingleSound(soundId, useFallback = false) {
        const sound = this.sounds[soundId];
        if (!sound) {
            console.error(`Unknown sound ID: ${soundId}`);
            this._dispatchEvent('error', soundId, `Unknown sound ID: ${soundId}`);
            throw new Error(`Unknown sound ID: ${soundId}`);
        }

        if (sound.audioBuffer && !useFallback) {
            return sound.audioBuffer;
        }
        if (sound.audioBuffer && useFallback) {
            return sound.audioBuffer;
        }

        const path = useFallback ? sound.fallbackPath : sound.filePath;
        if (!path) {
            const errMessage = useFallback ? `No fallback path for ${sound.name}.` : `No primary path for ${sound.name}.`;
            console.warn(errMessage);
            if (!useFallback && sound.fallbackPath) {
                 return await this._loadSingleSound(soundId, true);
            }
            this._dispatchEvent('error', soundId, errMessage);
            return null;
        }

        this.loadingStates[soundId] = true;
        if (!useFallback) {
            this._dispatchEvent('loading', soundId);
        }
        console.log(`Loading ${sound.name} from ${path}...`);

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${path}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            sound.audioBuffer = decodedBuffer;
            console.log(`Successfully loaded and decoded ${sound.name} from ${path}`);
            this._dispatchEvent('loaded', soundId);
            return sound.audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${sound.name} from ${path}:`, error);
            sound.audioBuffer = null;

            if (!useFallback && sound.fallbackPath) {
                console.log(`Attempting to load fallback for ${sound.name} from ${sound.fallbackPath}`);
                const fallbackBuffer = await this._loadSingleSound(soundId, true);
                if (fallbackBuffer) return fallbackBuffer;
                this._dispatchEvent('error', soundId, `Failed to load ${sound.name} (primary and fallback).`);
                return null;
            }
            this._dispatchEvent('error', soundId, `Error loading ${sound.name} from ${path}.`);
            return null;
        } finally {
            this.loadingStates[soundId] = false;
        }
    }

    /**
     * Preloads all sounds that are marked with `preload: true` in their definitions.
     * Dispatches 'info' or 'error' events based on the overall outcome.
     * @returns {Promise<{success: boolean, loadedCount: number}>} An object indicating if preloading was generally successful and how many sounds were loaded.
     */
    async preloadAllSounds() {
        console.log("Starting preloading for all sounds marked for preload...");
        const preloadPromises = [];
        for (const soundId in this.sounds) {
            const sound = this.sounds[soundId];
            if (sound.preload && !sound.audioBuffer) {
                preloadPromises.push(this._loadSingleSound(soundId).catch(e => {
                    console.error(`Preloading failed for ${sound.name}: ${e.message}`);
                    return null;
                }));
            }
        }

        try {
            const results = await Promise.all(preloadPromises);
            const successfulLoads = results.filter(buffer => buffer !== null).length;
            // const failedLoads = results.length - successfulLoads; // Not directly used, but good for logging
            console.log(`${successfulLoads} sounds successfully preloaded.`);

            if (successfulLoads === 0 && Object.keys(this.sounds).filter(id => this.sounds[id].preload).length > 0) {
                this._dispatchEvent('error', null, 'Failed to load any sounds. Please try again.');
                return { success: false, loadedCount: 0 };
            }
            this._dispatchEvent('info', null, 'Sound preloading complete.');
            return { success: true, loadedCount: successfulLoads };
        } catch (error) {
            console.error("Error during preloading sounds:", error);
            this._dispatchEvent('error', null, 'Critical error during sound preloading.');
            return { success: false, loadedCount: 0 };
        }
    }

    /**
     * Plays the sound specified by soundId.
     * If another sound is playing, it's stopped first.
     * If the audio context is suspended, it attempts to resume it.
     * Loads the sound if it's not already buffered.
     * Dispatches 'playing' or 'error' events.
     * @param {string} soundId - The ID of the sound to play.
     */
    play(soundId) {
        if (!this.sounds[soundId]) {
            console.error(`Sound ID ${soundId} not found.`);
            this._dispatchEvent('error', soundId, `Sound ID ${soundId} not found.`);
            return;
        }

        console.log(`Request to play sound: ${soundId}. Current context state: ${this.audioContext.state}`);

        const startPlayback = () => {
            if (this.audioContext.state === 'running') {
                this._playInternal(soundId);
            } else {
                console.warn(`AudioContext not running when trying to play ${soundId}. State: ${this.audioContext.state}`);
                this._dispatchEvent('error', soundId, `Audio system not ready. Please interact with the page and try again.`);
            }
        };

        if (this.audioContext.state === 'suspended') {
            console.log("AudioContext is suspended. Attempting to resume...");
            this.audioContext.resume()
                .then(() => {
                    console.log("AudioContext resumed successfully.");
                    startPlayback();
                })
                .catch(err => {
                    console.error("Error resuming AudioContext:", err);
                    this._dispatchEvent('error', soundId, "Could not resume audio. Please interact with the page.");
                });
        } else {
            startPlayback();
        }
    }

    /**
     * Internal method to handle actual playback logic once context is confirmed running.
     * @param {string} soundId - The ID of the sound to play.
     * @private
     */
    async _playInternal(soundId) {
        const soundToPlay = this.sounds[soundId];
        const oldSoundId = this.currentSoundId;

        // Stop any currently playing sound
        if (oldSoundId && this.sounds[oldSoundId] && this.sounds[oldSoundId].sourceNode) {
            if (oldSoundId === soundId) {
                console.log(`Sound ${soundToPlay.name} is already current. Restarting.`);
                try { this.sounds[oldSoundId].sourceNode.stop(); } catch (e) { /* ignore */ }
                this.sounds[oldSoundId].sourceNode = null;
            } else {
                console.log(`Switching from ${this.sounds[oldSoundId].name} to ${soundToPlay.name}.`);
                try { this.sounds[oldSoundId].sourceNode.stop(); } catch (e) { /* ignore */ }
                this.sounds[oldSoundId].sourceNode = null;
                this._dispatchEvent('stopped', oldSoundId);
            }
        }
        this.isPlaying = false;

        if (!soundToPlay.audioBuffer) {
            const buffer = await this._loadSingleSound(soundId);
            if (!buffer) {
                this.currentSoundId = null;
                return;
            }
        }

        if (this.audioContext.state !== 'running') {
            console.warn(`AudioContext not running when trying to start source for ${soundToPlay.name}. Playback aborted.`);
            this._dispatchEvent('error', soundId, `Audio system not ready. Try again.`);
            this.currentSoundId = null;
            return;
        }

        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = soundToPlay.audioBuffer;
        sourceNode.loop = true;
        sourceNode.connect(this.masterGainNode);

        try {
            sourceNode.start(0);
            soundToPlay.sourceNode = sourceNode;
            this.currentSoundId = soundId;
            this.isPlaying = true;
            this._dispatchEvent('playing', this.currentSoundId);
        } catch (e) {
            console.error(`Error starting source node for ${soundToPlay.name}:`, e);
            this._dispatchEvent('error', soundId, `Error playing ${soundToPlay.name}.`);
            this.currentSoundId = null;
            this.isPlaying = false;
            if (soundToPlay.sourceNode) {
                 soundToPlay.sourceNode.disconnect();
                 soundToPlay.sourceNode = null;
            }
        }
    }

    /**
     * Pauses the currently playing sound by suspending the AudioContext.
     * Dispatches 'paused' or 'error' events.
     */
    pause() {
        if (this.isPlaying && this.currentSoundId && this.sounds[this.currentSoundId] && this.sounds[this.currentSoundId].sourceNode) {
            if (this.audioContext.state === 'running') {
                this.audioContext.suspend()
                    .then(() => {
                        this.isPlaying = false;
                        this._dispatchEvent('paused', this.currentSoundId);
                    })
                    .catch(err => {
                        console.error("Error suspending AudioContext:", err);
                        this._dispatchEvent('error', this.currentSoundId, "Error pausing sound.");
                    });
            } else {
                console.warn(`Cannot pause: AudioContext is not in a running state (current: ${this.audioContext.state}).`);
            }
        }
    }

    /**
     * Resumes playback if a sound was paused and the AudioContext was suspended.
     * Dispatches 'resumed' or 'error' events.
     */
    resume() {
        if (this.currentSoundId && this.audioContext.state === 'suspended') {
            console.log(`Attempting to resume AudioContext for ${this.sounds[this.currentSoundId].name}...`);
            this.audioContext.resume()
                .then(() => {
                    this.isPlaying = true;
                    this._dispatchEvent('resumed', this.currentSoundId);

                    if (!this.sounds[this.currentSoundId].sourceNode ||
                        (this.sounds[this.currentSoundId].sourceNode && typeof this.sounds[this.currentSoundId].sourceNode.playbackState !== 'undefined' && this.sounds[this.currentSoundId].sourceNode.playbackState === AudioBufferSourceNode.FINISHED_STATE) ) {
                        console.log('Source node seems to have finished or is invalid, restarting playback for resume.');
                        this._playInternal(this.currentSoundId);
                    }
                })
                .catch(err => {
                    console.error("Error resuming AudioContext:", err);
                    this._dispatchEvent('error', this.currentSoundId, "Error resuming sound.");
                });
        } else if (this.audioContext.state === 'suspended') {
             this.audioContext.resume()
                .then(() => console.log("AudioContext resumed generally."))
                .catch(err => console.error("Error resuming general AudioContext:", err));
        }
    }

    /**
     * Sets the master volume for audio playback.
     * Applies an exponential curve to the raw linear value for a more natural perceived loudness.
     * @param {number} rawValue - The raw linear volume level (0.0 to 1.0).
     */
    setVolume(rawValue) {
        if (this.masterGainNode && this.audioContext) {
            const parsedValue = parseFloat(rawValue);
            if (isNaN(parsedValue)) {
                console.warn("Invalid volume value received:", rawValue);
                return;
            }
            const clampedValue = Math.max(0, Math.min(1, parsedValue));
            const exponentialValue = Math.pow(clampedValue, 2);

            try {
                this.masterGainNode.gain.linearRampToValueAtTime(exponentialValue, this.audioContext.currentTime + 0.02);
            } catch (e) {
                console.warn("linearRampToValueAtTime failed, setting value directly:", e);
                this.masterGainNode.gain.value = exponentialValue;
            }
        }
    }

    /**
     * Gets information about the currently active or last played sound.
     * @returns {{id: string, name: string, isPlaying: boolean}|null} Information about the current sound, or null if none.
     */
    getCurrentSoundInfo() {
        if (!this.currentSoundId) return null;
        const sound = this.sounds[this.currentSoundId];
        return {
            id: sound.id,
            name: sound.name,
            isPlaying: this.isPlaying,
        };
    }

    /**
     * Checks if the Web Audio API is supported and the AudioContext was initialized.
     * @returns {boolean} True if supported and initialized, false otherwise.
     */
    isApiSupported() {
        return !!this.audioContext;
    }
}

/**
 * @typedef {Object} SoundDefinition
 * @property {string} id - Unique identifier for the sound.
 * @property {string} name - Display name for the sound.
 * @property {string} filePath - Primary audio file path (e.g., MP3).
 * @property {string} fallbackPath - Fallback audio file path (e.g., OGG).
 * @property {number} duration - Duration of the sound in seconds (can be placeholder).
 * @property {boolean} preload - Whether to preload this sound.
 * @property {AudioBuffer|null} audioBuffer - Stores the decoded audio data.
 * @property {AudioBufferSourceNode|null} sourceNode - Stores the currently playing source node for this sound.
 */
