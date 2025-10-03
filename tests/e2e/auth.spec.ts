import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Science Map Platform');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle successful login', async ({ page }) => {
    // Mock successful login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-jwt-token',
          user: { id: '1', email: 'test@example.com' }
        })
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toContainText('Login successful');
  });

  test('should handle login errors', async ({ page }) => {
    // Mock failed login response
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        })
      });
    });

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });

  test('should validate form inputs', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message')).toContainText('Email is required');
    await expect(page.locator('.error-message')).toContainText('Password is required');
  });
});

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Mock successful login
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-jwt-token',
          user: { id: '1', email: 'test@example.com' }
        })
      });
    });
  });

  test('should perform search', async ({ page }) => {
    // Mock search response
    await page.route('**/api/search**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: [
            { id: '1', title: 'Test Research Paper', authors: ['John Doe'] },
            { id: '2', title: 'Another Paper', authors: ['Jane Smith'] }
          ]
        })
      });
    });

    await page.fill('input[placeholder*="search"]', 'machine learning');
    await page.click('button[type="submit"]');

    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('.search-result')).toHaveCount(2);
  });

  test('should handle search errors', async ({ page }) => {
    // Mock search error
    await page.route('**/api/search**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Search service unavailable'
        })
      });
    });

    await page.fill('input[placeholder*="search"]', 'test query');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Search service unavailable');
  });
});
