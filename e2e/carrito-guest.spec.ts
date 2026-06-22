import { test, expect } from '@playwright/test'
import { PRODUCT_URL, TIENDA_URL, agregarAlCarrito } from './helpers'

test.describe('Guest — sin sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test('ficha de producto muestra precio con IVA incluido', async ({ page }) => {
    await page.goto(PRODUCT_URL)
    await expect(page.getByText('IVA incluido')).toBeVisible()
    await expect(page.getByRole('button', { name: /agregar al carrito/i })).toBeVisible()
  })

  test('puede agregar al carrito y ve el drawer', async ({ page }) => {
    await agregarAlCarrito(page)
    // Drawer abierto — debe mostrar el producto
    await expect(page.getByText(/mi carrito/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Yerbera Viajero/i })).toBeVisible()
  })

  test('carrito muestra subtotal y botón para pagar con MP', async ({ page }) => {
    await agregarAlCarrito(page)
    await page.goto('/carrito')
    await expect(page.getByText(/pagar con mercado pago/i)).toBeVisible()
    // Guest ve banner de medios de pago
    await expect(page.getByAltText(/medios de pago/i)).toBeVisible()
  })

  test('grilla de tienda muestra precios con IVA', async ({ page }) => {
    await page.goto(TIENDA_URL)
    await expect(page.getByText('IVA incluido').first()).toBeVisible()
  })
})
