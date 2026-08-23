@AGENTS.md

## Pendientes — Resend (mails transaccionales)

- Resend **instalado** (23/08): `resend@6.22.0` + `react-email@6.9.2`, `src/lib/resend.ts` con lazy init, script `pnpm email`, dir `emails/`.
- **Falta `RESEND_API_KEY`** en `.env.local` (está vacía) y en Vercel. Se conecta esta semana.
- Con la key: configurar SMTP en Supabase Auth (`smtp.resend.com`) para que el mail de recuperación llegue a clientes reales, y pasar el flujo a `token_hash` (hoy PKCE en `/auth/callback`, rompe si el link se abre en otro dispositivo).

## Brain-data — leer al inicio de cada sesión nueva

Al comenzar una sesión de trabajo con este proyecto, leer estos archivos del vault personal antes de responder cualquier consulta técnica:

1. `/home/nch/Escritorio/brain-data/skills/perfil-desarrollador/SKILL.md` — stack, convenciones y preferencias del desarrollador
2. `/home/nch/Escritorio/brain-data/proyectos/Reunata/Index.md` — contexto general del proyecto Reunata
3. `/home/nch/Escritorio/brain-data/recursos/guia-supabase-auth.md` — patrones de auth con Supabase (relevante por historial de bugs OAuth)

Estos archivos complementan el AGENTS.md con contexto del desarrollador que no está en el código.
