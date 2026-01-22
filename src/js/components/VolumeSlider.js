export class VolumeSlider extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Initialize properties in the constructor
    this._min = 0;
    this._max = 1;
    this._step = 0.01;
    this._value = 0.5;

    const template = document.createElement('template');
    template.innerHTML = `
      <link rel="stylesheet" href="css/volume-slider.css">
      <input type="range" aria-label="Volume control">
      <div id="tooltip" aria-hidden="true"></div>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._input = this.shadowRoot.querySelector('input[type="range"]');
    this._tooltip = this.shadowRoot.getElementById('tooltip');
  }

  static get observedAttributes() {
    return ['min', 'max', 'step', 'value'];
  }

  connectedCallback() {
    // Reflect attributes to properties if they exist
    if (this.hasAttribute('min')) this._min = parseFloat(this.getAttribute('min'));
    if (this.hasAttribute('max')) this._max = parseFloat(this.getAttribute('max'));
    if (this.hasAttribute('step')) this._step = parseFloat(this.getAttribute('step'));
    if (this.hasAttribute('value')) this._value = parseFloat(this.getAttribute('value'));

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
      if(this._tooltip) this._tooltip.textContent = `${percentValue}%`;
    } else {
      // For other ranges, use the direct values
      this._input.setAttribute('aria-valuemin', this._min.toString());
      this._input.setAttribute('aria-valuemax', this._max.toString());
      this._input.setAttribute('aria-valuenow', this._value.toString());
      this._input.setAttribute('aria-valuetext', this._value.toString());
      if(this._tooltip) this._tooltip.textContent = this._value.toString();
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
    // The 'input' event handles real-time updates. The 'change' event fires when the user
    // releases the slider. We can use this to ensure the final state is synced, but
    // dispatching another event is often redundant if 'input' is already handled.
    // This handler can be used for final state logic if needed, but for now, we'll
    // prevent the redundant event dispatch.
    const newValue = parseFloat(event.target.value);
    if (this._value !== newValue) {
        this._value = newValue;
        this.setAttribute('value', newValue.toString());
        this._updateAriaAttributes();
        // The primary 'volume-changed' event is dispatched on 'input' for live feedback.
        // We don't need to dispatch it again on 'change'.
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
