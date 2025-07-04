// cypress/e2e/soundscape_player_spec.cy.js

describe('Soundscape Player E2E Test', () => {
  beforeEach(() => {
    // Visit the page where the soundscape player is hosted
    // Assuming it's at the root of the development server
    cy.visit('/');

    // Wait for the soundscape-player component to be defined and potentially initialized
    // This might involve waiting for specific elements within its shadow DOM to appear.
    // For now, a simple check for the host element.
    cy.get('soundscape-player').should('exist').as('soundscapePlayer');

    // It might be necessary to wait for preloading to nominally complete
    // or for buttons to be populated if there's a delay.
    // Accessing shadow DOM for buttons:
    cy.get('@soundscapePlayer')
      .shadow()
      .find('sound-button[sound-id="rain"]') // Assuming sound-id attribute is on sound-button host
      .should('exist');
  });

  it('should load the player and display sound buttons and volume slider', () => {
    cy.get('@soundscapePlayer').shadow().as('playerInternals');

    // Check for sound buttons (using their attributes or content)
    cy.get('@playerInternals').find('sound-button[sound-id="rain"]').should('be.visible');
    cy.get('@playerInternals').find('sound-button[sound-id="ocean"]').should('be.visible');
    cy.get('@playerInternals').find('sound-button[sound-id="wind"]').should('be.visible');

    // Check for the volume slider
    cy.get('@playerInternals').find('volume-slider').should('be.visible');
    cy.get('@playerInternals').find('volume-slider').shadow().find('input[type="range"]').should('exist');

    // Check for initial status message (example)
    // The initial message can be "Loading soundscape..." or "Sounds preloaded..." or "Select a sound..."
    // depending on timing and preload success. Making this check more flexible.
    cy.get('@playerInternals').find('#playback-status-display').invoke('text').should('match', /Loading soundscape...|Sounds preloaded. Ready to play.|Select a sound to play./);
  });

  it('should play rain sounds when rain button is clicked, then pause', () => {
    cy.get('@soundscapePlayer').shadow().as('playerInternals');

    const rainButtonHost = cy.get('@playerInternals').find('sound-button[sound-id="rain"]');

    // Interact with the actual button inside SoundButton's shadow DOM
    rainButtonHost.shadow().find('button').as('actualRainButton');

    // Click the rain button
    cy.get('@actualRainButton').click();

    // Verify UI changes to indicate playing
    // 1. Rain button should appear active/playing (check attributes or class)
    rainButtonHost.should('have.attr', 'selected');
    rainButtonHost.should('have.attr', 'playing');

    // 2. Status display should update
    cy.get('@playerInternals').find('#playback-status-display').should('contain.text', 'Playing: Rain');

    // (Cannot truly verify audio output in Cypress without plugins)

    // Click the rain button again to pause
    cy.get('@actualRainButton').click();

    // Verify UI changes to indicate paused
    // 1. Rain button should appear selected but not playing
    rainButtonHost.should('have.attr', 'selected');
    rainButtonHost.should('not.have.attr', 'playing');

    // 2. Status display should update
    cy.get('@playerInternals').find('#playback-status-display').should('contain.text', 'Paused: Rain');
  });

  it('should switch to ocean waves when ocean button is clicked while rain is playing', () => {
    cy.get('@soundscapePlayer').shadow().as('playerInternals');

    const rainButtonHost = cy.get('@playerInternals').find('sound-button[sound-id="rain"]');
    const rainButtonShadowClickable = rainButtonHost.shadow().find('button');
    const oceanButtonHost = cy.get('@playerInternals').find('sound-button[sound-id="ocean"]');
    const oceanButtonShadowClickable = oceanButtonHost.shadow().find('button');

    // Play rain
    rainButtonShadowClickable.click();
    cy.get('@playerInternals').find('#playback-status-display').should('contain.text', 'Playing: Rain');
    rainButtonHost.should('have.attr', 'playing');

    // Click ocean button
    oceanButtonShadowClickable.click();

    // Verify UI changes
    // 1. Ocean button is playing
    oceanButtonHost.should('have.attr', 'selected');
    oceanButtonHost.should('have.attr', 'playing');
    // 2. Rain button is no longer playing (and maybe not even selected, depending on logic)
    rainButtonHost.should('not.have.attr', 'playing');
    rainButtonHost.should('not.have.attr', 'selected'); // Assuming selection follows active sound
    // 3. Status display
    cy.get('@playerInternals').find('#playback-status-display').should('contain.text', 'Playing: Ocean Waves');
  });

  it('should adjust volume using the volume slider', () => {
    cy.get('@soundscapePlayer').shadow().as('playerInternals');
    const volumeSliderHost = cy.get('@playerInternals').find('volume-slider');
    const volumeInput = volumeSliderHost.shadow().find('input[type="range"]');

    // Play a sound first to make volume adjustment meaningful
    cy.get('@playerInternals').find('sound-button[sound-id="wind"]').shadow().find('button').click();
    cy.get('@playerInternals').find('#playback-status-display').should('contain.text', 'Playing: Wind');

    // Adjust volume (e.g., to 50%)
    volumeInput.invoke('val', 0.5).trigger('input').trigger('change');

    // Verify ARIA attributes on the input reflect the change
    volumeInput.should('have.attr', 'aria-valuenow', '50');
    volumeInput.should('have.attr', 'aria-valuetext', '50%');

    // Verify volume preference is saved to localStorage
    // The key used in SoundscapePlayer.js is 'soundscapePlayerVolume'
    // but PRD mentions 'soundscape-preferences' for a potential object.
    // Let's use the actual key from SoundscapePlayer.js
    const volumeKey = 'soundscapePlayerVolume'; // From SoundscapePlayer.js
    cy.window().its('localStorage').invoke('getItem', volumeKey).then(savedVolume => {
        expect(savedVolume).to.not.be.null;
        expect(parseFloat(savedVolume)).to.equal(0.5);
    });
  });

});
