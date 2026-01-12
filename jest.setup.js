// jest.setup.js
// Mock global.AudioContext
global.AudioContext = class {
  constructor() {
    this.createGain = jest.fn(() => ({
      connect: jest.fn(),
      gain: {
        value: 0,
        linearRampToValueAtTime: jest.fn(),
      },
      disconnect: jest.fn(),
    }));
    this.createBufferSource = jest.fn(() => ({
      buffer: null,
      loop: false,
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
    }));
    this.decodeAudioData = jest.fn().mockResolvedValue({});
    this.suspend = jest.fn().mockResolvedValue();
    this.resume = jest.fn().mockResolvedValue();
    this.state = 'suspended';
    this.destination = {};
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  })
);

// Mock import.meta.env
// Jest runs in Node, where import.meta is not natively supported in CJS mode without config tweaks.
// However, since we are using babel-jest (implied by babel.config.js presence), we can mock this by defining it globally or transforming it.
// A simpler way for Jest tests is to assign a global object that mimics it, but babel usually handles this.
// The error "Cannot use 'import.meta' outside a module" suggests we need a babel plugin or a mock.
// Since we are adding Logger.js which uses it, we need to fix this.
