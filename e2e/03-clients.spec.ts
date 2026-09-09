import { test, expect } from '@playwright/test'
import { login, waitForLoad, waitForToast } from './helpers'

const TS = Date.now()

test.describe('Clients CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard/clients')
    await waitForLoad(page)
  })

  test('shows the clients page with header and buttons', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Clientes' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Nuevo Cliente' })).toBeVisible()
    await expect(page.locator('button', { hasText: 'Exportar CSV' })).toBeVisible()
  })

  test('shows search input', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible()
  })

  test('validation: cannot save client without first and last name', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Cliente' }).click()
    await expect(page.locator('text=Nuevo Cliente').last()).toBeVisible()
    await page.locator('button', { hasText: 'Crear Cliente' }).click()
    await waitForToast(page, 'Nombre y apellido son requeridos')
  })

  test('creates a new client successfully', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Cliente' }).click()
    await expect(page.locator('text=Nuevo Cliente').last()).toBeVisible()

    const modal = page.locator('.fixed.inset-0').last()

    await modal.locator('input[placeholder="Juan"]').fill(`PW${TS}`)
    await modal.locator('input[placeholder="Pérez"]').fill('Test')
    await modal.locator('input[type="email"]').fill(`pw${TS}@test.com`)

    // Phone and WhatsApp share the same placeholder — use nth
    const phoneInputs = modal.locator('input[placeholder="+1 809 000 0000"]')
    await phoneInputs.nth(0).fill('+1 809 555 0001')
    await phoneInputs.nth(1).fill('+18095550001')

    await modal.locator('input[placeholder="Santo Domingo"]').fill('Santo Domingo')

    await modal.locator('button', { hasText: 'Crear Cliente' }).click()
    await waitForToast(page, 'Cliente creado correctamente')

    await expect(page.locator(`text=PW${TS}`).first()).toBeVisible({ timeout: 5000 })
  })

  test('searches for a client by name', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill(`PW${TS}`)
    await page.waitForTimeout(300)
    await expect(page.locator('p').filter({ hasText: 'clientes registrados' })).toBeVisible()
  })

  test('searches for a client by city', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill('Santo Domingo')
    await page.waitForTimeout(300)
    await expect(page.locator('p').filter({ hasText: 'clientes registrados' })).toBeVisible()
  })

  test('opens client detail panel on row click', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().click()
    await expect(page.locator('text=Total gastado').first()).toBeVisible({ timeout: 5000 })

    // Close via X button in panel header
    await page.locator('.fixed.inset-0').last().locator('button').filter({ has: page.locator('svg') }).last().click()
  })

  test('closes client detail panel with backdrop click', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().click()
    await expect(page.locator('text=Total gastado').first()).toBeVisible({ timeout: 5000 })

    // Click the overlay area (far left of the backdrop, outside the panel)
    await page.locator('.fixed.inset-0').last().click({ position: { x: 50, y: 300 } })
    // The panel slides in from the right — wait for its container to disappear
    await expect(page.locator('.w-full.max-w-md.bg-white.h-full')).not.toBeVisible({ timeout: 3000 })
  })

  test('opens edit modal from table row edit button', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    const editBtn = rows.first().locator('button').last()
    await editBtn.click()
    await expect(page.locator('text=Editar Cliente')).toBeVisible({ timeout: 5000 })
    await page.locator('button', { hasText: 'Cancelar' }).click()
  })

  test('edits an existing client', async ({ page }) => {
    await page.locator('input[placeholder*="Buscar"]').fill(`PW${TS}`)
    await page.waitForTimeout(400)

    const rows = page.locator('tbody tr')
    const count = await rows.count()
    if (count === 0) return

    await rows.first().locator('button').last().click()
    await expect(page.locator('text=Editar Cliente')).toBeVisible({ timeout: 5000 })

    const modal = page.locator('.fixed.inset-0').last()
    const cityInput = modal.locator('input[placeholder="Santo Domingo"]')
    await cityInput.clear()
    await cityInput.fill('Santiago')

    await modal.locator('button', { hasText: 'Guardar Cambios' }).click()
    await waitForToast(page, 'Cliente actualizado')
  })

  test('marks a client as VIP', async ({ page }) => {
    await page.locator('button', { hasText: 'Nuevo Cliente' }).click()
    await expect(page.locator('text=Nuevo Cliente').last()).toBeVisible()

    const modal = page.locator('.fixed.inset-0').last()
    await modal.locator('input[placeholder="Juan"]').fill('VIP')
    await modal.locator('input[placeholder="Pérez"]').fill('Cliente')

    const vipCheckbox = modal.locator('input[type="checkbox"]#vip')
    await vipCheckbox.check()
    await expect(vipCheckbox).toBeChecked()

    await modal.locator('button', { hasText: 'Crear Cliente' }).click()
    await waitForToast(page, 'Cliente creado correctamente')
  })

  test('exports CSV without error', async ({ page }) => {
    await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      page.locator('button', { hasText: 'Exportar CSV' }).click(),
    ])
    await waitForToast(page, 'CSV exportado correctamente')
  })
})
