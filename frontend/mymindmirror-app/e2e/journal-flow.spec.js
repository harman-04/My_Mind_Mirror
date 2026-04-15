import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';  // npm install uuid

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:8080/api';

test.describe('Journal Flow', () => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const username = `e2euser_${uniqueSuffix}`;
  const email = `${username}@test.com`;
  const password = 'Password123!';
  let authToken;

  test.beforeAll(async ({ request }) => {
    // Register via API
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: { username, email, password }
    });
    expect(registerRes.ok()).toBeTruthy();

    // Login via API to get token
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { username, password }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    authToken = loginData.token;
  });

  test('User can write journal and view it', async ({ page }) => {
    // Set token in localStorage before loading page
    await page.addInitScript((token) => {
      localStorage.setItem('jwtToken', token);
    }, authToken);

    // Go to journal page
    await page.goto(`${BASE_URL}/journal`);
    await page.waitForLoadState('networkidle');

    // Wait for journal input to be visible
    const textarea = page.locator('textarea[placeholder*="Write your thoughts"], textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    // Write entry
    const journalText = `Playwright test entry ${Date.now()}`;
    await textarea.fill(journalText);

    // Click save button
    const saveButton = page.locator('button:has-text("Analyze & Save Entry")').first();
    await saveButton.click();

    // Wait for success message
    const successMsg = page.locator('text="Entry saved and analyzed successfully!"');
    await expect(successMsg).toBeVisible({ timeout: 15000 });

    // Verify entry appears in today's list
    const entryPreview = page.locator(`text=${journalText.substring(0, 40)}`).first();
    await expect(entryPreview).toBeVisible({ timeout: 10000 });
  });
});