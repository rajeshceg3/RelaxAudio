// src/js/audio/__tests__/AudioController.test.js
import { AudioController } from '../AudioController.js';

// Mock Web Audio API
const mockAudioContext = {
  createGain: jest.fn().mockReturnValue({
    connect: jest.fn(),
    gain: {
      value: 1,
      linearRampToValueAtTime: jest.fn(),
    },
  }),
  createBufferSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    loop: false,
    buffer: null,
  }),
  decodeAudioData: jest.fn().mockImplementation(buffer => Promise.resolve({duration: 60})), // Mock successful decode
  resume: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn().mockResolvedValue(undefined),
  destination: {},
  state: 'running', // Initial state
  currentTime: 0,
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // Mock ArrayBuffer
}));

// Mock CustomEvent
global.CustomEvent = class CustomEvent extends Event {
    constructor(type, eventInitDict) {
        super(type, eventInitDict);
        if (eventInitDict && eventInitDict.detail) {
            this.detail = eventInitDict.detail;
        }
    }
};
// Spy on document.dispatchEvent
const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

describe('AudioController', () => {
  let audioController;

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();

    // Restore AudioContext mock to its initial state for each test
    global.AudioContext = jest.fn().mockImplementation(() => {
        // Reset parts of mockAudioContext that might be changed by tests
        mockAudioContext.state = 'running';
        mockAudioContext.currentTime = 0;
        mockAudioContext.createGain.mockReturnValue({ // Return a fresh gain node mock
            connect: jest.fn(),
            gain: {
                value: 1,
                linearRampToValueAtTime: jest.fn(),
            },
        });
        mockAudioContext.createBufferSource.mockReturnValue({ // Return a fresh buffer source mock
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            loop: false,
            buffer: null,
        });
        mockAudioContext.decodeAudioData = jest.fn().mockImplementation(buffer => Promise.resolve({duration: 60}));
        mockAudioContext.resume = jest.fn().mockResolvedValue(undefined);
        mockAudioContext.suspend = jest.fn().mockResolvedValue(undefined);
        return mockAudioContext;
    });

    global.fetch = jest.fn(() => Promise.resolve({ // Reset fetch mock
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }));

    dispatchEventSpy.mockClear();

    // Re-initialize AudioController before each test
    audioController = new AudioController();
  });

  test('should initialize Web Audio API components', () => {
    expect(global.AudioContext).toHaveBeenCalledTimes(1);
    expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);
    expect(audioController.masterGainNode).toBeDefined();
  });

  test('constructor should throw error if Web Audio API is not supported', () => {
    const originalAudioContext = global.AudioContext;
    global.AudioContext = undefined; // Simulate unsupported API
    expect(() => new AudioController()).toThrow('Web Audio API not supported');
    // Check if 'unsupported' event was dispatched
    const unsupportedEvent = dispatchEventSpy.mock.calls.find(
        call => call[0].type === 'audiostatechange' && call[0].detail.status === 'unsupported'
    );
    expect(unsupportedEvent).toBeDefined();
    expect(unsupportedEvent[0].detail.message).toContain('Audio playback not supported');
    global.AudioContext = originalAudioContext; // Restore
  });

  describe('Sound Loading', () => {
    test('_loadSingleSound should load and decode audio', async () => {
      const soundId = 'rain';
      await audioController._loadSingleSound(soundId);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].filePath);
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(audioController.sounds[soundId].audioBuffer).toBeDefined();
      // Check for 'loading' and 'loaded' events
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'loading', soundId })
      }));
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'loaded', soundId })
      }));
    });

    test('_loadSingleSound should attempt fallback path on primary fetch failure', async () => {
      const soundId = 'ocean';
      global.fetch
        .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 404 })) // Fail primary
        .mockImplementationOnce(() => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })); // Succeed fallback

      await audioController._loadSingleSound(soundId);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].filePath);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].fallbackPath);
      expect(audioController.sounds[soundId].audioBuffer).toBeDefined();
    });

    test('_loadSingleSound should dispatch error if both paths fail', async () => {
      const soundId = 'wind';
      global.fetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 })); // Fail both

      await audioController._loadSingleSound(soundId);
      expect(audioController.sounds[soundId].audioBuffer).toBeNull();
       expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({
            status: 'error',
            soundId,
            // This message comes from the second (fallback) attempt failing
            message: `Error loading ${audioController.sounds[soundId].name} from ${audioController.sounds[soundId].fallbackPath}.`
          })
      }));
    });

    test('preloadAllSounds should attempt to load all preloadable sounds', async () => {
      await audioController.preloadAllSounds();
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds.rain.filePath);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds.ocean.filePath);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds.wind.filePath);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'info', message: 'Sound preloading complete.' })
      }));
    });

    test('preloadAllSounds should dispatch error if no sounds load', async () => {
      global.fetch.mockImplementation(() => Promise.resolve({ ok: false, status: 404 }));
      await audioController.preloadAllSounds();
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'error', message: 'Failed to load any sounds. Please try again.' })
      }));
    });
  });

  describe('Playback Control', () => {
    beforeEach(async () => {
      const soundId = 'rain';
      audioController.sounds[soundId].audioBuffer = {duration: 60, sampleRate: 44100, numberOfChannels: 2, getChannelData: () => new Float32Array(0)};
      mockAudioContext.state = 'running';
    });

    test('play should start audio if context is running', () => {
      const soundId = 'rain';
      audioController.play(soundId);
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      const sourceNode = mockAudioContext.createBufferSource.mock.results[0].value;
      expect(sourceNode.start).toHaveBeenCalled();
      expect(audioController.isPlaying).toBe(true);
      expect(audioController.currentSoundId).toBe(soundId);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'playing', soundId })
      }));
    });

    test('play should resume context if suspended, then play', async () => {
      const soundId = 'rain';
      mockAudioContext.state = 'suspended'; // Set initial suspended state

      // Ensure the mock for resume() correctly updates the state
      audioController.audioContext.resume = jest.fn().mockImplementation(() => {
        audioController.audioContext.state = 'running';
        return Promise.resolve();
      });

      audioController.play(soundId);
      expect(audioController.audioContext.resume).toHaveBeenCalled();

      // Allow the promise chain in play() to resolve
      await new Promise(process.nextTick); // Or await Promise.resolve();

      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      const sourceNode = mockAudioContext.createBufferSource.mock.results[0].value;
      expect(sourceNode.start).toHaveBeenCalled();
      expect(audioController.isPlaying).toBe(true);
    });

    test('play should stop other sound before playing new one', async () => {
        const rainSoundId = 'rain';
        const oceanSoundId = 'ocean';
        audioController.sounds[oceanSoundId].audioBuffer = {duration: 75, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(0)};

        audioController.play(rainSoundId);
        const firstSourceNode = audioController.sounds[rainSoundId].sourceNode;
        expect(firstSourceNode.start).toHaveBeenCalled();

        audioController.play(oceanSoundId);
        expect(firstSourceNode.stop).toHaveBeenCalled();
        const secondSourceNode = audioController.sounds[oceanSoundId].sourceNode;
        expect(secondSourceNode.start).toHaveBeenCalled();
        expect(audioController.currentSoundId).toBe(oceanSoundId);
    });

    test('pause should suspend context if playing', async () => {
      audioController.play('rain');
      audioController.pause();
      expect(mockAudioContext.suspend).toHaveBeenCalled();

      await new Promise(process.nextTick); // Allow suspend promise to resolve

      expect(audioController.isPlaying).toBe(false);
      expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'paused', soundId: 'rain' })
      }));
    });

    test('resume should resume context if paused', async () => {
      audioController.play('rain');
      audioController.pause();
      await new Promise(process.nextTick); // for suspend()

      mockAudioContext.state = 'suspended';
      audioController.audioContext.resume = jest.fn().mockImplementation(() => {
          audioController.audioContext.state = 'running';
          return Promise.resolve();
      });

      audioController.resume();
      expect(audioController.audioContext.resume).toHaveBeenCalled();
      await new Promise(process.nextTick); // for resume()

      expect(audioController.isPlaying).toBe(true);
       expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({
          type: 'audiostatechange',
          detail: expect.objectContaining({ status: 'resumed', soundId: 'rain' })
      }));
    });
  });

  describe('Volume Control', () => {
    test('setVolume should adjust masterGainNode value', () => {
      const volumeValue = 0.5;
      audioController.setVolume(volumeValue);
      const expectedGainValue = 0.25;
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
        .toHaveBeenCalledWith(expectedGainValue, mockAudioContext.currentTime + 0.02);
    });

    test('setVolume should clamp values between 0 and 1', () => {
        audioController.setVolume(1.5);
        expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
            .toHaveBeenCalledWith(1, mockAudioContext.currentTime + 0.02);

        audioController.setVolume(-0.5);
        expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
            .toHaveBeenCalledWith(0, mockAudioContext.currentTime + 0.02);
    });
  });

  test('isApiSupported should return true if context exists', () => {
    expect(audioController.isApiSupported()).toBe(true);
    const originalAudioContext = audioController.audioContext;
    audioController.audioContext = null;
    expect(audioController.isApiSupported()).toBe(false);
    audioController.audioContext = originalAudioContext;
  });

  test('getCurrentSoundInfo should return current sound details', () => {
    const soundId = 'rain';
    audioController.sounds[soundId].audioBuffer = {duration: 60, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(0)};
    audioController.play(soundId);

    const info = audioController.getCurrentSoundInfo();
    expect(info).toEqual({
      id: soundId,
      name: audioController.sounds[soundId].name,
      isPlaying: true,
    });
  });

  test('getCurrentSoundInfo should return null if no sound is current', () => {
    expect(audioController.getCurrentSoundInfo()).toBeNull();
  });

});
