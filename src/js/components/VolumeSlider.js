class VolumeSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block; /* Changed from inline-block */
          width: 100%; /* Host takes full width from parent layout */
        }
        input[type="range"] {
          width: 100%; /* Input fills the host */
          height: 8px; /* Overall height for the track area */
          -webkit-appearance: none;
          appearance: none;
          background: transparent; /* Remove default background */
          cursor: pointer;
          margin: 10px 0; /* Add some vertical margin for better spacing if needed */
        }

        /* Slider Track: WebKit (Chrome, Safari, Edge, Opera) */
        input[type="range"]::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px;
          background: #B8D4DA; /* Muted teal */
          border-radius: 4px;
        }

        /* Slider Thumb: WebKit */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          margin-top: -6px; /* (track_height - thumb_height) / 2 = (8px - 20px) / 2 = -6px */
          background: #2C3E50; /* Dark blue-grey */
          height: 20px;
          width: 20px;
          border-radius: 50%;
          border: 2px solid #FAFAFA; /* Warm white */
        }

        /* Slider Track: Firefox */
        input[type="range"]::-moz-range-track {
          width: 100%;
          height: 8px;
          background: #B8D4DA; /* Muted teal */
          border-radius: 4px;
          border: none; /* Firefox might add a border otherwise */
        }

        /* Slider Thumb: Firefox */
        input[type="range"]::-moz-range-thumb {
          background: #2C3E50; /* Dark blue-grey */
          height: 20px;
          width: 20px;
          border-radius: 50%;
          border: 2px solid #FAFAFA; /* Warm white */
        }

        /* Slider Track: IE / Edge Legacy (MS specific) */
        input[type="range"]::-ms-track {
          width: 100%;
          height: 8px;
          background: transparent; /* Required for custom fill colors */
          border-color: transparent;
          color: transparent;
        }
        input[type="range"]::-ms-fill-lower { /* Color of the track to the left of thumb */
          background: #B8D4DA;
          border-radius: 4px;
        }
        input[type="range"]::-ms-fill-upper { /* Color of the track to the right of thumb */
          background: #B8D4DA; /* Or a lighter color if desired for inactive part */
          border-radius: 4px;
        }
        input[type="range"]::-ms-thumb {
          margin-top: 0px; /* IE thumb aligns differently, usually no margin needed or adjust based on testing */
          background: #2C3E50;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          border: 2px solid #FAFAFA;
        }

        /* Focus State for Thumb: WebKit */
        input[type="range"]:focus-visible::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.4);
        }

        /* Focus State for Thumb: Firefox */
        input[type="range"]:focus-visible::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.4);
        }

        /* Focus State for Thumb: IE / Edge Legacy */
        input[type="range"]:focus::-ms-thumb { /* IE uses :focus, not :focus-visible for this */
            box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.4); /* May need different styling or might not be fully supported */
        }
      </style>
      <input type="range" aria-label="Volume control">
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._input = this.shadowRoot.querySelector('input[type="range"]');
  }

  static get observedAttributes() {
    return ['min', 'max', 'step', 'value'];
  }

  connectedCallback() {
    // Set default values if attributes are not provided
    this._min = this.hasAttribute('min') ? parseFloat(this.getAttribute('min')) : 0;
    this._max = this.hasAttribute('max') ? parseFloat(this.getAttribute('max')) : 1;
    this._step = this.hasAttribute('step') ? parseFloat(this.getAttribute('step')) : 0.01;
    this._value = this.hasAttribute('value') ? parseFloat(this.getAttribute('value')) : (this._min + this._max) / 2;

    this._applyAttributesToInput();
    this._updateAriaAttributes();

    this._input.addEventListener('input', this._onInput.bind(this));
    this._input.addEventListener('change', this._onChange.bind(this)); // For discrete changes
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    const floatValue = parseFloat(newValue);
    switch (name) {
      case 'min':
        this._min = floatValue;
        this._input.min = floatValue;
        this._updateAriaAttributes();
        break;
      case 'max':
        this._max = floatValue;
        this._input.max = floatValue;
        this._updateAriaAttributes();
        break;
      case 'step':
        this._step = floatValue;
        this._input.step = floatValue;
        break;
      case 'value':
        this._value = floatValue;
        this._input.value = floatValue;
        this._updateAriaAttributes();
        // No event dispatch here to prevent loops if value is set programmatically
        break;
    }
  }

  _applyAttributesToInput() {
    this._input.min = this._min;
    this._input.max = this._max;
    this._input.step = this._step;
    this._input.value = this._value;
  }

  _updateAriaAttributes() {
    // Default to percentage representation if min=0 and max=1 (common for volume)
    if (this._min === 0 && this._max === 1) {
      const percentValue = Math.round(this._value * 100);
      this._input.setAttribute('aria-valuemin', '0');
      this._input.setAttribute('aria-valuemax', '100');
      this._input.setAttribute('aria-valuenow', percentValue.toString());
      this._input.setAttribute('aria-valuetext', `${percentValue}%`);
    } else {
      // For other ranges, use the direct values
      this._input.setAttribute('aria-valuemin', this._min.toString());
      this._input.setAttribute('aria-valuemax', this._max.toString());
      this._input.setAttribute('aria-valuenow', this._value.toString());
      // For non-percentage ranges, valuetext might be redundant if value is simple,
      // or could be formatted more explicitly e.g. "Level X of Y"
      // For now, just the value if not the default 0-1 range.
      this._input.setAttribute('aria-valuetext', this._value.toString());
    }
  }

  _onInput(event) {
    const newValue = parseFloat(event.target.value);
    if (this._value !== newValue) {
      this._value = newValue;
      // Update the 'value' attribute to keep it in sync
      this.setAttribute('value', newValue.toString());
      this._updateAriaAttributes();

      this.dispatchEvent(new CustomEvent('volume-changed', {
        detail: { value: newValue },
        bubbles: true,
        composed: true
      }));
    }
  }

  _onChange(event) {
    // This handles cases like keyboard interaction or when the user releases the mouse
    // after dragging, ensuring the final value is captured if it differs from 'input' events.
    const newValue = parseFloat(event.target.value);
    if (this._value !== newValue) {
      this._value = newValue;
      this.setAttribute('value', newValue.toString()); // Ensure attribute is synced
      this._updateAriaAttributes();

      // It's common to dispatch the primary change event on 'input' for real-time feedback.
      // If you only want to dispatch on 'change', move the dispatch from _onInput here.
      // For this component, 'input' is generally preferred for live updates.
      // However, to be safe, we can dispatch here too if state has changed.
      // This ensures that if an 'input' event wasn't fired for some reason,
      // the 'change' event (which fires after 'input') will.
      this.dispatchEvent(new CustomEvent('volume-changed', {
        detail: { value: newValue },
        bubbles: true,
        composed: true,
      }));
    }
  }

  // Getter and Setter for value property
  get value() {
    return this._value;
  }

  set value(val) {
    const newValue = parseFloat(val);
    if (this._value !== newValue) {
      this.setAttribute('value', newValue.toString());
      // The attributeChangedCallback will handle updating the input and ARIA attributes
    }
  }
}

customElements.define('volume-slider', VolumeSlider);
