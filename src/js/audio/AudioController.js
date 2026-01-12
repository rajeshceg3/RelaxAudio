// src/js/audio/AudioController.js
import { Logger } from '../utils/Logger.js';

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

            rain: { id: 'rain', name: 'Heavy Rain', filePath: 'assets/audio/heavy-rain.mp3', fallbackPath: 'assets/audio/heavy-rain.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            ocean: { id: 'ocean', name: 'Ocean Waves', filePath: 'assets/audio/ocean-waves.mp3', fallbackPath: 'assets/audio/ocean-waves.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            wind: { id: 'wind', name: 'Strong Wind', filePath: 'assets/audio/strong-wind.mp3', fallbackPath: 'assets/audio/strong-wind.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            forest: { id: 'forest', name: 'Forest Ambience', filePath: 'assets/audio/forest-ambience.mp3', fallbackPath: 'assets/audio/forest-ambience.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
            fireplace: { id: 'fireplace', name: 'Crackling Fireplace', filePath: 'assets/audio/fireplace-crackling.mp3', fallbackPath: 'assets/audio/fireplace-crackling.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },

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
            Logger.error("Web Audio API is not supported.", e);
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
     * Helper to fetch with retries (Exponential Backoff).
     * @param {string} url - The URL to fetch.
     * @param {number} [retries=3] - Number of retries.
     * @param {number} [backoff=1000] - Initial backoff delay in ms.
     * @returns {Promise<Response>}
     * @private
     */
    async _fetchWithRetry(url, retries = 3, backoff = 1000) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // If 404, do not retry
                if (response.status === 404) throw new Error(`HTTP 404 Not Found: ${url}`);
                // Throw error to trigger catch block for retry logic
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            // Do not retry 404s
            if (error.message.includes('404')) {
                throw error;
            }
            if (retries > 0) {
                Logger.warn(`Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} attempts left). Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this._fetchWithRetry(url, retries - 1, backoff * 2);
            }
            throw error;
        }
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
            Logger.error(`Unknown sound ID: ${soundId}`);
            this._dispatchEvent('error', soundId, `Unknown sound ID: ${soundId}`);
            throw new Error(`Unknown sound ID: ${soundId}`);
        }

        // If buffer exists and we are not specifically trying a fallback, return it.
        if (sound.audioBuffer && !useFallback) {
            return sound.audioBuffer;
        }

        const path = useFallback ? sound.fallbackPath : sound.filePath;

        // If no path, and not already trying a fallback, try the fallback path.
        if (!path && !useFallback && sound.fallbackPath) {
            Logger.warn(`No primary path for ${sound.name}. Attempting fallback.`);
            return await this._loadSingleSound(soundId, true);
        } else if (!path) {
            const errMessage = `No valid file path for ${sound.name}.`;
            this._dispatchEvent('error', soundId, errMessage);
            return null;
        }

        this.loadingStates[soundId] = true;
        if (!useFallback) {
            this._dispatchEvent('loading', soundId);
        }
        Logger.log(`Loading ${sound.name} from ${path}...`);

        try {
            const response = await this._fetchWithRetry(path);
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            sound.audioBuffer = decodedBuffer;
            Logger.log(`Successfully loaded and decoded ${sound.name} from ${path}`);
            this._dispatchEvent('loaded', soundId);
            return sound.audioBuffer;
        } catch (error) {
            Logger.error(`Error loading sound ${sound.name} from ${path}:`, error);
            sound.audioBuffer = null; // Clear buffer on error

            // If the primary path failed and a fallback exists, try it.
            if (!useFallback && sound.fallbackPath) {
                Logger.warn(`Primary path failed for ${sound.name}. Attempting fallback.`);
                return await this._loadSingleSound(soundId, true);
            }

            // If fallback also fails or doesn't exist
            this._dispatchEvent('error', soundId, `Failed to load ${sound.name}.`);
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
        Logger.log("Starting preloading for all sounds marked for preload...");
        const preloadPromises = [];
        for (const soundId in this.sounds) {
            const sound = this.sounds[soundId];
            if (sound.preload && !sound.audioBuffer) {
                preloadPromises.push(this._loadSingleSound(soundId).catch(e => {
                    Logger.error(`Preloading failed for ${sound.name}: ${e.message}`);
                    return null;
                }));
            }
        }

        try {
            const results = await Promise.all(preloadPromises);
            const successfulLoads = results.filter(buffer => buffer !== null).length;
            // const failedLoads = results.length - successfulLoads; // Not directly used, but good for logging
            Logger.log(`${successfulLoads} sounds successfully preloaded.`);

            if (successfulLoads === 0 && Object.keys(this.sounds).filter(id => this.sounds[id].preload).length > 0) {
                this._dispatchEvent('error', null, 'Failed to load any sounds. Please try again.');
                return { success: false, loadedCount: 0 };
            }
            this._dispatchEvent('info', null, 'Sound preloading complete.');
            return { success: true, loadedCount: successfulLoads };
        } catch (error) {
            Logger.error("Error during preloading sounds:", error);
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
            Logger.error(`Sound ID ${soundId} not found.`);
            this._dispatchEvent('error', soundId, `Sound ID ${soundId} not found.`);
            return;
        }

        Logger.log(`Request to play sound: ${soundId}. Current context state: ${this.audioContext.state}`);

        const startPlayback = () => {
            if (this.audioContext.state === 'running') {
                this._playInternal(soundId);
            } else {
                Logger.warn(`AudioContext not running when trying to play ${soundId}. State: ${this.audioContext.state}`);
                this._dispatchEvent('error', soundId, `Audio system not ready. Please interact with the page and try again.`);
            }
        };

        if (this.audioContext.state === 'suspended') {
            Logger.log("AudioContext is suspended. Attempting to resume...");
            this.audioContext.resume()
                .then(() => {
                    Logger.log("AudioContext resumed successfully.");
                    startPlayback();
                })
                .catch(err => {
                    Logger.error("Error resuming AudioContext:", err);
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
        const FADE_DURATION = 0.5; // seconds

        // Stop any currently playing sound with a fade out
        if (oldSoundId && this.sounds[oldSoundId] && this.sounds[oldSoundId].sourceNode) {
            const oldSource = this.sounds[oldSoundId].sourceNode;
            const oldGain = this.sounds[oldSoundId].gainNode;

            if (oldSoundId === soundId) {
                Logger.log(`Sound ${soundToPlay.name} is already current. Restarting.`);
                // For restart, maybe a quick crossfade or just stop and start
                // Let's fade out the old one
                if (oldGain) {
                    try {
                        oldGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
                    } catch (_e) { /* ignore */ }
                }
                try { oldSource.stop(this.audioContext.currentTime + 0.1); } catch (_e) { /* ignore */ }

                this.sounds[oldSoundId].sourceNode = null;
                this.sounds[oldSoundId].gainNode = null;
                this._dispatchEvent('stopped', oldSoundId);
            } else {
                Logger.log(`Switching from ${this.sounds[oldSoundId].name} to ${soundToPlay.name}.`);
                // Crossfade: Fade out old sound
                 if (oldGain) {
                    try {
                        oldGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + FADE_DURATION);
                    } catch (_e) { /* ignore */ }
                }
                try { oldSource.stop(this.audioContext.currentTime + FADE_DURATION); } catch (_e) { /* ignore */ }

                this.sounds[oldSoundId].sourceNode = null;
                this.sounds[oldSoundId].gainNode = null;
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
            Logger.warn(`AudioContext not running when trying to start source for ${soundToPlay.name}. Playback aborted.`);
            this._dispatchEvent('error', soundId, `Audio system not ready. Try again.`);
            this.currentSoundId = null;
            return;
        }

        const sourceNode = this.audioContext.createBufferSource();
        sourceNode.buffer = soundToPlay.audioBuffer;
        sourceNode.loop = true;

        // Create a gain node for this specific sound to handle its fade in/out independently
        const soundGainNode = this.audioContext.createGain();
        soundGainNode.gain.value = 0; // Start at 0 for fade in

        sourceNode.connect(soundGainNode);
        soundGainNode.connect(this.masterGainNode);

        try {
            sourceNode.start(0);
            // Fade in
            soundGainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + FADE_DURATION);

            soundToPlay.sourceNode = sourceNode;
            soundToPlay.gainNode = soundGainNode; // Store gain node reference

            this.currentSoundId = soundId;
            this.isPlaying = true;
            this._dispatchEvent('playing', this.currentSoundId);
        } catch (e) {
            Logger.error(`Error starting source node for ${soundToPlay.name}:`, e);
            this._dispatchEvent('error', soundId, `Error playing ${soundToPlay.name}.`);
            this.currentSoundId = null;
            this.isPlaying = false;
            if (soundToPlay.sourceNode) {
                 soundToPlay.sourceNode.disconnect();
                 soundToPlay.sourceNode = null;
            }
            if (soundToPlay.gainNode) {
                soundToPlay.gainNode.disconnect();
                soundToPlay.gainNode = null;
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
                        Logger.error("Error suspending AudioContext:", err);
                        this._dispatchEvent('error', this.currentSoundId, "Error pausing sound.");
                    });
            } else {
                Logger.warn(`Cannot pause: AudioContext is not in a running state (current: ${this.audioContext.state}).`);
            }
        }
    }

    /**
     * Resumes playback if a sound was paused and the AudioContext was suspended.
     * Dispatches 'resumed' or 'error' events.
     */
    resume() {
        if (this.currentSoundId && this.audioContext.state === 'suspended') {
            Logger.log(`Attempting to resume AudioContext for ${this.sounds[this.currentSoundId].name}...`);
            this.audioContext.resume()
                .then(() => {
                    Logger.log('AudioContext resumed. Re-playing sound.');
                    // Don't just resume context, but re-trigger play to ensure a fresh source node.
                    // _playInternal will dispatch 'playing', but we also want 'resumed' for the UI/Tests
                     this._playInternal(this.currentSoundId).then(() => {
                         this._dispatchEvent('resumed', this.currentSoundId);
                     });
                })
                .catch(err => {
                    Logger.error("Error resuming AudioContext:", err);
                    this._dispatchEvent('error', this.currentSoundId, "Error resuming sound.");
                });
        } else if (this.audioContext.state === 'suspended') {
            // If no sound is active, just resume the context for future plays.
            this.audioContext.resume()
               .then(() => Logger.log("AudioContext resumed generally."))
               .catch(err => Logger.error("Error resuming general AudioContext:", err));
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
                Logger.warn("Invalid volume value received:", rawValue);
                return;
            }
            const clampedValue = Math.max(0, Math.min(1, parsedValue));
            const exponentialValue = Math.pow(clampedValue, 2);

            try {
                this.masterGainNode.gain.linearRampToValueAtTime(exponentialValue, this.audioContext.currentTime + 0.02);
            } catch (e) {
                Logger.warn("linearRampToValueAtTime failed, setting value directly:", e);
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
     * Gets the loading state for a specific sound.
     * @param {string} soundId - The sound ID.
     * @returns {boolean} True if loading, false otherwise.
     */
    isSoundLoading(soundId) {
        return !!this.loadingStates[soundId];
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
 * @property {GainNode|null} gainNode - Stores the gain node for this sound (for fading).
 */
