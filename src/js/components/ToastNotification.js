export class ToastNotification extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.timeout = null;

    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none; /* Allow clicks through empty space */
        }

        .toast {
          background-color: #333;
          color: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: auto; /* Re-enable clicks on the toast itself */
          max-width: 300px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .toast.show {
          opacity: 1;
          transform: translateY(0);
        }

        .toast.error {
          background-color: #E74C3C;
        }

        .toast.success {
          background-color: #27AE60;
        }

        .toast.info {
          background-color: #2980B9;
        }

        .close-btn {
          background: none;
          border: none;
          color: inherit;
          margin-left: 10px;
          cursor: pointer;
          font-size: 16px;
          padding: 0 4px;
        }
      </style>
      <div id="toast-container"></div>
    `;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.container = this.shadowRoot.getElementById('toast-container');
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.onclick = () => this.dismiss(toast);

    toast.appendChild(messageSpan);
    toast.appendChild(closeBtn);
    this.container.appendChild(toast);

    // Force reflow
    toast.offsetHeight;

    toast.classList.add('show');

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  }

  dismiss(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      if (toast.parentElement) {
        toast.remove();
      }
    });
  }
}

customElements.define('toast-notification', ToastNotification);
