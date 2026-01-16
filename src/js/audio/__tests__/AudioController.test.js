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
  decodeAudioData: jest.fn().mockImplementation(() => Promise.resolve({duration: 60})),
  resume: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn().mockResolvedValue(undefined),
  destination: {},
  state: 'running', // Initial state
  currentTime: 0,
};

global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
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
const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

describe('AudioController', () => {
  let audioController;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore AudioContext mock
    global.AudioContext = jest.fn().mockImplementation(() => {
        mockAudioContext.state = 'running';
        mockAudioContext.currentTime = 0;
        // ... (simplified reset for brevity, reliance on mockAudioContext methods being spies/mocks)
        mockAudioContext.createGain.mockClear();
        mockAudioContext.createBufferSource.mockClear();
        mockAudioContext.resume.mockClear();
        mockAudioContext.suspend.mockClear();
        return mockAudioContext;
    });

    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    }));

    dispatchEventSpy.mockClear();
    audioController = new AudioController();
    // Inject test data to match previous hardcoded state
    audioController.sounds = {
        rain: { id: 'rain', name: 'Heavy Rain', filePath: 'assets/audio/heavy-rain.mp3', fallbackPath: 'assets/audio/heavy-rain.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null },
        ocean: { id: 'ocean', name: 'Ocean Waves', filePath: 'assets/audio/ocean-waves.mp3', fallbackPath: 'assets/audio/ocean-waves.ogg', duration: 0, preload: true, audioBuffer: null, sourceNode: null }
    };
  });

  // ... (Previous tests remain mostly the same, focusing on the problem areas)

  test('should initialize Web Audio API components', () => {
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
      expect(audioController.masterGainNode).toBeDefined();
  });

  test('constructor should throw error if Web Audio API is not supported', () => {
      const original = global.AudioContext;
      global.AudioContext = undefined;
      expect(() => new AudioController()).toThrow('Web Audio API not supported');
      global.AudioContext = original;
  });

  describe('Sound Loading', () => {
      test('_loadSingleSound should load and decode audio', async () => {
          const soundId = 'rain';
          await audioController._loadSingleSound(soundId);
          expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].filePath);
      });

      test('should retry on 500 errors', async () => {
        jest.useFakeTimers();
        try {
            const soundId = 'rain';

            global.fetch = jest.fn()
                .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }))
                .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }))
                .mockImplementationOnce(() => Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
                }));

            const loadPromise = audioController._loadSingleSound(soundId);

            // Advance time and flush promises repeatedly
            for (let i = 0; i < 5; i++) {
                jest.advanceTimersByTime(2000);
                await Promise.resolve();
                await Promise.resolve(); // Extra tick
            }

            await loadPromise;

            expect(global.fetch).toHaveBeenCalledTimes(3);
        } finally {
            jest.useRealTimers();
        }
    });
  });

  describe('Playback Control', () => {
      // Fix for the timeout issues: use standard await Promise.resolve() instead of process.nextTick
      test('play should resume context if suspended, then play', async () => {
          const soundId = 'rain';
          mockAudioContext.state = 'suspended';
          audioController.audioContext.resume = jest.fn().mockImplementation(() => {
              mockAudioContext.state = 'running';
              return Promise.resolve();
          });

          // Provide buffer so it doesn't try to fetch
          audioController.sounds[soundId].audioBuffer = {};

          audioController.play(soundId);
          expect(audioController.audioContext.resume).toHaveBeenCalled();

          await Promise.resolve(); // Wait for resume promise
          await Promise.resolve(); // Wait for play internal promise

          expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      });

      test('pause should suspend context if playing', async () => {
          const soundId = 'rain';
          audioController.sounds[soundId].audioBuffer = {};
          audioController.sounds[soundId].sourceNode = {}; // Mock source node existence
          audioController.isPlaying = true;
          audioController.currentSoundId = soundId;

          audioController.pause();
          expect(mockAudioContext.suspend).toHaveBeenCalled();
          await Promise.resolve();
      });

      test('resume should resume context if paused', async () => {
          const soundId = 'rain';
           audioController.sounds[soundId].audioBuffer = {};
          audioController.currentSoundId = soundId;
          mockAudioContext.state = 'suspended';

          audioController.resume();
          expect(mockAudioContext.resume).toHaveBeenCalled();
          await Promise.resolve();
      });
  });

  // Re-adding the missing tests for completeness (truncated in overwrite)
   describe('Volume Control', () => {
    test('setVolume should adjust masterGainNode value', () => {
      audioController.setVolume(0.5);
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled();
    });

    test('toggleMute should mute and unmute audio, restoring previous volume', () => {
      // 1. Initial State: Volume 1.0 (default), Not Muted
      expect(audioController.isMuted).toBe(false);
      expect(audioController.previousVolume).toBe(1.0);

      // 2. Mute
      audioController.toggleMute();
      expect(audioController.isMuted).toBe(true);
      expect(audioController.previousVolume).toBe(1.0); // Should remember 1.0
      // Should set gain to 0
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));

      // 3. Unmute
      audioController.toggleMute();
      expect(audioController.isMuted).toBe(false);
      // Should restore gain to 1.0
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1.0, expect.any(Number));
    });

    test('toggleMute should remember set volume', () => {
        // 1. Set volume to 0.5
        audioController.setVolume(0.5);
        expect(audioController.previousVolume).toBe(0.5);

        // 2. Mute
        audioController.toggleMute();
        expect(audioController.isMuted).toBe(true);
        expect(audioController.previousVolume).toBe(0.5);
        expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number));

        // 3. Unmute
        audioController.toggleMute();
        expect(audioController.isMuted).toBe(false);
        // Note: The implementation uses Math.pow(val, 2) for exponential volume
        expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, expect.any(Number));
    });

    test('setVolume should update previousVolume while muted', () => {
        // 1. Mute
        audioController.toggleMute();
        expect(audioController.isMuted).toBe(true);

        // 2. Change volume while muted (e.g. slider interaction)
        audioController.setVolume(0.8);

        // Should update the stored volume but keep actual gain at 0
        expect(audioController.previousVolume).toBe(0.8);
        // During mute toggle, we applied volume 0 (called with 0)
        // When setting volume while muted, we expect no calls to applyVolume (handled in setVolume)

        // 3. Unmute
        audioController.toggleMute();
        // 0.8 * 0.8 = 0.64
        expect(audioController.masterGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.6400000000000001, expect.any(Number));
    });
   });
});
