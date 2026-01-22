export class SoundButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = `
      <link rel="stylesheet" href="css/sound-button.css">
      <button></button>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._button = this.shadowRoot.querySelector('button');
  }

  static get observedAttributes() {
    return ['sound-id', 'sound-name', 'selected', 'playing', 'loading'];
  }

  connectedCallback() {
    if (!this.hasAttribute('sound-id')) {
      this.setAttribute('sound-id', '');
    }
    if (!this.hasAttribute('sound-name')) {
      this.setAttribute('sound-name', 'Unnamed Sound');
    }

    this._button.textContent = this.getAttribute('sound-name');
    this._button.setAttribute('aria-label', `Play ${this.getAttribute('sound-name')}`);

    this._button.addEventListener('click', () => {
      const event = new CustomEvent('soundbutton-clicked', {
        detail: {
          soundId: this.getAttribute('sound-id'),
        },
        bubbles: true, // Allow the event to bubble up through the DOM
        composed: true // Allow the event to cross shadow DOM boundaries
      });
      this.dispatchEvent(event);
    });

    // Set initial states
    this._updateSelectedState();
    this._updatePlayingState();
    this._updateLoadingState();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    switch (name) {
      case 'sound-name':
        this._button.textContent = newValue;
        this._button.setAttribute('aria-label', `Play ${newValue}`);
        break;
      case 'selected':
        this._updateSelectedState();
        break;
      case 'playing':
        this._updatePlayingState();
        break;
      case 'loading':
        this._updateLoadingState();
        break;
    }
  }

  get selected() {
    return this.hasAttribute('selected');
  }

  set selected(isSelected) {
    if (isSelected) {
      this.setAttribute('selected', '');
    } else {
      this.removeAttribute('selected');
    }
  }

  _updateSelectedState() {
    // Visual change is handled by :host([selected]) button CSS selector
    // Add or remove a class on the internal button if preferred over :host selector for styling
    // For example: this._button.classList.toggle('is-selected', this.selected);
  }

  get playing() {
    return this.hasAttribute('playing');
  }

  set playing(isPlaying) {
    if (isPlaying) {
      this.setAttribute('playing', '');
    } else {
      this.removeAttribute('playing');
    }
  }

  _updatePlayingState() {
    this._button.setAttribute('aria-pressed', this.playing ? 'true' : 'false');
    // The visual change (bold font weight) is now handled by the CSS selector :host([playing]) button.
  }

  get loading() {
    return this.hasAttribute('loading');
  }

  set loading(isLoading) {
    if (isLoading) {
      this.setAttribute('loading', '');
    } else {
      this.removeAttribute('loading');
    }
  }

  _updateLoadingState() {
    if (this.loading) {
      this._button.setAttribute('aria-busy', 'true');
    } else {
      this._button.setAttribute('aria-busy', 'false');
    }
  }
}
