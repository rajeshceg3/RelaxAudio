// main.js
// Import component classes
import { SoundButton } from './components/SoundButton.js';
import { VolumeSlider } from './components/VolumeSlider.js';
import { SoundscapePlayer } from './components/SoundscapePlayer.js';
import './components/ToastNotification.js'; // Import for side-effects (custom element definition)
import { Logger } from './utils/Logger.js';
import { registerSW } from 'virtual:pwa-register';

// AudioController is now instantiated and managed by SoundscapePlayer.

document.addEventListener('DOMContentLoaded', () => {
    // Define custom elements
    // Ensure SoundButton and VolumeSlider are defined before SoundscapePlayer,
    // as SoundscapePlayer's template might try to use them immediately upon connection.
    if (!customElements.get('sound-button')) {
        customElements.define('sound-button', SoundButton);
    }
    if (!customElements.get('volume-slider')) {
        customElements.define('volume-slider', VolumeSlider);
    }
    if (!customElements.get('soundscape-player')) {
        customElements.define('soundscape-player', SoundscapePlayer);
    }

    // Instantiate Toast System
    let toast = document.querySelector('toast-notification');
    if (!toast) {
        toast = document.createElement('toast-notification');
        document.body.appendChild(toast);
    }

    // Global Event Listener for Audio State Changes to trigger Toasts
    document.addEventListener('audiostatechange', (e) => {
        const { status, message } = e.detail;
        if (status === 'error') {
            toast.show(message || 'An error occurred', 'error');
        } else if (status === 'unsupported') {
            toast.show(message, 'error', 0); // 0 duration = sticky
        }
    });

    // The SoundscapePlayer element is already in index.html.
    // Its connectedCallback will handle its internal setup, including
    // AudioController instantiation, sound loading, and event listeners.

    // Any application-wide setup that isn't part of SoundscapePlayer
    // could go here. For now, it's mainly about defining the elements.

    Logger.log('Soundscape application initialized and custom elements defined.');

    // Register Service Worker for PWA support
    registerSW({
        onRegisteredSW(swUrl, registration) {
            Logger.log('ServiceWorker registration successful with scope: ' + registration.scope);
        },
        onRegisterError(error) {
            Logger.error('ServiceWorker registration failed: ', error);
        }
    });
});
