import { test, expect } from '@playwright/test'
import { login, waitForLoad } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('loads the main dashboard with stat cards', async ({ page }) => {
    await waitForLoad(page)
    // There should be multiple stat cards on the overview
    const cards = page.locator('.bg-white.rounded-2xl')
    await expect(cards.first()).toBeVisible()
  })

  test('navigates to Inventory via sidebar', async ({ page }) => {
    await page.locator('text=Inventario').first().click()
    await page.waitForURL('**/inventory', { timeout: 8000 })
    await expect(page).toHaveURL(/inventory/)
    await expect(page.locator('h1').filter({ hasText: 'Inventario' })).toBeVisible()
  })

  test('navigates to Clients via sidebar', async ({ page }) => {
    await page.locator('text=Clientes').first().click()
    await page.waitForURL('**/clients', { timeout: 8000 })
    await expect(page).toHaveURL(/clients/)
    await expect(page.locator('h1').filter({ hasText: 'Clientes' })).toBeVisible()
  })

  test('navigates to Finances via sidebar', async ({ page }) => {
    await page.locator('text=Finanzas').first().click()
    await page.waitForURL('**/finances', { timeout: 8000 })
    await expect(page).toHaveURL(/finances/)
    await expect(page.locator('h1').filter({ hasText: 'Finanzas' })).toBeVisible()
  })

  test('navigates to Suppliers via sidebar', async ({ page }) => {
    await page.locator('text=Proveedores').first().click()
    await page.waitForURL('**/suppliers', { timeout: 8000 })
    await expect(page).toHaveURL(/suppliers/)
    await expect(page.locator('h1').filter({ hasText: 'Proveedores' })).toBeVisible()
  })

  test('navigates to Orders via sidebar', async ({ page }) => {
    await page.locator('text=Órdenes').or(page.locator('text=Pedidos')).or(page.locator('text=Orders')).first().click()
    await page.waitForURL('**/orders', { timeout: 8000 })
    await expect(page).toHaveURL(/orders/)
  })
})
