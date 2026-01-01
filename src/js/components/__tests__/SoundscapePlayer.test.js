// src/js/components/__tests__/SoundscapePlayer.test.js
import { AudioController } from '../../audio/AudioController.js';

// Mock AudioController
// We define the mock factory to return a constructor that returns a mock object with specific methods and properties.
jest.mock('../../audio/AudioController.js', () => {
  return {
    AudioController: jest.fn().mockImplementation(() => {
      return {
        sounds: {
          rain: { id: 'rain', name: 'Rain', filePath: '/assets/audio/rain.mp3', fallbackPath: '/assets/audio/rain.ogg', preload: true },
          ocean: { id: 'ocean', name: 'Ocean Waves', filePath: '/assets/audio/waves.mp3', fallbackPath: '/assets/audio/waves.ogg', preload: true },
        },
        preloadAllSounds: jest.fn().mockResolvedValue({ success: true, loadedCount: 2 }),
        play: jest.fn(),
        pause: jest.fn(),
        setVolume: jest.fn(),
        isApiSupported: jest.fn().mockReturnValue(true),
        getCurrentSoundInfo: jest.fn().mockReturnValue(null),
      };
    })
  };
});

// Define mock custom elements to prevent errors during SoundscapePlayer instantiation
// checking if they are already defined to avoid errors in watch mode or repeated runs
if (!customElements.get('sound-button')) {
    class MockSoundButton extends HTMLElement {
        constructor() { super(); this.attachShadow({mode: 'open'}); }
        set selected(val) { if(val) this.setAttribute('selected', ''); else this.removeAttribute('selected'); }
        get selected() { return this.hasAttribute('selected'); }
        set playing(val) { if(val) this.setAttribute('playing', ''); else this.removeAttribute('playing'); }
        get playing() { return this.hasAttribute('playing'); }
        set disabled(val) { if(val) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
    }
    customElements.define('sound-button', MockSoundButton);
}

if (!customElements.get('volume-slider')) {
    class MockVolumeSlider extends HTMLElement {
        constructor() { super(); this.attachShadow({mode: 'open'}); }
        set value(val) { this.setAttribute('value', val); }
        get value() { return parseFloat(this.getAttribute('value')) || 0; }
        set disabled(val) { if(val) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
    }
    customElements.define('volume-slider', MockVolumeSlider);
}

// Import SoundscapePlayer AFTER mocking AudioController
// This ensures that when SoundscapePlayer imports AudioController (if it were a side-effect import), it gets the mock.
// Though here AudioController is used inside the class, so it's fine.
import '../SoundscapePlayer.js';

describe('SoundscapePlayer Component', () => {
  let soundscapePlayer;
  let mockAudioControllerInstance;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();

    // Create the element
    soundscapePlayer = document.createElement('soundscape-player');
    document.body.appendChild(soundscapePlayer);

    // Get the instance created by SoundscapePlayer directly
    // This is more reliable than checking mock.instances
    mockAudioControllerInstance = soundscapePlayer.audioController;
  });

  afterEach(() => {
    document.body.innerHTML = ''; // Clean up DOM
  });

  test('should be added to the DOM and initialize AudioController', () => {
    expect(soundscapePlayer).toBeDefined();
    expect(AudioController).toHaveBeenCalledTimes(1);
    expect(mockAudioControllerInstance).toBeDefined();
    // Verify it has the expected methods
    expect(mockAudioControllerInstance.preloadAllSounds).toBeDefined();
  });

  test('should call preloadAllSounds on connectedCallback', () => {
    expect(mockAudioControllerInstance).toBeDefined();
    expect(mockAudioControllerInstance.preloadAllSounds).toHaveBeenCalled();
  });

  test('should populate sound buttons based on AudioController sounds', () => {
    expect(mockAudioControllerInstance).toBeDefined();
    const soundButtonElements = soundscapePlayer.shadowRoot.querySelectorAll('sound-button');
    expect(soundButtonElements.length).toBe(2); // rain and ocean

    const rainButton = soundscapePlayer.shadowRoot.querySelector('sound-button[sound-id="rain"]');
    expect(rainButton).not.toBeNull();
    expect(rainButton.getAttribute('sound-name')).toBe('Rain');
  });

  test('should play sound when a sound button is clicked', () => {
    const rainButton = soundscapePlayer.shadowRoot.querySelector('sound-button[sound-id="rain"]');

    // Simulate click event from the sound-button component
    const clickEvent = new CustomEvent('soundbutton-clicked', {
      detail: { soundId: 'rain' },
      bubbles: true,
      composed: true
    });
    rainButton.dispatchEvent(clickEvent);

    expect(mockAudioControllerInstance.play).toHaveBeenCalledWith('rain');
  });

  test('should pause sound if the same playing sound is clicked', () => {
    // Mock that rain is playing
    mockAudioControllerInstance.getCurrentSoundInfo.mockReturnValue({
        id: 'rain',
        name: 'Rain',
        isPlaying: true
    });

    const rainButton = soundscapePlayer.shadowRoot.querySelector('sound-button[sound-id="rain"]');
    const clickEvent = new CustomEvent('soundbutton-clicked', {
        detail: { soundId: 'rain' },
        bubbles: true,
        composed: true
    });
    rainButton.dispatchEvent(clickEvent);

    expect(mockAudioControllerInstance.pause).toHaveBeenCalled();
  });

  test('should update volume when volume slider changes', () => {
    const volumeSlider = soundscapePlayer.shadowRoot.querySelector('volume-slider');

    const volumeEvent = new CustomEvent('volume-changed', {
        detail: { value: 0.8 },
        bubbles: true,
        composed: true
    });
    volumeSlider.dispatchEvent(volumeEvent);

    expect(mockAudioControllerInstance.setVolume).toHaveBeenCalledWith(0.8);
  });
});
