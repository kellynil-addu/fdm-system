import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser, createE2EUser } from './helpers/auth';

test.describe('Role-gated navigation and auth redirects', () => {
  test('redirects unauthenticated user accessing /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL((url) => url.pathname === '/login');
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('next=');
  });

  test('redirects unauthenticated user accessing /dashboard/clients to /login', async ({ page }) => {
    await page.goto('/dashboard/clients');
    await page.waitForURL((url) => url.pathname === '/login');
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('next=%2Fdashboard%2Fclients');
  });

  test('redirects unauthenticated user accessing /dashboard/admin to /login', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await page.waitForURL((url) => url.pathname === '/login');
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('next=%2Fdashboard%2Fadmin');
  });

  test('authenticates valid admin and redirects to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('authenticated admin can access /dashboard/admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    await expect(page.getByRole('heading', { name: 'Team & access' })).toBeVisible();
  });

  test('shows access denied page with go back and overview options when lacking permission', async ({ page }) => {
    const user = await createE2EUser(['billing_staff']);
    try {
      await loginAsUser(page, user.email, user.password);
      await expect(page).toHaveURL(/\/dashboard/);

      // Attempt to visit admin dashboard without system.read permission
      await page.goto('/dashboard/admin');

      // Does not redirect away to /dashboard; stays on /dashboard/admin with access denied UI
      await expect(page).toHaveURL(/\/dashboard\/admin/);
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
      await expect(page.getByText('You do not have the required permissions to view Team & access.')).toBeVisible();

      // Test "Go back" button returns to previous page (/dashboard)
      await page.getByRole('button', { name: /Go back/i }).click();
      await page.waitForURL((url) => url.pathname === '/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);

      // Navigate to /dashboard/admin again and test "Dashboard overview" link
      await page.goto('/dashboard/admin');
      await expect(page).toHaveURL(/\/dashboard\/admin/);
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();

      await page.getByRole('link', { name: /Dashboard overview/i }).click();
      await page.waitForURL((url) => url.pathname === '/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);

      // Attempt to visit legal dashboard without legal.read permission
      await page.goto('/dashboard/legal');
      await expect(page).toHaveURL(/\/dashboard\/legal/);
      await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
      await expect(page.getByText('You do not have the required permissions to view Title releases.')).toBeVisible();
    } finally {
      await user.cleanup();
    }
  });
});
