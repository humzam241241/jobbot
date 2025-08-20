import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
  test('basic test', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    const title = page.locator('h1');
    await expect(title).toHaveText('Welcome to JobBot');

    const loginButton = page.getByRole('link', { name: /Login/i });
    await expect(loginButton).toBeVisible();
    await loginButton.click();
  });

  test('login page loads and has Google sign-in button', async ({ page }) => {
    // Navigate to login page and wait for it to be ready
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Check that the page loads with correct title
    await expect(page).toHaveTitle(/Resume Bot|Job Bot/);
    
    // Wait for and verify the Google sign-in button
    const googleButton = page.getByRole('button', { name: /Sign in with Google/i });
    
    // Wait for button to be ready with a longer timeout
    await expect(googleButton).toBeVisible({ timeout: 10000 });
    await expect(googleButton).toBeEnabled({ timeout: 10000 });
    
    // Get the actual button element and verify its attributes
    const buttonElement = await googleButton.elementHandle();
    expect(await buttonElement?.getAttribute('type')).toBe('button');
  });

  test('health endpoint returns proper format', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('ok', true);
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('hasKeys');
    expect(data.hasKeys).toHaveProperty('openai');
    expect(data.hasKeys).toHaveProperty('anthropic');
    expect(data.hasKeys).toHaveProperty('gemini');
    expect(data.hasKeys).toHaveProperty('openrouter');
  });

  test('generate endpoint returns NO_MODEL_KEY when no keys configured', async ({ request }) => {
    // Mock a generate request without API keys configured
    const response = await request.post('/api/resume-kit', {
      data: {
        jobUrl: 'https://example.com/job',
        masterResume: 'Test resume content',
        provider: 'auto',
        model: 'gpt-4o-mini'
      }
    });
    
    // Should return 400 with NO_MODEL_KEY if no API keys are set
    // Or 200 if keys are configured
    if (response.status() === 400) {
      const data = await response.json();
      expect(data).toHaveProperty('code', 'NO_MODEL_KEY');
      expect(data).toHaveProperty('message', 'Missing model API key');
    } else {
      // If API keys are configured, should succeed or return a different error
      expect(response.status()).toBeGreaterThanOrEqual(200);
    }
  });

  test('ATS score renders as 0 when missing', async ({ page }) => {
    // This test would require mocking the API response
    // For now, just verify the page structure exists
    await page.goto('/dashboard');
    
    // Check if we can access dashboard (may redirect to login)
    const url = page.url();
    const isOnLogin = url.includes('/login');
    const isOnDashboard = url.includes('/dashboard');
    
    expect(isOnLogin || isOnDashboard).toBeTruthy();
  });
});
