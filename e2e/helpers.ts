import { Page } from '@playwright/test'

export const PRODUCT_URL = '/tienda/p/4001'
export const TIENDA_URL = '/tienda/merchandising-promocionales'

export async function login(page: Page, email: string, password = 'Test1234!') {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /ingresar/i }).click()
  // Esperar redirección post-login
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 8000 })
}

export async function agregarAlCarrito(page: Page) {
  await page.goto(PRODUCT_URL)
  await page.getByRole('button', { name: /agregar al carrito/i }).click()
  // Esperar que el drawer se abra
  await page.waitForTimeout(800)
}
