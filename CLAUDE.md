@AGENTS.md

## Mails transaccionales (Resend) — al 10/09/2026

- Resend conectado: `resend@6.22.0` + `react-email@6.9.2`, `src/lib/resend.ts` con
  lazy init, script `pnpm email`. **Los templates viven en `src/emails/`**, con el
  layout institucional en `_layout.tsx` — el diseño va ahí, no en cada template.
- `RESEND_API_KEY` y `RESEND_FROM_EMAIL` **ya están** en `.env.local`. Falta
  confirmar que estén también en Vercel.
- `EMAIL_AVISOS_INTERNOS` **no está seteada**: los avisos internos caen al default
  `bombillas@reunata.com.ar` (ver `src/lib/emails/enviar.ts`).
- El flujo `token_hash` **ya está hecho** (`src/app/auth/confirm/route.ts`). El
  `exchangeCodeForSession` de `/auth/callback` sigue existiendo y está bien: ese es
  el de OAuth, que sí usa PKCE.
- Pendiente real: configurar **SMTP en Supabase Auth** (`smtp.resend.com`) para que
  los mails de auth salgan por Resend y lleguen a clientes reales. No verificado
  desde el código — hay que mirarlo en el dashboard de Supabase.

Regla al escribir un mail nuevo: se envía **siempre después** de que la escritura en
la base salió bien, nunca antes. `enviarMail` se traga sus errores a propósito —
un pedido o una reserva son hechos consumados y no tienen por qué romperse porque
Resend esté caído.

## Containers — preventa de importados (rama `new-gesu`)

Trabajo en curso, **sin pushear hasta que sea un beta usable**. Estado detallado en
`~/Escritorio/containers-estado-10-09.txt`.

- Un viaje = una **subcuenta de GESU** (stock independizado, mismos códigos de
  artículo). Las etapas, los descuentos y los permisos son nuestros: la API de GESU
  es un catálogo plano que no sabe de viajes.
- **No es una sección**: es un badge sobre la foto en la card, que abre un panel con
  los colores de cada viaje y el precio con descuento de etapa. No hay catálogo
  duplicado porque el producto es el mismo.
- La **etapa la avanza una persona** desde el panel, nunca el calendario.
- Arranca **sin usar la API de las subcuentas**, que hoy devuelven `API no disponible
  para el plan gratuito`. Los ítems se cargan con el selector del catálogo.
- Lo que toque preventa tiene que respetar `producto_canales` (visibilidad + múltiplo
  de bulto), igual que la tienda, y revalidarlo server-side.

## Brain-data — leer al inicio de cada sesión nueva

Al comenzar una sesión de trabajo con este proyecto, leer estos archivos del vault personal antes de responder cualquier consulta técnica:

1. `/home/nch/Escritorio/brain-data/skills/perfil-desarrollador/SKILL.md` — stack, convenciones y preferencias del desarrollador
2. `/home/nch/Escritorio/brain-data/proyectos/Reunata/Index.md` — contexto general del proyecto Reunata
3. `/home/nch/Escritorio/brain-data/recursos/guia-supabase-auth.md` — patrones de auth con Supabase (relevante por historial de bugs OAuth)

Estos archivos complementan el AGENTS.md con contexto del desarrollador que no está en el código.
