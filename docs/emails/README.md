# Plantillas de correo de Supabase Auth

Los mails de autenticación (recuperar contraseña, confirmar cuenta) **no los
manda la app**: los manda GoTrue, con plantillas que viven en el dashboard de
Supabase (Authentication → Email Templates). Este directorio es el espejo
versionado de esas plantillas, para poder diffearlas y para que el preview de
`pnpm mails:preview` las muestre junto al resto.

Editar el archivo de acá **no cambia nada en producción**: hay que subir el
contenido al dashboard (o vía `PATCH /v1/projects/<ref>/config/auth`, campo
`mailer_templates_recovery_content`).

El link tiene que ser `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=<tipo>`,
nunca `{{ .ConfirmationURL }}`: ese último usa PKCE y falla cuando el mail se
abre en un dispositivo distinto al que pidió la acción.

| Archivo | Plantilla | `type=` | Termina en |
|---|---|---|---|
| `supabase-recovery.html` | Reset Password | `recovery` | `/nueva-contrasena` |
| `supabase-invite.html` | Invite user | `invite` | `/nueva-contrasena` |
| `supabase-confirmation.html` | Confirm signup | `email` | `/cuenta` |
| `supabase-magic-link.html` | Magic Link | `magiclink` | `/cuenta` |
| `supabase-email-change.html` | Change Email Address | `email_change` | `/cuenta` |

Los destinos los resuelve `src/app/auth/confirm/route.ts`, no el link.

**Cuidado con el PATCH del Management API**: los campos `smtp_*` son un bloque.
Mandar uno solo (por ejemplo `smtp_admin_email`) borra los demás y el proyecto
vuelve al mailer incluido —2 mails por hora— sin ningún aviso. Mandarlos
siempre todos juntos.
