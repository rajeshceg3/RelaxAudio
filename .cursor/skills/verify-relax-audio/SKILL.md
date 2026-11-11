# Verify RelaxAudio
RelaxAudio - ambient sound player (vite, vanilla JS, jest unit tests, cypress e2e).
## Launch
npm install, then npm run dev or npm run build && npm run preview.
## Doctor
`python3 .cursor/skills/verify-relax-audio/verify.py`
## Drive
Runs the jest suite (audio controller, player, sliders), builds with vite, renders the built app in headless Chromium asserting the boot marker and zero JS console errors.
## Evidence
`.cursor/skills/verify-relax-audio/evidence.json`
## Cleanup
Static server terminated after the render.
## Known boundaries
Render smoke only; scene quality and e2e suites (cypress/playwright/puppeteer) not exercised here.
