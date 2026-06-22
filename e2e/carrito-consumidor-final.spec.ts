import { test, expect } from '@playwright/test'
import { PRODUCT_URL, TIENDA_URL, login, agregarAlCarrito } from './helpers'

test.describe('Consumidor Final — minorista logueado', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test-cf@reunata.com')
  })

  test('ficha de producto muestra precio con IVA incluido', async ({ page }) => {
    await page.goto(PRODUCT_URL)
    await expect(page.getByText('IVA incluido')).toBeVisible()
    // No debe mostrar etiqueta de mayorista
    await expect(page.getByText('Precio s/ IVA')).not.toBeVisible()
  })

  test('puede agregar al carrito y ve el drawer', async ({ page }) => {
    await agregarAlCarrito(page)
    await expect(page.getByText(/mi carrito/i)).toBeVisible()
  })

  test('carrito muestra total con IVA y botón de MP', async ({ page }) => {
    await agregarAlCarrito(page)
    await page.goto('/carrito')
    await expect(page.getByText(/^Total$/i)).toBeVisible()
    await expect(page.getByText(/pagar con mercado pago/i)).toBeVisible()
    // No debe mostrar "s/ IVA" en el total
    await expect(page.getByText(/total s\/ iva/i)).not.toBeVisible()
  })

  test('grilla de tienda muestra precios con IVA', async ({ page }) => {
    await page.goto(TIENDA_URL)
    await expect(page.getByText('IVA incluido').first()).toBeVisible()
  })
})
