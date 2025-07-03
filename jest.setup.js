// jest.setup.js

// Mock for AudioContext and its methods
global.AudioContext = jest.fn().mockImplementation(() => {
  const mockGainNode = {
    connect: jest.fn(),
    gain: {
      value: 0,
      setValueAtTime: jest.fn(), // Added for direct value setting
      linearRampToValueAtTime: jest.fn()
    },
  };
  const mockBufferSource = {
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    loop: false,
    buffer: null,
    onended: jest.fn(),
    playbackState: 0, // Assuming 0 could be UN SCHEDULED_STATE, 1 PLAYING_STATE, 2 FINISHED_STATE
  };

  // Store the created gain node and buffer source to allow inspection if needed
  // This is a simplified approach; a more complex scenario might require managing arrays of these.
  const mockAudioContextInstance = {
    createGain: jest.fn().mockReturnValue(mockGainNode),
    createBufferSource: jest.fn().mockReturnValue(mockBufferSource),
    decodeAudioData: jest.fn().mockImplementation(() => Promise.resolve({})), // Resolves with a mock buffer
    resume: jest.fn().mockResolvedValue(undefined),
    suspend: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined), // Added close method
    destination: { type: 'audio-destination-node' }, // Mock destination
    currentTime: 0,
    state: 'running', // Default state, can be changed in tests
    // Store mocks for later access in tests if needed
    _mockGainNode: mockGainNode,
    _mockBufferSource: mockBufferSource
  };
  return mockAudioContextInstance;
});

// Mock for fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)), // Mock ArrayBuffer
  })
);

// Mock for document.dispatchEvent (if not already handled by JSDOM or needed for specific checks)
// JSDOM's EventTarget should handle dispatchEvent, but if you need to spy on it specifically for document:
// global.document.dispatchEvent = jest.fn(); // This might be too broad or conflict if JSDOM provides it.
// More robust: spyOn(document, 'dispatchEvent') in tests where needed.

// Reset mocks before each test to ensure test isolation
beforeEach(() => {
  global.AudioContext.mockClear();
  // If AudioContext methods like createGain were jest.fn() on the prototype, clear them here too.
  // However, with the current implementation, new mocks are created per AudioContext instantiation.
  // We might need to clear calls on the *instances* if they are preserved across tests,
  // but AudioController creates a new AudioContext usually.
  // The mock implementation for createGain itself returns a new object each time.

  global.fetch.mockClear();
  global.fetch.mockImplementation(() => // Reset to default implementation
    Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    })
  );
});
