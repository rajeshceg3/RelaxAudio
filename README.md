# RelaxAudio (Ambient Sound Player)

A minimalist, production-ready ambient sound player built with Vanilla JavaScript, Web Components, and Vite. Designed for relaxation and focus.

## Features

*   **Minimalist Interface:** Distraction-free design.
*   **Production Ready:** Strict CSP, PWA support, and optimized assets.
*   **Resilient Audio:** Exponential backoff retry logic for unstable networks.
*   **Accessible:** WCAG 2.1 AA compliant, reduced motion support, screen reader friendly.
*   **Mobile First:** Optimized touch targets and responsive layout.

## Setup & Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```

3.  **Run Tests:**
    ```bash
    npm test
    ```

4.  **Build for Production:**
    ```bash
    npm run build
    ```

## Architecture

*   `src/js/audio/AudioController.js`: Manages Web Audio API context, loading, and playback.
*   `src/js/components/`: Web Components (`<soundscape-player>`, `<sound-button>`, `<volume-slider>`).
*   `src/css/main.css`: Global styles and reset.

## License

MIT