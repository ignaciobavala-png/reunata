import { test, expect } from '@playwright/test'
import { PRODUCT_URL, TIENDA_URL, login, agregarAlCarrito } from './helpers'

test.describe('Consumidor Final — minorista logueado', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test-cf@reunata.com')
  })

  test('ficha de producto muestra precio con IVA incluido', async ({ page }) => {
    await page.goto(PRODUCT_URL)
    await expect(page.getByText('IVA incluido')).toBeVisible()
    // Minorista ve la referencia de precio sin impuestos
    await expect(page.getByText('Precio Bruto')).toBeVisible()
  })

  test('puede agregar al carrito y ve el drawer', async ({ page }) => {
    await agregarAlCarrito(page)
    await expect(page.getByText(/mi carrito/i)).toBeVisible()
  })

  test('carrito muestra total con IVA y botón de MP', async ({ page }) => {
    await agregarAlCarrito(page)
    await page.goto('/carrito')
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
    await expect(page.getByText(/pagar con mercado pago/i)).toBeVisible()
    // El resumen minorista muestra la referencia sin impuestos
    await expect(page.getByText('Precio Bruto')).toBeVisible()
  })

  test('grilla de tienda muestra precios con IVA', async ({ page }) => {
    await page.goto(TIENDA_URL)
    await expect(page.getByText('IVA incluido').first()).toBeVisible()
  })
})
