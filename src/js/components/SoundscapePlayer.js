import { AudioController } from '../audio/AudioController.js';

const LOCAL_STORAGE_VOLUME_KEY = 'soundscapePlayerVolume';

export class SoundscapePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // audioController will be instantiated in connectedCallback
    // this.audioController = new AudioController(); // Placeholder, actual instantiation later
    this._currentSoundId = null; // Tracks the soundId that is currently selected (could be playing or paused)
    this._isSoundPlaying = false; // Tracks if the _currentSoundId is actively playing

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center; /* Center content vertically in case of fixed height */
          width: 100%; /* Fill the .soundscape-player-container */
          padding: 20px; /* Generous white space */
          box-sizing: border-box; /* Include padding in width/height */
          /* background-color, border-radius, box-shadow, max-width are removed
             as they are handled by the outer .soundscape-player-container in main.css */
        }

        #controls-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 20px; /* Default gap between sections */
        }

        /* Sound Buttons Area - Mobile First */
        #sound-selection-area {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 16px; /* Space between buttons in a column */
          margin-bottom: 20px; /* Space before volume slider, PRD US-006 */
        }

        /* Volume Slider Area */
        #volume-control-area {
          width: 100%; /* Full width for mobile */
          display: flex; /* To center the volume-slider component if it has a max-width itself */
          justify-content: center;
          margin-bottom: 20px; /* Space before status display, PRD US-006 */
        }

        /* Direct styling for volume-slider component for layout purposes */
        ::slotted(volume-slider), volume-slider { /* Ensure we select the component instance */
             width: 100%; /* Mobile: Full width */
             margin-left: 16px; /* PRD: 16px margin on mobile */
             margin-right: 16px;
             max-width: calc(100% - 32px); /* ensure margins are effective */
        }


        /* Playback Status Display */
        #playback-status-display {
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.5px;
          color: #2C3E50; /* Consistent with PRD text color */
          margin-top: 20px; /* PRD US-006: Spacing */
          text-align: center;
          min-height: 20px; /* Reserve space to prevent layout shifts */
          width: 100%;
        }

        .error-message {
          color: var(--soundscape-error-color, red); /* Keep error color variable or use direct value */
          font-weight: bold;
        }

        /* Tablet Layout (768px - 1199px) */
        @media (min-width: 768px) {
          #sound-selection-area {
            display: grid;
            grid-template-columns: repeat(3, minmax(180px, 1fr));
            gap: 20px;
            width: 100%; /* Takes full width of host */
            max-width: 660px; /* Approx 3*200px buttons + 2*30px gaps, adjust as needed */
            margin-bottom: 30px; /* Increased margin for tablet */
          }

          ::slotted(volume-slider), volume-slider {
            width: 300px; /* Fixed width for tablet/desktop */
            margin-left: auto; /* Centered */
            margin-right: auto;
            max-width: 300px;
          }

          #volume-control-area {
             margin-bottom: 30px; /* Increased margin for tablet */
          }
        }

        /* Desktop Layout (1200px+) - Inherits from Tablet, can add overrides */
        @media (min-width: 1200px) {
          #sound-selection-area {
            /* max-width: 700px; /* Slightly wider if design dictates */
            /* Styles from 768px are largely fine. */
          }
          /* volume-slider width from tablet is fine */
        }
      </style>
      <div id="controls-area">
        <div id="sound-selection-area">
          <!-- Sound buttons will be populated here -->
        </div>
        <div id="volume-control-area">
          <volume-slider min="0" max="1" step="0.01"></volume-slider>
        </div>
      </div>
      <div id="playback-status-display" aria-live="polite" role="status">
        Loading soundscape...
      </div>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._soundSelectionArea = this.shadowRoot.getElementById('sound-selection-area');
    this._volumeSlider = this.shadowRoot.querySelector('volume-slider');
    this._statusDisplay = this.shadowRoot.getElementById('playback-status-display');

    // Bind methods
    this._handleSoundButtonClicked = this._handleSoundButtonClicked.bind(this);
    this._handleVolumeChanged = this._handleVolumeChanged.bind(this);
    this._handleAudioStateChange = this._handleAudioStateChange.bind(this); // Renamed from _handleAudioControllerStateChange
    this._handleEscKey = this._handleEscKey.bind(this);
  }

  // Ensure AudioController is imported and available globally or via module system
  // For now, assuming AudioController is available when this component's connectedCallback runs.
  // It might be better to pass it as a property if it's managed externally.
  connectedCallback() {
    // Dynamically import AudioController or ensure it's loaded.
    // For this example, we assume AudioController is globally available or imported at the top.
    if (typeof AudioController === 'undefined') {
      // This check might be redundant if AudioController is a hard dependency and would fail earlier.
      // However, as a safeguard for different loading scenarios:
      this._disableControlsWithMessage('Critical error: Audio system component not found.');
      console.error('AudioController class is not defined. Make sure it is loaded before SoundscapePlayer.');
      return;
    }

    try {
      this.audioController = new AudioController();
    } catch (e) {
      // AudioController constructor throws if Web Audio API is not supported.
      // The AudioController constructor should also dispatch an 'unsupported' event,
      // which _handleAudioStateChange will pick up.
      // However, to ensure UI is disabled even if event handling is somehow delayed or missed:
      this._disableControlsWithMessage(e.message || 'Audio playback is not supported by your browser.');
      // No need to console.error(e) here if AudioController already does it.
      return; // Stop further initialization if audio controller fails.
    }

    this._populateSoundButtons();
    this._setupEventListeners();
    this._loadInitialVolume();
    this._updateStatus('Soundscape ready. Select a sound to play.');

    // Preload sounds
    // Use preloadAllSounds as specified
    this.audioController.preloadAllSounds().catch(error => {
        // This catch is for unexpected errors during the preloadAllSounds execution itself.
        // Specific sound load errors are handled via events.
        this._handleCriticalError(`A critical error occurred while preloading sounds: ${error.message}`);
    });
  }

  disconnectedCallback() {
    // Remove event listeners to prevent memory leaks
    this._soundSelectionArea.removeEventListener('soundbutton-clicked', this._handleSoundButtonClicked);
    if (this._volumeSlider) {
      this._volumeSlider.removeEventListener('volume-changed', this._handleVolumeChanged);
    }
    // Remove the correct event listener
    document.removeEventListener('audiostatechange', this._handleAudioStateChange);
    // Remove ESC key listener
    window.removeEventListener('keydown', this._handleEscKey);

    if (this.audioController) {
        // Stop any playing sound to prevent it from continuing after the element is removed.
        this.audioController.pause(); // Using pause which suspends context, effectively stopping sound.
    }
  }

  _handleCriticalError(message) {
    this._updateStatus(message, true);
    const soundButtons = this._soundSelectionArea.querySelectorAll('sound-button');
    soundButtons.forEach(button => {
        button.disabled = true;
    });
    if (this._volumeSlider) {
        this._volumeSlider.disabled = true;
    }
    console.error(`Critical Error: ${message}`);
}

  _populateSoundButtons() {
    if (!this.audioController || !this.audioController.sounds) {
        this._updateStatus('Error: Sounds data not available from AudioController.', true);
        console.error('AudioController or its sounds property is not available.');
        return;
    }
    // Iterate over Object.values for the sounds object
    Object.values(this.audioController.sounds).forEach(sound => {
      if (!customElements.get('sound-button')) {
        this._updateStatus('Error: SoundButton not found.', true);
        console.error('SoundButton is not defined. Make sure it is loaded before SoundscapePlayer.');
        return;
      }
      const button = document.createElement('sound-button');
      button.setAttribute('sound-id', sound.id);
      button.setAttribute('sound-name', sound.name);
      this._soundSelectionArea.appendChild(button);
    });
  }

  _setupEventListeners() {
    // Event delegation for sound buttons
    this._soundSelectionArea.addEventListener('soundbutton-clicked', this._handleSoundButtonClicked);

    if (this._volumeSlider) {
      this._volumeSlider.addEventListener('volume-changed', this._handleVolumeChanged);
    } else {
      this._updateStatus('Error: VolumeSlider not found in template.', true);
      console.error('VolumeSlider element not found in the shadow DOM.');
    }

    // Listen for custom events from AudioController
    // This assumes AudioController dispatches events on the document or a global event bus.
    // If AudioController is more self-contained, it might emit events on itself.
    // Listen to 'audiostatechange' as specified
    document.addEventListener('audiostatechange', this._handleAudioStateChange);
    // Add ESC key listener
    window.addEventListener('keydown', this._handleEscKey);
  }

  _loadInitialVolume() {
    const savedVolume = localStorage.getItem(LOCAL_STORAGE_VOLUME_KEY);
    let initialVolume = 0.5; // Default volume
    if (savedVolume !== null) {
      initialVolume = parseFloat(savedVolume);
    }
    if (this._volumeSlider) {
      this._volumeSlider.value = initialVolume; // Set on slider component
    }
    if (this.audioController) {
      this.audioController.setVolume(initialVolume); // Set in audio controller
    }
     this._updateAriaForVolume(initialVolume);
  }

  _saveVolume(volume) {
    localStorage.setItem(LOCAL_STORAGE_VOLUME_KEY, volume.toString());
  }

   _updateAriaForVolume(volume) { // eslint-disable-line no-unused-vars
    if (this._volumeSlider) {
      // The VolumeSlider component itself should manage its aria-valuenow and aria-valuetext
      // This is just ensuring the player's context is aware if needed.
      // For now, we assume VolumeSlider handles its own ARIA updates internally on value change.
    }
  }

  _handleEscKey(event) {
    if (event.key === 'Escape') {
      if (this.audioController && this._isSoundPlaying) {
        // this._isSoundPlaying is updated by _handleAudioStateChange
        // which is triggered by events from AudioController, including pause.
        this.audioController.pause();
      }
    }
  }

  _handleSoundButtonClicked(event) {
    const { soundId } = event.detail;
    if (!this.audioController) return;

    const soundInfo = this.audioController.getCurrentSoundInfo();

    if (soundInfo && soundInfo.id === soundId && soundInfo.isPlaying) {
      this.audioController.pause();
    } else {
      // If it's a different sound, or the same sound but paused/stopped
      this.audioController.play(soundId);
    }
  }

  _handleVolumeChanged(event) {
    const { value } = event.detail;
    if (this.audioController) {
      this.audioController.setVolume(value);
    }
    this._saveVolume(value);
    this._updateAriaForVolume(value);
    // Status update for volume change can be added if desired
    // this._updateStatus(`Volume set to ${Math.round(value * 100)}%`);
  }

  _handleAudioStateChange(event) {
    const { status, soundId, message } = event.detail;

    // Always update status message if provided
    if (message) {
        this._updateStatus(message, status === 'error');
    }

    // Centralized state updates based on status
    switch (status) {
        case 'playing':
        case 'resumed':
            this._currentSoundId = soundId;
            this._isSoundPlaying = true;
            break;
        case 'paused':
            this._currentSoundId = soundId; // Keep sound selected
            this._isSoundPlaying = false;
            break;
        case 'stopped':
            // If the stopped sound is the current one, or if it's a global stop
            if (this._currentSoundId === soundId || !soundId) {
                this._currentSoundId = null;
                this._isSoundPlaying = false;
            }
            break;
        case 'error':
            // If the error is for the current sound, update its state
            if (this._currentSoundId === soundId) {
                this._isSoundPlaying = false;
            }
            // If it's a global error, reset all
            if (!soundId) {
                this._currentSoundId = null;
                this._isSoundPlaying = false;
            }
            break;
        case 'unsupported':
            this._disableControlsWithMessage(message || 'Audio playback is not supported.');
            return; // Exit early, no other UI updates needed
    }

    // Update all buttons based on the single source of truth
    this._updateAllButtonStates();

    // Update the main status message if no specific message came with the event
    if (!message) {
        this._updateGeneralStatusMessage();
    }
}

_updateAllButtonStates() {
    const buttons = this._soundSelectionArea.querySelectorAll('sound-button');
    buttons.forEach(button => {
        const id = button.getAttribute('sound-id');
        const isSelected = id === this._currentSoundId;
        button.selected = isSelected;
        button.playing = isSelected && this._isSoundPlaying;
    });
}

_updateGeneralStatusMessage() {
    if (this._currentSoundId && this._isSoundPlaying) {
        const currentButton = this._soundSelectionArea.querySelector(`sound-button[sound-id="${this._currentSoundId}"]`);
        const soundName = currentButton ? currentButton.getAttribute('sound-name') : this._currentSoundId;
        this._updateStatus(`Playing: ${soundName}`);
    } else if (this._currentSoundId && !this._isSoundPlaying) {
        const currentButton = this._soundSelectionArea.querySelector(`sound-button[sound-id="${this._currentSoundId}"]`);
        const soundName = currentButton ? currentButton.getAttribute('sound-name') : this._currentSoundId;
        this._updateStatus(`Paused: ${soundName}. Select again or another sound.`);
    } else {
        this._updateStatus('Select a sound to play.');
    }
}

  _updateStatus(message, isError = false) {
    if (this._statusDisplay) {
      this._statusDisplay.textContent = message;
      if (isError) {
        this._statusDisplay.classList.add('error-message');
      } else {
        this._statusDisplay.classList.remove('error-message');
      }
    }
  }

  _disableControlsWithMessage(message) {
    this._updateStatus(message, true); // Show message as an error

    const soundButtons = this._soundSelectionArea.querySelectorAll('sound-button');
    soundButtons.forEach(button => {
      button.disabled = true;
    });

    if (this._volumeSlider) {
      this._volumeSlider.disabled = true;
      // Consider adding a visual disabled style to the volume slider host or input itself
      // For example: this._volumeSlider.setAttribute('disabled', '');
    }
    // Further actions like hiding elements could be done here if desired.
    console.warn(`SoundscapePlayer controls disabled: ${message}`);
  }
}
