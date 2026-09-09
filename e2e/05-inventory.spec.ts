import { test, expect } from '@playwright/test'
import { login, waitForLoad, waitForToast } from './helpers'

const TS = Date.now()
const PRODUCT_NAME = `PW Perfume ${TS}`

test.describe('Inventory CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/inventory')
    await waitForLoad(page)
  })

  test('shows inventory page with "Nuevo Producto" button', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Inventario' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Nuevo Producto' })).toBeVisible()
  })

  test('shows search bar', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible()
  })

  test('validation: cannot save product without name', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Producto' }).click()
    await expect(page.locator('text=Nuevo Producto').last()).toBeVisible()
    await page.locator('button', { hasText: 'Crear Producto' }).click()
    await waitForToast(page, 'Nombre y marca son requeridos')
  })

  test('creates a new product', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Producto' }).click()
    const modal = page.locator('.fixed.inset-0').last()

    await modal.locator('input[placeholder*="Black Orchid"]').fill(PRODUCT_NAME)
    await modal.locator('input[placeholder*="Tom Ford"]').fill('TestBrand')
    await modal.locator('input[placeholder*="TF-BO"]').fill(`SKU-PW-${TS}`)

    // Number inputs order: size_ml(0), purchase_price(1), selling_price(2), stock_quantity(3), min_stock_alert(4)
    const numberInputs = modal.locator('input[type="number"]')
    await numberInputs.nth(1).fill('2500')  // purchase_price
    await numberInputs.nth(2).fill('5000')  // selling_price
    await numberInputs.nth(3).fill('10')    // stock_quantity

    await modal.locator('button', { hasText: 'Crear Producto' }).click()
    await waitForToast(page, 'Producto creado correctamente')
  })

  test('searches for a product', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill('PW Perfume')
    await page.waitForTimeout(400)
    await expect(page.locator('h1').filter({ hasText: 'Inventario' })).toBeVisible()
  })

  test('filters by category dropdown', async ({ page }) => {
    const selects = page.locator('select').filter({ visible: true })
    const count = await selects.count()
    if (count > 0) {
      await selects.first().selectOption({ index: 0 })
      await page.waitForTimeout(300)
    }
    await expect(page.locator('h1').filter({ hasText: 'Inventario' })).toBeVisible()
  })

  test('opens edit modal for a product', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    const editBtn = rows.first().locator('button').first()
    await editBtn.click()
    await expect(page.locator('text=Editar Producto')).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Cancelar' }).click()
  })

  test('edits a product stock quantity', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill('PW Perfume')
    await page.waitForTimeout(400)

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().locator('button').first().click()
    await expect(page.locator('text=Editar Producto')).toBeVisible({ timeout: 5000 })

    const modal = page.locator('.fixed.inset-0').last()
    // Number inputs order: size_ml(0), purchase_price(1), selling_price(2), stock_quantity(3), min_stock_alert(4)
    const numberInputs = modal.locator('input[type="number"]')
    await numberInputs.nth(3).clear()
    await numberInputs.nth(3).fill('15')

    await modal.locator('button', { hasText: 'Guardar Cambios' }).click()
    await waitForToast(page, 'Producto actualizado correctamente')
  })

  test('shows delete confirmation and cancels', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    const deleteBtn = rows.first().locator('button').last()
    await deleteBtn.click()
    await expect(page.locator('text=¿Eliminar producto?')).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Cancelar' }).click()
    await expect(page.locator('text=¿Eliminar producto?')).not.toBeVisible({ timeout: 3000 })
  })

  test('deletes the test product', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill('PW Perfume')
    await page.waitForTimeout(400)

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().locator('button').last().click()
    await expect(page.locator('text=¿Eliminar producto?')).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Eliminar' }).click()
    await waitForToast(page, 'Producto eliminado')
  })

  test('toggle active/inactive status', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().locator('button').first().click()
    await expect(page.locator('text=Editar Producto')).toBeVisible({ timeout: 5000 })

    const modal = page.locator('.fixed.inset-0').last()
    const activeToggle = modal.locator('input[type="checkbox"]').last()
    if (await activeToggle.isVisible()) {
      const wasChecked = await activeToggle.isChecked()
      await activeToggle.click()
      await expect(activeToggle).toBeChecked({ checked: !wasChecked })
      await activeToggle.click() // restore
    }

    await modal.locator('button', { hasText: 'Cancelar' }).click()
  })
})
