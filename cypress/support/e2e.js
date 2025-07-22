Cypress.on('window:before:load', (win) => {
  cy.spy(win.console, 'log').as('consoleLog')
  cy.spy(win.console, 'error').as('consoleError')
})
