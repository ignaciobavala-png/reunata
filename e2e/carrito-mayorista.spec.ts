import { test, expect } from '@playwright/test'
import { PRODUCT_URL, TIENDA_URL, login, agregarAlCarrito } from './helpers'

test.describe('Mayorista (local) — logueado y aprobado', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test-local@reunata.com')
  })

  test('ficha de producto muestra precio sin IVA', async ({ page }) => {
    await page.goto(PRODUCT_URL)
    await expect(page.getByText('Precio s/ IVA')).toBeVisible()
    await expect(page.getByText('IVA incluido')).not.toBeVisible()
  })

  test('puede agregar al carrito y ve el drawer con label "Mi pedido"', async ({ page }) => {
    await agregarAlCarrito(page)
    await expect(page.getByText(/mi pedido/i)).toBeVisible()
  })

  test('carrito muestra "Total s/ IVA" y opción de pedido borrador', async ({ page }) => {
    await agregarAlCarrito(page)
    await page.goto('/carrito')
    await expect(page.getByText(/total s\/ iva/i)).toBeVisible()
    // Mayorista ve botón de WhatsApp, no MP
    await expect(page.getByRole('link', { name: /pedir por whatsapp/i })).toBeVisible()
    // No debe ver botón de MP
    await expect(page.getByText(/pagar con mercado pago/i)).not.toBeVisible()
  })

  test('grilla de tienda muestra precios sin IVA', async ({ page }) => {
    await page.goto(TIENDA_URL)
    await expect(page.getByText('Precio s/ IVA').first()).toBeVisible()
  })
})
