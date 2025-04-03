/**
 * End-to-end tests for the main AI Fight Club user flow
 * These tests validate the complete user journey from welcome page to results
 */

describe('AI Fight Club Game Flow', () => {
  beforeEach(() => {
    // Start from the welcome page
    cy.visit('/');

    // Verify we're on the welcome page
    cy.contains('AI Fight Club');
    cy.contains('Discover Your Human Edge');
  });

  it('should allow completing the entire game flow with mock data', () => {
    // Welcome page -> Traits
    cy.contains('Start Your Journey').click();
    cy.url().should('include', '/traits');

    // Wait for traits to load
    cy.contains('Assess Your Human Traits', { timeout: 5000 });

    // Verify traits have loaded
    cy.get('[role="slider"]').should('have.length.at.least', 3);

    // Adjust some trait values by clicking sliders
    cy.get('[role="slider"]').eq(0).click({ force: true });
    cy.get('[role="slider"]').eq(1).click({ force: true });
    cy.get('[role="slider"]').eq(2).click({ force: true });

    // Continue to focus selection
    cy.contains('Continue to Focus Areas').click();
    cy.url().should('include', '/focus');

    // Wait for focus areas to load
    cy.contains('Select Your Focus Area', { timeout: 5000 });

    // Verify focus areas have loaded
    cy.get('button:contains("Select this Focus")').should('have.length.at.least', 1);

    // Select the first focus area
    cy.get('button:contains("Select this Focus")').first().click();

    // Continue to round 1
    cy.contains('Continue to Round 1').click();
    cy.url().should('include', '/round1');

    // Wait for challenge to load
    cy.contains('Round 1: Define The Challenge', { timeout: 5000 });

    // Enter a response
    cy.get('textarea').type('This is my response to the round 1 challenge. I believe human creativity and empathy are key advantages over AI in this context.');

    // Continue to round 2
    cy.contains('Continue to Round 2').click();
    cy.url().should('include', '/round2');

    // Wait for AI response to load
    cy.contains('Round 2: AI\'s Response', { timeout: 5000 });

    // Enter analysis
    cy.get('textarea').type('Here is my analysis of the AI\'s approach. I notice that while the AI has strengths in processing large amounts of data, it lacks the intuitive understanding and emotional intelligence that humans bring to the table.');

    // Continue to round 3
    cy.contains('Continue to Round 3').click();
    cy.url().should('include', '/round3');

    // Wait for final challenge to load
    cy.contains('Round 3: Final Challenge', { timeout: 5000 });

    // Enter final response
    cy.get('textarea').type('In my final response, I want to emphasize that my human edge comes from the ability to understand context, adapt to unexpected situations, and connect emotionally with others. These are areas where AI still falls short despite its impressive capabilities.');

    // Continue to results
    cy.contains('See Your Human Edge Profile').click();
    cy.url().should('include', '/results');

    // Verify profile has loaded
    cy.contains('Your Human Edge Profile', { timeout: 5000 });
    cy.contains('Your Focus Area');
    cy.contains('Your Human Strengths');
  });

  it('should navigate using the header menu', () => {
    // Start the journey first to unlock navigation
    cy.contains('Start Your Journey').click();
    cy.url().should('include', '/traits');

    // Navigate to focus page from header
    cy.get('nav').contains('Focus').click();
    cy.url().should('include', '/focus');

    // Try to navigate to a locked page (should be disabled)
    cy.get('nav').contains('Results').should('have.class', 'cursor-not-allowed');
  });

  it('should be able to access the prompts page', () => {
    // Go to the prompts developer tool
    cy.contains('Prompts').click();
    cy.url().should('include', '/prompts');

    // Verify prompt viewer has loaded
    cy.contains('Prompt Viewer');
    cy.contains('This is a developer tool');

    // Check if prompt selection works
    cy.get('#prompt-select').click();
    cy.contains('Trait Assessment Generation').click();
    cy.contains('Generate a set of questions');
  });
});
