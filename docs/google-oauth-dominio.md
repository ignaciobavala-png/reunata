# Google OAuth — Configuración con dominio propio

## Estado actual
- App en Google Cloud Console en modo **Testing** hasta que el cliente configure el dominio propio.
- Login con Google funciona para usuarios agregados como "Test users".

## Pendiente cuando el cliente tenga el dominio configurado

### 1. Configurar el dominio en Vercel
- Ir a Vercel → proyecto Reunata → Settings → Domains → Add
- Vercel provee los DNS records (A record o CNAME)

### 2. Verificar el dominio en Google Search Console
- El cliente agrega el dominio como **Domain property** (no URL prefix)
- Google provee un **TXT record** para el DNS
- El cliente pone en su registrador:
  - Los DNS records de Vercel
  - El TXT record de Google Search Console
  - (hacerlo todo junto para tocar el DNS una sola vez)

### 3. Actualizar Google Cloud Console
- APIs & Services → OAuth consent screen
- Cambiar **Página principal** → `https://[dominio-del-cliente]`
- Cambiar **Política de privacidad** → `https://[dominio-del-cliente]/politicas`
- Verificar propiedad del dominio (ya verificado en Search Console)

### 4. Actualizar variables de entorno en Supabase
- Authentication → URL Configuration
- Site URL → `https://[dominio-del-cliente]`
- Additional Redirect URLs → agregar `https://[dominio-del-cliente]/**`

### 5. Publicar la app en Google Cloud Console
- OAuth consent screen → Publishing status → **PUBLISH APP**
- Con dominio propio verificado, Google acepta la publicación sin errores

## Notas
- `reunata.vercel.app` seguirá funcionando como URL secundaria
- El login con Google mostrará "Reunata" sin advertencias una vez publicada la app
- La verificación del dominio en Search Console debe ser **Domain property** (via DNS), no URL prefix
