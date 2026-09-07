# Plantillas de correo de Supabase Auth

Los mails de autenticación (recuperar contraseña, confirmar cuenta) **no los
manda la app**: los manda GoTrue, con plantillas que viven en el dashboard de
Supabase (Authentication → Email Templates). Este directorio es el espejo
versionado de esas plantillas, para poder diffearlas y para que el preview de
`pnpm mails:preview` las muestre junto al resto.

Editar el archivo de acá **no cambia nada en producción**: hay que subir el
contenido al dashboard (o vía `PATCH /v1/projects/<ref>/config/auth`, campo
`mailer_templates_recovery_content`).

El link tiene que ser `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`,
nunca `{{ .ConfirmationURL }}`: ese último usa PKCE y falla cuando el mail se
abre en un dispositivo distinto al que pidió el cambio.
