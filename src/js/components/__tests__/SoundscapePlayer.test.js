// src/js/components/__tests__/SoundscapePlayer.test.js
import { SoundscapePlayer } from '../SoundscapePlayer.js'; // Import class for potential direct instantiation or type checking
import { AudioController } from '../../audio/AudioController.js';

// Mock AudioController for SoundscapePlayer tests
// jest.mock will hoist this to the top of the module
jest.mock('../../audio/AudioController.js', () => {
  // Create a re-usable mock constructor
  const mockAudioControllerInstance = {
    sounds: { // Provide a default sound structure
      rain: { id: 'rain', name: 'Rain', filePath: '/assets/audio/rain.mp3', fallbackPath: '/assets/audio/rain.ogg', preload: true },
      ocean: { id: 'ocean', name: 'Ocean Waves', filePath: '/assets/audio/waves.mp3', fallbackPath: '/assets/audio/waves.ogg', preload: true },
    },
    preloadAllSounds: jest.fn().mockResolvedValue({ success: true, loadedCount: 2 }),
    play: jest.fn(),
    pause: jest.fn(),
    setVolume: jest.fn(),
    isApiSupported: jest.fn().mockReturnValue(true),
    getCurrentSoundInfo: jest.fn().mockReturnValue(null),
    // Add any other methods SoundscapePlayer might call
  };

  return {
    AudioController: jest.fn().mockImplementation(() => {
      // Reset method mocks for each new instance if needed, or rely on clearAllMocks
      mockAudioControllerInstance.preloadAllSounds.mockClear().mockResolvedValue({ success: true, loadedCount: 2 });
      mockAudioControllerInstance.play.mockClear();
      mockAudioControllerInstance.pause.mockClear();
      mockAudioControllerInstance.setVolume.mockClear();
      mockAudioControllerInstance.isApiSupported.mockClear().mockReturnValue(true);
      mockAudioControllerInstance.getCurrentSoundInfo.mockClear().mockReturnValue(null);
      return mockAudioControllerInstance;
    })
  };
});

// Define mock custom elements for SoundButton and VolumeSlider
// These are needed because SoundscapePlayer creates them in its connectedCallback.
// The actual components might have more complex setup or dependencies not ideal for this unit test.
if (!customElements.get('sound-button')) {
    class MockSoundButton extends HTMLElement {
        constructor() { super(); this.attachShadow({mode: 'open'}); }
        // Mock properties that SoundscapePlayer might interact with
        set selected(val) { this.toggleAttribute('selected', Boolean(val)); }
        get selected() { return this.hasAttribute('selected'); }
        set playing(val) { this.toggleAttribute('playing', Boolean(val)); }
        get playing() { return this.hasAttribute('playing'); }
        set disabled(val) { this.toggleAttribute('disabled', Boolean(val)); }
        get disabled() { return this.hasAttribute('disabled'); }

        setAttribute(name, value) { super.setAttribute(name, value); this[name] = value; }
        removeAttribute(name) { super.removeAttribute(name); delete this[name]; }
    }
    customElements.define('sound-button', MockSoundButton);
}

if (!customElements.get('volume-slider')) {
    class MockVolumeSlider extends HTMLElement {
        constructor() { super(); this.attachShadow({mode: 'open'}); }
        // Mock properties that SoundscapePlayer might interact with
        set value(val) { this.setAttribute('value', val); }
        get value() { return parseFloat(this.getAttribute('value')) || 0; } // Default to 0 if not set
        set disabled(val) { this.toggleAttribute('disabled', Boolean(val)); }
        get disabled() { return this.hasAttribute('disabled'); }

        setAttribute(name, value) { super.setAttribute(name, value); this[name] = value; }
    }
    customElements.define('volume-slider', MockVolumeSlider);
}

// SoundscapePlayer.js also self-defines, but importing it ensures its class is loaded.
// The customElements.define for 'soundscape-player' will run when its module is imported.
import '../SoundscapePlayer.js';


describe('SoundscapePlayer Component', () => {
  let soundscapePlayer;
  let mockAudioControllerInstance;

  beforeEach(() => {
    // Clear the main AudioController constructor mock and get a fresh instance reference for assertions
    AudioController.mockClear();

    // Create and append the element. This will trigger its connectedCallback.
    soundscapePlayer = document.createElement('soundscape-player');
    document.body.appendChild(soundscapePlayer);

    // The AudioController mock constructor is called inside connectedCallback
    // So, the instance is available via mock.instances after appending.
    if (AudioController.mock.instances.length > 0) {
        mockAudioControllerInstance = AudioController.mock.instances[0];
    }
  });

  afterEach(() => {
    if (soundscapePlayer && soundscapePlayer.parentNode) {
      soundscapePlayer.parentNode.removeChild(soundscapePlayer);
    }
    // jest.clearAllMocks(); // Clears all mocks, including the AudioController constructor and its methods
  });

  test('should be added to the DOM and initialize AudioController', () => {
    expect(soundscapePlayer).not.toBeNull();
    expect(document.querySelector('soundscape-player')).not.toBeNull();
    // Check if AudioController constructor was called by SoundscapePlayer's connectedCallback
    expect(AudioController).toHaveBeenCalledTimes(1);
  });

  test('should call preloadAllSounds on connectedCallback if AudioController initialized', () => {
    // Ensure AudioController was instantiated and instance is available
    expect(mockAudioControllerInstance).toBeDefined();
    if (mockAudioControllerInstance) {
        expect(mockAudioControllerInstance.preloadAllSounds).toHaveBeenCalled();
    }
  });

  test('should populate sound buttons based on AudioController sounds', ()_ => {
      expect(mockAudioControllerInstance).toBeDefined();
      const soundButtonElements = soundscapePlayer.shadowRoot.querySelectorAll('sound-button');
      // Based on the default mock for AudioController.sounds
      expect(soundButtonElements.length).toBe(Object.keys(mockAudioControllerInstance.sounds).length);

      const rainButton = soundscapePlayer.shadowRoot.querySelector('sound-button[sound-id="rain"]');
      expect(rainButton).not.toBeNull();
      expect(rainButton.getAttribute('sound-name')).toBe('Rain');
  });

  // TODO: Add tests for event handling (soundbutton-clicked, volume-changed),
  // state updates based on audiostatechange, localStorage interaction for volume.
});
