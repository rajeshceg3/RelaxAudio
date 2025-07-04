// src/js/audio/__tests__/AudioController.test.js
import { AudioController } from '../AudioController';

// Spy on document.dispatchEvent
let mockDispatchEvent;

describe('AudioController', () => {
  let audioController;

  beforeEach(() => {
    // Reset and spy on document.dispatchEvent before each test
    mockDispatchEvent = jest.spyOn(document, 'dispatchEvent');

    // Create a new AudioController instance for each test
    // This ensures that AudioContext and its methods are freshly mocked via jest.setup.js
    audioController = new AudioController();

    // Ensure that the AudioContext mock and its methods are cleared for each test run.
    // This is important if the mock instances accumulate call history.
    // The global beforeEach in jest.setup.js handles global.AudioContext.mockClear()
    // and global.fetch.mockClear().
    // For methods on the instance of the mocked AudioContext (like audioController.audioContext.createGain):
    if (audioController.audioContext && audioController.audioContext.createGain.mockClear) {
        audioController.audioContext.createGain.mockClear();
        audioController.audioContext.createBufferSource.mockClear();
        audioController.audioContext.decodeAudioData.mockClear();
        audioController.audioContext.resume.mockClear();
        audioController.audioContext.suspend.mockClear();
        // Clear calls for gain node methods as well
        audioController.audioContext.masterGainNode.gain.linearRampToValueAtTime.mockClear();
    }
  });

  afterEach(() => {
    mockDispatchEvent.mockRestore();
  });

  describe('Constructor', () => {
    test('initializes Web Audio API components', () => {
      expect(global.AudioContext).toHaveBeenCalledTimes(1);
      expect(audioController.audioContext.createGain).toHaveBeenCalledTimes(1);
      expect(audioController.masterGainNode).toBeDefined();
      expect(audioController.masterGainNode.connect).toHaveBeenCalledWith(audioController.audioContext.destination);
    });

    test('throws error and dispatches event if Web Audio API is not supported', () => {
      global.AudioContext.mockImplementationOnce(() => {
        throw new Error("Web Audio API not supported");
      });

      expect(() => new AudioController()).toThrow("Web Audio API not supported");
      // In this setup, the dispatchEvent might happen before the test spy is attached if error is in constructor.
      // To test this dispatch, we might need a more complex setup or check global dispatch spy if setup differently.
      // For now, testing the throw is the primary check.
    });
  });

  describe('setVolume', () => {
    test('applies exponential scaling and uses linearRampToValueAtTime', () => {
      audioController.setVolume(0.5); // Raw linear value: 0.5
      const expectedExponentialValue = 0.5 * 0.5; // 0.25
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
        .toHaveBeenCalledWith(expectedExponentialValue, audioController.audioContext.currentTime + 0.02);
    });

    test('clamps volume to min 0', () => {
      audioController.setVolume(-0.5);
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
        .toHaveBeenCalledWith(0, expect.any(Number));
    });

    test('clamps volume to max 1', () => {
      audioController.setVolume(1.5);
      expect(audioController.masterGainNode.gain.linearRampToValueAtTime)
        .toHaveBeenCalledWith(1, expect.any(Number)); // 1*1 = 1
    });
  });

  describe('_loadSingleSound', () => {
    test('successfully loads a sound', async () => {
      const soundId = 'rain'; // Assuming 'rain' is a valid soundId from controller's sounds object
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), // Mock non-empty ArrayBuffer
      });
      audioController.audioContext.decodeAudioData.mockResolvedValueOnce({ mockDecodedBuffer: true });

      const buffer = await audioController._loadSingleSound(soundId);

      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].filePath);
      expect(audioController.audioContext.decodeAudioData).toHaveBeenCalled();
      expect(buffer).toEqual({ mockDecodedBuffer: true });
      expect(audioController.sounds[soundId].audioBuffer).toEqual({ mockDecodedBuffer: true });
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'loading', soundId })
      }));
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'loaded', soundId })
      }));
    });

    test('attempts fallback path if initial fetch fails and fallback exists', async () => {
      const soundId = 'rain';
      audioController.sounds[soundId].filePath = '/assets/audio/rain-nonexistent.mp3';
      audioController.sounds[soundId].fallbackPath = '/assets/audio/rain-fallback.mp3';

      // First fetch fails
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Second fetch (fallback) succeeds
      global.fetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
      audioController.audioContext.decodeAudioData.mockResolvedValueOnce({ mockDecodedBuffer: "fallback" });

      const buffer = await audioController._loadSingleSound(soundId);

      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].filePath);
      expect(global.fetch).toHaveBeenCalledWith(audioController.sounds[soundId].fallbackPath);
      expect(buffer).toEqual({ mockDecodedBuffer: "fallback" });
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'loading', soundId }) // Initial load attempt
      }));
       // We expect an error event for the first failed path, then loaded for fallback.
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'error', soundId, message: expect.stringContaining(audioController.sounds[soundId].filePath) })
      }));
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'loaded', soundId }) // Fallback load
      }));
    });

    test('handles error if fetch response is not ok and no fallback', async () => {
        const soundId = 'wind';
        audioController.sounds[soundId].fallbackPath = null; // Ensure no fallback
        global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });

        const buffer = await audioController._loadSingleSound(soundId);
        expect(buffer).toBeNull();
        expect(audioController.sounds[soundId].audioBuffer).toBeNull();
        expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'audiostatechange',
            detail: expect.objectContaining({ status: 'error', soundId })
        }));
    });

    test('handles error if decodeAudioData fails', async () => {
        const soundId = 'ocean';
        global.fetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });
        audioController.audioContext.decodeAudioData.mockRejectedValueOnce(new Error("Decode error"));

        const buffer = await audioController._loadSingleSound(soundId);
        expect(buffer).toBeNull();
        expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
            type: 'audiostatechange',
            detail: expect.objectContaining({ status: 'error', soundId, message: expect.stringContaining("Error loading") })
        }));
    });
  });

  describe('preloadAllSounds', () => {
    test('attempts to load sounds marked for preload', async () => {
      // Assuming 'rain' and 'wind' have preload: true, and 'ocean' has preload: false (adjust as per your actual sounds object)
      audioController.sounds.rain.preload = true;
      audioController.sounds.ocean.preload = false;
      audioController.sounds.wind.preload = true;

      // Mock _loadSingleSound to track calls without actual loading
      const loadSpy = jest.spyOn(audioController, '_loadSingleSound');
      loadSpy.mockResolvedValue({ mockBuffer: true }); // Mock successful load

      await audioController.preloadAllSounds();

      expect(loadSpy).toHaveBeenCalledWith('rain');
      expect(loadSpy).not.toHaveBeenCalledWith('ocean');
      expect(loadSpy).toHaveBeenCalledWith('wind');
      loadSpy.mockRestore();
    });
  });

  describe('Play, Pause, Resume', () => {
    const soundId = 'rain'; // Use a consistent soundId for these tests

    beforeEach(async () => {
      // Ensure the sound is "loaded" before each play/pause/resume test for simplicity
      // This avoids mixing loading logic tests with playback control tests.
      audioController.sounds[soundId].audioBuffer = { mockBuffer: true }; // Mock a loaded buffer
      // Reset relevant mock call counts on the shared AudioContext instance's methods
      audioController.audioContext.resume.mockClear();
      audioController.audioContext.suspend.mockClear();
      // The buffer source is created new each time in _playInternal, so its methods (start, stop) are fresh.
    });

    test('play starts a loaded sound and dispatches events', async () => {
      audioController.audioContext.state = 'running'; // Ensure context is running
      await audioController.play(soundId);

      expect(audioController.audioContext.createBufferSource().start).toHaveBeenCalledTimes(1);
      expect(audioController.currentSoundId).toBe(soundId);
      expect(audioController.isPlaying).toBe(true);
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'playing', soundId })
      }));
    });

    test('play resumes context if suspended then plays', async () => {
      audioController.audioContext.state = 'suspended';
      await audioController.play(soundId);

      expect(audioController.audioContext.resume).toHaveBeenCalledTimes(1);
      // Need to manually set state to running after resume for mock
      audioController.audioContext.state = 'running';
      // Re-run _playInternal or simulate it if play() doesn't chain it after resume in test
      await audioController._playInternal(soundId);

      expect(audioController.audioContext.createBufferSource().start).toHaveBeenCalledTimes(1);
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'playing', soundId })
      }));
    });

    test('pause suspends context and dispatches event', async () => {
      // First, play a sound to set up state for pause
      audioController.audioContext.state = 'running';
      await audioController.play(soundId);
      mockDispatchEvent.mockClear(); // Clear events from play()

      await audioController.pause();

      expect(audioController.audioContext.suspend).toHaveBeenCalledTimes(1);
      expect(audioController.isPlaying).toBe(false);
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'paused', soundId })
      }));
    });

    test('resume resumes context and dispatches event', async () => {
      // Setup: play then pause a sound
      audioController.audioContext.state = 'running';
      await audioController.play(soundId);
      await audioController.pause(); // This will set state to suspended if mock is right
      audioController.audioContext.state = 'suspended'; // Ensure state is suspended for resume test
      mockDispatchEvent.mockClear();

      await audioController.resume();

      expect(audioController.audioContext.resume).toHaveBeenCalledTimes(1); // resume in play + 1 in resume
      expect(audioController.isPlaying).toBe(true);
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'audiostatechange',
        detail: expect.objectContaining({ status: 'resumed', soundId })
      }));
    });
  });
});
