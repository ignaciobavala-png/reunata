import { Page } from '@playwright/test'

export const PRODUCT_URL = '/tienda/p/4001'
export const TIENDA_URL = '/tienda/merchandising-promocionales'

export async function login(page: Page, email: string, password = 'Test1234!') {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 10000 })
}

export async function agregarAlCarrito(page: Page) {
  await page.goto(PRODUCT_URL)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  // Esperar header del drawer (Zustand hidrata en cliente)
  await page.getByText(/mi carrito|mi pedido/i).waitFor({ timeout: 8000 })
  // Esperar que los ítems del drawer se rendericen
  await page.waitForLoadState('networkidle')
}
