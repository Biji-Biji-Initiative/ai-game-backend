import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should navigate to the home page', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads with a title
    await expect(page).toHaveTitle(/Fight Club/);
  });

  // This is an example test - you'll need to adjust selectors and assertions
  // based on your actual app structure
  test('should navigate through the game flow', async ({ page }) => {
    // Start at the welcome page
    await page.goto('/');
    
    // Find and click a start button (adjust selector as needed)
    const startButton = page.getByRole('button', { name: /start/i });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Example assertions for next page, replace with actual elements from your app
    await page.waitForURL('**/traits');
    await expect(page.getByRole('heading')).toContainText(/traits/i);
  });
});

// Skip this test until we have proper mocks or a test environment
test.describe.skip('Round Completion', () => {
  test('should complete Round 1', async ({ page }) => {
    // Navigate to round 1
    await page.goto('/round1');
    
    // Wait for the challenge to load
    await expect(page.getByText('Round 1: Define The Challenge')).toBeVisible();
    
    // Enter a response
    await page.getByPlaceholderText(/type your response here/i).fill('My test response to the challenge');
    
    // Click continue
    await page.getByRole('button', { name: /continue to round 2/i }).click();
    
    // Verify navigation to round 2
    await page.waitForURL('**/round2');
    await expect(page.getByText(/Round 2/)).toBeVisible();
  });
}); 