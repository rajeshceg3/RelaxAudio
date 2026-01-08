// main.js
// Import component classes
import { SoundButton } from './components/SoundButton.js';
import { VolumeSlider } from './components/VolumeSlider.js';
import { SoundscapePlayer } from './components/SoundscapePlayer.js';
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

    // The SoundscapePlayer element is already in index.html.
    // Its connectedCallback will handle its internal setup, including
    // AudioController instantiation, sound loading, and event listeners.

    // Any application-wide setup that isn't part of SoundscapePlayer
    // could go here. For now, it's mainly about defining the elements.

    // console.log('Soundscape application initialized and custom elements defined.');

    // Potential future global error handling or setup:
    // For instance, if SoundscapePlayer fails to initialize AudioController
    // due to Web Audio API issues, it should update its own status display.
    // If SoundscapePlayer element itself is missing or fails catastrophically
    // (e.g., its class is not defined), that would be a different kind of error
    // that might be caught here or simply result in a non-functional page.

    // Register Service Worker for PWA support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(_registration => {
                    // console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
        });
    }
});

// All previous logic related to:
// - Direct DOM element selections (soundButtonsContainer, volumeSlider, playbackStatusDiv)
// - Event listeners for old buttons and slider
// - UI update functions (updatePlaybackStatus, updateActiveButton)
// - Direct AudioController instantiation and preloading
// - localStorage volume logic
// - ESC key listener for pausing
// has been removed as these responsibilities are now encapsulated within the custom elements,
// primarily SoundscapePlayer.js.
// SoundscapePlayer.js handles its own AudioController, sound buttons, volume slider,
// status display, and localStorage for volume.
// Error handling related to Web Audio API is also expected to be managed within SoundscapePlayer.
// The main.js script is now primarily responsible for importing and defining the custom elements.
// The application starts when the <soundscape-player> element in index.html is processed by the browser.
// Its connectedCallback method kicks off its internal logic.
