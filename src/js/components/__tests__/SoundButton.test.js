// src/js/components/__tests__/SoundButton.test.js
import { SoundButton } from '../SoundButton.js';

describe('SoundButton Component', () => {
  beforeAll(() => {
    if (!customElements.get('sound-button')) {
      customElements.define('sound-button', SoundButton);
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders with default attributes', () => {
    const button = document.createElement('sound-button');
    document.body.appendChild(button);

    expect(button.getAttribute('sound-name')).toBe('Unnamed Sound');
    expect(button.getAttribute('sound-id')).toBe('');
  });

  test('renders with provided attributes', () => {
    const button = document.createElement('sound-button');
    button.setAttribute('sound-name', 'Rain');
    button.setAttribute('sound-id', 'rain');
    document.body.appendChild(button);

    expect(button.shadowRoot.querySelector('button').textContent).toBe('Rain');
    expect(button.getAttribute('sound-id')).toBe('rain');
    expect(button.shadowRoot.querySelector('button').getAttribute('aria-label')).toBe('Play Rain');
  });

  test('dispatches soundbutton-clicked event on click', () => {
    const button = document.createElement('sound-button');
    button.setAttribute('sound-id', 'rain');
    document.body.appendChild(button);

    const mockCallback = jest.fn();
    button.addEventListener('soundbutton-clicked', mockCallback);

    button.shadowRoot.querySelector('button').click();

    expect(mockCallback).toHaveBeenCalled();
    expect(mockCallback.mock.calls[0][0].detail).toEqual({ soundId: 'rain' });
  });

  test('reflects playing state', () => {
    const button = document.createElement('sound-button');
    document.body.appendChild(button);

    button.playing = true;
    expect(button.hasAttribute('playing')).toBe(true);
    expect(button.shadowRoot.querySelector('button').getAttribute('aria-pressed')).toBe('true');

    button.playing = false;
    expect(button.hasAttribute('playing')).toBe(false);
    expect(button.shadowRoot.querySelector('button').getAttribute('aria-pressed')).toBe('false');
  });

  test('reflects selected state', () => {
    const button = document.createElement('sound-button');
    document.body.appendChild(button);

    button.selected = true;
    expect(button.hasAttribute('selected')).toBe(true);

    button.selected = false;
    expect(button.hasAttribute('selected')).toBe(false);
  });
});
