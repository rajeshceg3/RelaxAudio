import { AudioController } from '../audio/AudioController.js';

const LOCAL_STORAGE_VOLUME_KEY = 'soundscapePlayerVolume';

export class SoundscapePlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // audioController will be instantiated in connectedCallback
    this._currentSoundId = null;
    this._isSoundPlaying = false;
    this._showHelp = false;

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 20px;
          box-sizing: border-box;
          position: relative; /* For modal positioning context if needed, though fixed is better for modal */
        }

        #controls-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 20px;
        }

        /* Sound Buttons Area - Mobile First */
        #sound-selection-area {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 16px;
          margin-bottom: 20px;
        }

        /* Volume Slider Area */
        #volume-control-area {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          gap: 15px; /* Space between slider and mute button */
        }

        /* Direct styling for volume-slider component */
        ::slotted(volume-slider), volume-slider {
             flex-grow: 1; /* Let slider take available space */
             width: auto;
             max-width: 300px;
        }

        /* Mute Button */
        #mute-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #2C3E50;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        #mute-button:hover {
          background-color: rgba(0,0,0,0.05);
        }

        #mute-button:focus {
          outline: 2px solid #3498db;
          outline-offset: 2px;
        }

        #mute-button svg {
            fill: currentColor;
            width: 24px;
            height: 24px;
        }

        /* Playback Status Display */
        #playback-status-display {
          font-size: 14px;
          font-weight: 400;
          letter-spacing: 0.5px;
          color: #2C3E50;
          margin-top: 20px;
          text-align: center;
          min-height: 20px;
          width: 100%;
        }

        .error-message {
          color: var(--soundscape-error-color, red);
          font-weight: bold;
        }

        /* Help Modal */
        #help-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        #help-modal.visible {
            display: flex;
            opacity: 1;
        }

        .modal-content {
            background: white;
            padding: 25px;
            border-radius: 8px;
            max-width: 90%;
            width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            position: relative;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .modal-title {
            margin: 0;
            font-size: 1.2rem;
            color: #2C3E50;
        }

        .close-button {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #7f8c8d;
            padding: 0 5px;
        }

        .close-button:hover {
            color: #2C3E50;
        }

        .shortcut-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f9f9f9;
        }

        .shortcut-key {
            font-family: monospace;
            background: #eee;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
        }

        /* Tablet Layout (768px - 1199px) */
        @media (min-width: 768px) {
          #sound-selection-area {
            display: grid;
            grid-template-columns: repeat(3, minmax(180px, 1fr));
            gap: 20px;
            width: 100%;
            max-width: 660px;
            margin-bottom: 30px;
          }

          #volume-control-area {
             margin-bottom: 30px;
             max-width: 400px; /* Limit width on larger screens */
          }
        }
      </style>

      <div id="controls-area">
        <div id="sound-selection-area">
          <!-- Sound buttons will be populated here -->
        </div>

        <div id="volume-control-area">
          <volume-slider min="0" max="1" step="0.01"></volume-slider>
          <button id="mute-button" aria-label="Mute" title="Mute (M)">
            <svg viewBox="0 0 24 24">
               <path d="M7 9v6h4l5 5V4l-5 5H7z" />
            </svg>
          </button>
        </div>
      </div>

      <div id="playback-status-display" aria-live="polite" role="status">
        Loading soundscape...
      </div>

      <!-- Help Modal -->
      <div id="help-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modal-title" class="modal-title">Keyboard Shortcuts</h2>
                <button id="close-help" class="close-button" aria-label="Close Help">&times;</button>
            </div>
            <ul class="shortcut-list">
                <li class="shortcut-item">
                    <span>Play/Pause</span>
                    <span class="shortcut-key">Space</span>
                </li>
                <li class="shortcut-item">
                    <span>Mute/Unmute</span>
                    <span class="shortcut-key">M</span>
                </li>
                <li class="shortcut-item">
                    <span>Close / Stop</span>
                    <span class="shortcut-key">Esc</span>
                </li>
                <li class="shortcut-item">
                    <span>Toggle Help</span>
                    <span class="shortcut-key">?</span>
                </li>
            </ul>
        </div>
      </div>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._soundSelectionArea = this.shadowRoot.getElementById('sound-selection-area');
    this._volumeSlider = this.shadowRoot.querySelector('volume-slider');
    this._muteButton = this.shadowRoot.getElementById('mute-button');
    this._statusDisplay = this.shadowRoot.getElementById('playback-status-display');
    this._helpModal = this.shadowRoot.getElementById('help-modal');
    this._closeHelpBtn = this.shadowRoot.getElementById('close-help');

    // Bind methods
    this._handleSoundButtonClicked = this._handleSoundButtonClicked.bind(this);
    this._handleVolumeChanged = this._handleVolumeChanged.bind(this);
    this._handleAudioStateChange = this._handleAudioStateChange.bind(this);
    this._handleEscKey = this._handleEscKey.bind(this);
    this._handleMuteToggle = this._handleMuteToggle.bind(this);
    this._toggleHelp = this._toggleHelp.bind(this);
    this._handleKeypress = this._handleKeypress.bind(this);
  }

  connectedCallback() {
    if (typeof AudioController === 'undefined') {
      this._disableControlsWithMessage('Critical error: Audio system component not found.');
      console.error('AudioController class is not defined. Make sure it is loaded before SoundscapePlayer.');
      return;
    }

    try {
      this.audioController = new AudioController();
    } catch (e) {
      this._disableControlsWithMessage(e.message || 'Audio playback is not supported by your browser.');
      return;
    }

    this._initAudioSystem();
  }

  async _initAudioSystem() {
    this._updateStatus('Initializing system...');
    try {
        await this.audioController.loadConfig();
        this._populateSoundButtons();
        this._setupEventListeners();
        this._loadInitialVolume();
        this._updateStatus('Soundscape ready. Select a sound to play or press ? for help.');

        this.audioController.preloadAllSounds().catch(error => {
            this._handleCriticalError(`A critical error occurred while preloading sounds: ${error.message}`);
        });
    } catch (_error) {
        this._handleCriticalError('Failed to load sound configuration. Please refresh.');
    }
  }

  disconnectedCallback() {
    this._soundSelectionArea.removeEventListener('soundbutton-clicked', this._handleSoundButtonClicked);
    if (this._volumeSlider) {
      this._volumeSlider.removeEventListener('volume-changed', this._handleVolumeChanged);
    }
    if (this._muteButton) {
        this._muteButton.removeEventListener('click', this._handleMuteToggle);
    }
    document.removeEventListener('audiostatechange', this._handleAudioStateChange);
    window.removeEventListener('keydown', this._handleEscKey);
    window.removeEventListener('keypress', this._handleKeypress);

    if (this._closeHelpBtn) {
        this._closeHelpBtn.removeEventListener('click', this._toggleHelp);
    }

    if (this.audioController) {
        this.audioController.pause();
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
    if (this._muteButton) {
        this._muteButton.disabled = true;
    }
    console.error(`Critical Error: ${message}`);
}

  _populateSoundButtons() {
    if (!this.audioController || !this.audioController.sounds) {
        this._updateStatus('Error: Sounds data not available from AudioController.', true);
        console.error('AudioController or its sounds property is not available.');
        return;
    }
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
    this._soundSelectionArea.addEventListener('soundbutton-clicked', this._handleSoundButtonClicked);

    if (this._volumeSlider) {
      this._volumeSlider.addEventListener('volume-changed', this._handleVolumeChanged);
    }

    if (this._muteButton) {
        this._muteButton.addEventListener('click', this._handleMuteToggle);
    }

    if (this._closeHelpBtn) {
        this._closeHelpBtn.addEventListener('click', this._toggleHelp);
    }

    document.addEventListener('audiostatechange', this._handleAudioStateChange);
    window.addEventListener('keydown', this._handleEscKey);
    window.addEventListener('keypress', this._handleKeypress);
  }

  _handleKeypress(event) {
      if (event.key === '?' || event.key === '/') { // ? usually needs Shift+/, so checking / as well for convenience if needed, but ? is key value
          this._toggleHelp();
      } else if (event.key.toLowerCase() === 'm') {
          this._handleMuteToggle();
      } else if (event.key === ' ') {
          event.preventDefault(); // Prevent scroll
          // Space toggles play/pause of current sound if active
          if (this._currentSoundId) {
              if (this._isSoundPlaying) {
                  this.audioController.pause();
              } else {
                  this.audioController.play(this._currentSoundId);
              }
          }
      }
  }

  _toggleHelp() {
      this._showHelp = !this._showHelp;
      if (this._showHelp) {
          this._helpModal.classList.add('visible');
          this._closeHelpBtn.focus();
      } else {
          this._helpModal.classList.remove('visible');
      }
  }

  _loadInitialVolume() {
    const savedVolume = localStorage.getItem(LOCAL_STORAGE_VOLUME_KEY);
    let initialVolume = 0.5;
    if (savedVolume !== null) {
      initialVolume = parseFloat(savedVolume);
    }
    if (this._volumeSlider) {
      this._volumeSlider.value = initialVolume;
    }
    if (this.audioController) {
      this.audioController.setVolume(initialVolume);
    }
    this._updateMuteIcon();
  }

  _saveVolume(volume) {
    localStorage.setItem(LOCAL_STORAGE_VOLUME_KEY, volume.toString());
  }

  _handleEscKey(event) {
    if (event.key === 'Escape') {
      if (this._showHelp) {
          this._toggleHelp();
          return;
      }
      if (this.audioController && this._isSoundPlaying) {
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
      this.audioController.play(soundId);
    }
  }

  _handleMuteToggle() {
      if (this.audioController) {
          this.audioController.toggleMute();
          // State update happens in _handleAudioStateChange via event
      }
  }

  _updateMuteIcon() {
      const isMuted = this.audioController ? this.audioController.isMuted : false;
      const volume = this.audioController ? this.audioController.previousVolume : 0.5;

      let pathData = '';
      if (isMuted || volume === 0) {
           // Muted icon
           pathData = "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z";
      } else if (volume < 0.5) {
           // Low volume
           pathData = "M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z";
      } else {
           // High volume
           pathData = "M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z";
      }

      const svgPath = this._muteButton.querySelector('path');
      if (svgPath) {
          svgPath.setAttribute('d', pathData);
      }
      this._muteButton.setAttribute('aria-label', isMuted ? "Unmute" : "Mute");
  }

  _handleVolumeChanged(event) {
    const { value } = event.detail;
    if (this.audioController) {
      this.audioController.setVolume(value);
      // If we change volume while muted, we should probably unmute?
      // Standard UX: Moving slider unmutes.
      if (this.audioController.isMuted) {
          this.audioController.toggleMute(); // This will apply the volume we just set
      }
    }
    this._saveVolume(value);
    this._updateMuteIcon();
  }

  _handleAudioStateChange(event) {
    const { status, soundId, message } = event.detail;

    if (message) {
        this._updateStatus(message, status === 'error');
    }

    switch (status) {
        case 'playing':
        case 'resumed':
            this._currentSoundId = soundId;
            this._isSoundPlaying = true;
            break;
        case 'paused':
            this._currentSoundId = soundId;
            this._isSoundPlaying = false;
            break;
        case 'stopped':
            if (this._currentSoundId === soundId || !soundId) {
                this._currentSoundId = null;
                this._isSoundPlaying = false;
            }
            break;
        case 'error':
            if (this._currentSoundId === soundId) {
                this._isSoundPlaying = false;
            }
            if (!soundId) {
                this._currentSoundId = null;
                this._isSoundPlaying = false;
            }
            break;
        case 'unsupported':
            this._disableControlsWithMessage(message || 'Audio playback is not supported.');
            return;
        case 'mute_changed':
            this._updateMuteIcon();
            break;
    }

    this._updateAllButtonStates();

    if (!message && status !== 'mute_changed') {
        this._updateGeneralStatusMessage();
    }
}

_updateAllButtonStates() {
    const buttons = this._soundSelectionArea.querySelectorAll('sound-button');
    buttons.forEach(button => {
        const id = button.getAttribute('sound-id');
        const isSelected = id === this._currentSoundId;
        const isLoading = this.audioController && this.audioController.loadingStates && this.audioController.loadingStates[id];

        button.selected = isSelected;
        button.playing = isSelected && this._isSoundPlaying;
        button.loading = isLoading;
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
    this._updateStatus(message, true);

    const soundButtons = this._soundSelectionArea.querySelectorAll('sound-button');
    soundButtons.forEach(button => {
      button.disabled = true;
    });

    if (this._volumeSlider) {
      this._volumeSlider.disabled = true;
    }
    if (this._muteButton) {
        this._muteButton.disabled = true;
    }
    console.warn(`SoundscapePlayer controls disabled: ${message}`);
  }
}
