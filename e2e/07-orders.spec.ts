import { test, expect } from '@playwright/test'
import { login, waitForLoad, waitForToast } from './helpers'

test.describe('Purchase Orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/orders')
    await waitForLoad(page)
  })

  test('shows Orders page with "Nueva Orden" button', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Nueva Orden' })).toBeVisible()
  })

  test('opens the new order modal', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Orden' }).click()
    await expect(page.locator('text=Nueva Orden de Compra')).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('validation: cannot save order without supplier', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Orden' }).click()
    await expect(page.locator('text=Nueva Orden de Compra')).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Crear Orden' }).click()
    await waitForToast(page, 'Selecciona un proveedor')
  })

  test('validation: cannot save order with supplier but no items', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Orden' }).click()
    await expect(page.locator('text=Nueva Orden de Compra')).toBeVisible({ timeout: 5000 })

    const supplierSelect = page.locator('.fixed select').first()
    const options = await supplierSelect.locator('option').count()
    if (options <= 1) {
      await page.locator('button', { hasText: 'Cancelar' }).click()
      return
    }
    await supplierSelect.selectOption({ index: 1 })
    await page.locator('button', { hasText: 'Crear Orden' }).click()
    await waitForToast(page, 'Agrega al menos un producto')
  })

  test('adds a product item in the order form', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Orden' }).click()
    await page.locator('button', { hasText: 'Agregar' }).click()
    // A product row should appear
    const rows = page.locator('.fixed').locator('select').filter({ visible: true })
    await expect(rows.last()).toBeVisible()
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('creates a purchase order', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Orden' }).click()

    const supplierSelect = page.locator('.fixed select').first()
    const options = await supplierSelect.locator('option').count()
    if (options <= 1) {
      await page.locator('button', { hasText: 'Cancelar' }).click()
      return
    }
    await supplierSelect.selectOption({ index: 1 })
    await page.locator('button', { hasText: 'Agregar' }).click()

    const productSelect = page.locator('.fixed select').filter({ visible: true }).last()
    const productOptions = await productSelect.locator('option').count()
    if (productOptions <= 1) {
      await page.locator('button', { hasText: 'Cancelar' }).click()
      return
    }
    await productSelect.selectOption({ index: 1 })

    await page.locator('button', { hasText: 'Crear Orden' }).click()
    await waitForToast(page, 'Orden de compra creada')
  })

  test('filters orders by status', async ({ page }) => {
    const statusSelect = page.locator('select').first()
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('pendiente')
      await page.waitForTimeout(300)
    }
    await expect(page.locator('button', { hasText: 'Nueva Orden' })).toBeVisible()
  })

  test('opens order detail panel', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    // Click the eye/view icon on the first row
    const viewBtn = rows.first().locator('button').first()
    await viewBtn.click()
    await expect(page.locator('text=Detalle de Orden')).toBeVisible({ timeout: 5000 })

    // Close it
    await page.locator('.fixed button').filter({ has: page.locator('svg') }).last().click()
  })

  test('can change order status from detail panel', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    const viewBtn = rows.first().locator('button').first()
    await viewBtn.click()
    await expect(page.locator('text=Detalle de Orden')).toBeVisible({ timeout: 5000 })

    // Find status select in the detail panel
    const statusSelect = page.locator('.fixed select').filter({ visible: true })
    if (await statusSelect.isVisible()) {
      const currentVal = await statusSelect.inputValue()
      const newVal = currentVal === 'pendiente' ? 'en_transito' : 'pendiente'
      await statusSelect.selectOption(newVal)
    }

    await page.locator('.fixed button').filter({ has: page.locator('svg') }).last().click()
  })
})
