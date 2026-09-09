import { test, expect } from '@playwright/test'
import { login, waitForLoad, waitForToast } from './helpers'

const TS = Date.now()
const SUPPLIER_NAME = `PW Supplier ${TS}`

test.describe('Suppliers CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/suppliers')
    await waitForLoad(page)
  })

  test('shows suppliers page with "Nuevo Proveedor" button', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Proveedores' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Nuevo Proveedor' })).toBeVisible()
  })

  test('validation: cannot save supplier without name', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Proveedor' }).click()
    await expect(page.locator('text=Nuevo Proveedor').last()).toBeVisible()
    await page.locator('button', { hasText: 'Crear Proveedor' }).click()
    await waitForToast(page, 'El nombre es requerido')
  })

  test('creates a new supplier', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Proveedor' }).click()
    const modal = page.locator('.fixed.inset-0').last()

    await modal.locator('input[placeholder*="Fragrance"]').fill(SUPPLIER_NAME)
    await modal.locator('input[placeholder*="María"]').fill('Test Contact')
    await modal.locator('input[type="email"]').fill(`supplier${TS}@test.com`)
    await modal.locator('input[placeholder*="1 809"]').fill('+1 809 555 9999')
    await modal.locator('input[placeholder*="República"]').fill('República Dominicana')

    await modal.locator('button', { hasText: 'Crear Proveedor' }).click()
    await waitForToast(page, 'Proveedor creado correctamente')
    await expect(page.locator(`text=${SUPPLIER_NAME}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('opens edit modal for a supplier', async ({ page }) => {
    const cards = page.locator('.bg-white.rounded-2xl.shadow-card')
    const count = await cards.count()
    if (count === 0) return

    await cards.first().locator('button').first().click()
    await expect(page.locator('text=Editar Proveedor')).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('edits an existing supplier', async ({ page }) => {
    const cardCount = await page.locator('.bg-white.rounded-2xl.shadow-card').filter({ hasText: SUPPLIER_NAME }).count()
    if (cardCount === 0) return

    await page.locator('.bg-white.rounded-2xl.shadow-card').filter({ hasText: SUPPLIER_NAME }).first().locator('button').first().click()
    await expect(page.locator('.fixed h2', { hasText: 'Editar Proveedor' })).toBeVisible({ timeout: 5000 })

    await page.locator('.fixed textarea').fill('Updated via Playwright test')
    await page.locator('.fixed button', { hasText: 'Guardar Cambios' }).click()
    await waitForToast(page, 'Proveedor actualizado')
  })

  test('shows delete confirmation dialog and cancels', async ({ page }) => {
    const cards = page.locator('.bg-white.rounded-2xl.shadow-card')
    const count = await cards.count()
    if (count === 0) return

    await cards.first().locator('button').nth(1).click()
    await expect(page.locator('text=¿Eliminar proveedor?')).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
    await expect(page.locator('text=¿Eliminar proveedor?')).not.toBeVisible({ timeout: 3000 })
  })

  test('deletes the test supplier', async ({ page }) => {
    const card = page.locator('.bg-white.rounded-2xl.shadow-card').filter({ hasText: SUPPLIER_NAME }).first()
    const cardCount = await page.locator('.bg-white.rounded-2xl.shadow-card').filter({ hasText: SUPPLIER_NAME }).count()
    if (cardCount === 0) return

    await card.locator('button').nth(1).click()
    await expect(page.locator('text=¿Eliminar proveedor?')).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Eliminar' }).click()
    await waitForToast(page, 'Proveedor eliminado')
  })
})
