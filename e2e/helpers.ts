import { Page } from '@playwright/test'

export const TEST_EMAIL = 'samuel@aura-perfume.com'
export const TEST_PASSWORD = 'Aura2025!'

export const BASE = 'http://localhost:3000'

export async function login(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]').click()
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 })
}

export async function waitForToast(page: Page, text: string) {
  await page.locator(`text=${text}`).first().waitFor({ timeout: 8000 })
}

// Wait for the loading spinner to disappear
export async function waitForLoad(page: Page) {
  await page.locator('svg.animate-spin').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
}
