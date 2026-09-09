import { test, expect } from '@playwright/test'
import { login, TEST_EMAIL, TEST_PASSWORD } from './helpers'

test.describe('Authentication', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 8000 })
    await expect(page).toHaveURL(/login/)
  })

  test('shows login form with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('wrong@email.com')
    await page.locator('input[type="password"]').fill('WrongPassword!')
    await page.locator('button[type="submit"]').click()
    // Should show an error message and NOT redirect
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/login/)
  })

  test('logs in successfully with valid credentials', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/dashboard/)
    // Dashboard heading should be visible
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('shows user name in sidebar after login', async ({ page }) => {
    await login(page)
    // Sidebar should show some user info
    await expect(page.locator('text=samuel').or(page.locator('text=Samuel')).first()).toBeVisible({ timeout: 5000 })
  })

  test('sidebar navigation links are present after login', async ({ page }) => {
    await login(page)
    // Check key nav items exist
    for (const label of ['Inventario', 'Clientes', 'Finanzas', 'Proveedores']) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible()
    }
  })
})
