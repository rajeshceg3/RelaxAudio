export class SoundButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block; /* Changed from inline-block to allow width: 100% to work as expected */
          width: 100%; /* Ensure the host takes full width given by parent */
        }
        button {
          /* Base Button Style from PRD 2.3.2 */
          background-color: #E8F4F8; /* soft blue-grey */
          color: #2C3E50; /* dark blue-grey for text */
          border-radius: 24px; /* pill shape */
          border: 2px solid transparent;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          padding: 14px 20px; /* Adjust as needed for 60px height with text */
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.5px;
          min-height: 60px; /* PRD US-005 specifies 60px for desktop */
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          text-align: center;
          width: 100%; /* Button fills its host element */
          font-family: inherit; /* Inherit font from host, which should be 'Inter' via body style */
        }

        /* Hover State */
        button:hover {
          background-color: #F0F8FF; /* lighter blue */
        }

        /* Selected State */
        :host([selected]) button {
          background-color: #D1E7DD; /* soft mint green - "active state" color in PRD */
          border-color: #A8D5BA; /* active state border */
        }

        /* Playing State - applied on top of selected or base styles */
        /* The font-weight change is now handled by _updatePlayingState directly on the button style.
           If a CSS-only approach is preferred, :host([playing]) button could be used.
           However, direct style manipulation in _updatePlayingState was already there.
           Let's keep it consistent for now, or remove the JS style manipulation if we define it here.
           For PRD alignment, font-weight: bold for playing is a good indicator.
        */
        :host([playing]) button {
          font-weight: bold;
        }

        /* Focus State */
        button:focus-visible {
          outline: none; /* Remove default outline */
          box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.4); /* Custom focus ring */
        }
      </style>
      <button></button>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._button = this.shadowRoot.querySelector('button');
  }

  static get observedAttributes() {
    return ['sound-id', 'sound-name', 'selected', 'playing'];
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
    // No direct style manipulation is needed here.
  }
}

customElements.define('sound-button', SoundButton);
