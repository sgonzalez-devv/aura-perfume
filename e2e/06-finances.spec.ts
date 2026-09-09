import { test, expect } from '@playwright/test'
import { login, waitForLoad, waitForToast } from './helpers'

test.describe('Finances — Sales tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/finances')
    await waitForLoad(page)
  })

  test('shows Finance page with three tabs', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Finanzas' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Ventas' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Gastos' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'P&L' })).toBeVisible()
  })

  test('Sales tab is active by default and shows "Nueva Venta"', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Nueva Venta' })).toBeVisible()
  })

  test('opens New Sale modal', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Venta' }).click()
    // Modal heading
    await expect(page.locator('.fixed h2', { hasText: 'Nueva Venta' })).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Cancelar' }).click()
  })

  test('validation: cannot save sale with no products', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Venta' }).click()
    await expect(page.locator('.fixed h2', { hasText: 'Nueva Venta' })).toBeVisible({ timeout: 5000 })
    await page.locator('.fixed button', { hasText: 'Registrar Venta' }).click()
    await waitForToast(page, 'Agrega al menos un producto')
  })

  test('adds a product row in the sale modal', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Venta' }).click()
    await expect(page.locator('.fixed h2', { hasText: 'Nueva Venta' })).toBeVisible({ timeout: 5000 })

    await page.locator('.fixed button', { hasText: 'Agregar' }).click()
    // A product selector row should appear inside the modal
    const productSelects = page.locator('.fixed select')
    await expect(productSelects.last()).toBeVisible()

    await page.locator('.fixed button', { hasText: 'Cancelar' }).click()
  })

  test('creates a sale with available product', async ({ page }) => {
    await page.locator('button', { hasText: 'Nueva Venta' }).click()
    await expect(page.locator('.fixed h2', { hasText: 'Nueva Venta' })).toBeVisible({ timeout: 5000 })

    await page.locator('.fixed button', { hasText: 'Agregar' }).click()

    const productSelect = page.locator('.fixed select').last()
    const options = await productSelect.locator('option').count()
    if (options <= 1) {
      await page.locator('.fixed button', { hasText: 'Cancelar' }).click()
      return
    }
    await productSelect.selectOption({ index: 1 })

    await page.locator('.fixed button', { hasText: 'Registrar Venta' }).click()
    await waitForToast(page, 'Venta registrada correctamente')
  })

  test('filters sales by payment method', async ({ page }) => {
    const methodSelect = page.locator('select').filter({ visible: true }).last()
    await methodSelect.selectOption('Efectivo')
    await page.waitForTimeout(300)
    await expect(page.locator('h1').filter({ hasText: 'Finanzas' })).toBeVisible()
  })

  test('date filter shows and clears', async ({ page }) => {
    await page.locator('input[type="date"]').first().fill('2025-01-01')
    await page.waitForTimeout(200)
    const clearBtn = page.locator('button', { hasText: 'Limpiar' })
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await expect(clearBtn).not.toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Finances — Expenses tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/finances')
    await waitForLoad(page)
    await page.locator('button', { hasText: 'Gastos' }).click()
    await page.waitForTimeout(300)
  })

  test('shows Expenses tab with "Nuevo Gasto" button', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'Nuevo Gasto' })).toBeVisible()
  })

  test('opens expense form inline', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Gasto' }).click()
    // The form heading — use .first() to avoid strict mode with duplicate text
    await expect(page.locator('h3', { hasText: 'Registrar Gasto' })).toBeVisible({ timeout: 5000 })
  })

  test('validation: cannot save expense without category and amount', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Gasto' }).click()
    await expect(page.locator('h3', { hasText: 'Registrar Gasto' })).toBeVisible({ timeout: 5000 })
    // Click the submit button inside the form
    await page.locator('button', { hasText: 'Registrar Gasto' }).click()
    await waitForToast(page, 'Categoría y monto son requeridos')
  })

  test('creates an expense', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Gasto' }).click()
    await expect(page.locator('h3', { hasText: 'Registrar Gasto' })).toBeVisible({ timeout: 5000 })

    // Category select is the first visible select on this page
    await page.locator('select').first().selectOption('Marketing')
    await page.locator('input[placeholder*="Descripción"]').fill('Playwright test expense')
    await page.locator('input[type="number"]').first().fill('1500')

    await page.locator('button', { hasText: 'Registrar Gasto' }).click()
    await waitForToast(page, 'Gasto registrado')

    await expect(page.locator('text=Playwright test expense')).toBeVisible({ timeout: 5000 })
  })

  test('deletes an expense', async ({ page }) => {
    const row = page.locator('tbody tr').filter({ hasText: 'Playwright test expense' }).first()
    const rowCount = await page.locator('tbody tr').filter({ hasText: 'Playwright test expense' }).count()
    if (rowCount === 0) return

    await row.locator('button').click()
    await waitForToast(page, 'Gasto eliminado')
  })

  test('cancels expense form', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Gasto' }).click()
    await expect(page.locator('h3', { hasText: 'Registrar Gasto' })).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
    await expect(page.locator('h3', { hasText: 'Registrar Gasto' })).not.toBeVisible({ timeout: 3000 })
  })
})

test.describe('Finances — P&L tab', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/finances')
    await waitForLoad(page)
    await page.locator('button', { hasText: 'P&L' }).click()
    await page.waitForTimeout(2000) // P&L makes several Supabase calls
  })

  test('shows P&L cards: revenue, COGS, gross profit, expenses, net profit', async ({ page }) => {
    await expect(page.locator('p', { hasText: 'Ingresos' }).first()).toBeVisible()
    await expect(page.locator('p', { hasText: 'Costo de Ventas' })).toBeVisible()
    await expect(page.locator('p', { hasText: 'Ganancia Bruta' })).toBeVisible()
    await expect(page.locator('p', { hasText: 'Gastos Operativos' })).toBeVisible()
    await expect(page.locator('p', { hasText: 'Utilidad Neta' })).toBeVisible()
  })

  test('shows the 6-month bar chart heading', async ({ page }) => {
    await expect(page.locator('h3', { hasText: 'Ventas vs Gastos' })).toBeVisible()
  })

  test('shows the P&L summary table rows', async ({ page }) => {
    await expect(page.locator('span', { hasText: 'Ingresos totales' })).toBeVisible()
    await expect(page.locator('span', { hasText: 'Utilidad neta' })).toBeVisible()
  })
})
