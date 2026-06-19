# Variables de entorno — Reunata

Última actualización: 2026-06-19

## Estado actual en Vercel

| Variable | Entornos | Qué hace |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Prod / Preview / Dev | URL pública del proyecto Supabase. Requerida en cliente y servidor. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod / Preview / Dev | Clave anónima de Supabase para el cliente browser (respeta RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod / Preview / Dev | Clave de servicio de Supabase (bypass RLS). Solo usada server-side. |
| `GESU_API_BASE_URL` | Prod / Preview / Dev | URL base de la API de Gesu (ERP de Reunata). |
| `GESU_API_TOKEN` | Prod / Preview / Dev | Token de autenticación para la API de Gesu. |
| `SYNC_SECRET` | Prod / Preview / Dev | Bearer token para proteger los endpoints `/api/sync/*` (sync manual desde Gesu). |
| `CRON_SECRET` | Production | Bearer token que Vercel Cron incluye al invocar `/api/cron/*`. Acepta también `SYNC_SECRET` como fallback. |
| `MP_ACCESS_TOKEN` | Prod / Dev | Token de acceso MercadoPago. Empieza con `APP_USR-` en producción y `TEST-` en desarrollo. Crea preferencias y consulta pagos. |
| `MP_WEBHOOK_SECRET` | Production | Secret HMAC-SHA256 para verificar que los webhooks vienen de MP. La verificación es opcional: si no está configurado, el webhook los acepta igual (con advertencia en logs). |
| `NEXT_PUBLIC_APP_URL` | Production | URL pública del sitio (`https://reunata.vercel.app`). Usada en `back_urls` y `notification_url` de MercadoPago. |
| `ENVIOPACK_API_KEY` | Prod / Dev | API key de Enviopack para cotización de envíos. |
| `ENVIOPACK_SECRET_KEY` | Prod / Dev | Secret key de Enviopack para autenticación OAuth con su API. |
| `GROQ_API_KEY` | Prod / Preview | API key de Groq para el chatbot interno (`/api/chatbot`). |

## Variables eliminadas

| Variable | Motivo |
|---|---|
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | No se usa. Era para el SDK cliente de MP (Bricks), pero el checkout usa redirección server-side (Checkout Pro). Eliminada el 2026-06-19. |

## Notas

- `NEXT_PUBLIC_APP_URL` solo está en Production. En Preview y Development se usa el fallback `http://localhost:3000` hardcodeado en `src/app/actions/checkout.ts`.
- `CRON_SECRET` solo está en Production porque los crons de Vercel solo corren en producción.
- `GROQ_API_KEY` no está en Development; si se quiere probar el chatbot localmente hay que agregarla al `.env.local`.
