# BotManager — Asistente IA en el Dashboard

## Visión general

BotManager es un asistente IA integrado en el dashboard de administración de Reunata. Responde consultas del admin analizando métricas del negocio y explicando el funcionamiento de la plataforma. **No tiene acceso de escritura** y solo puede leer datos agregados (KPIs), no información individual de clientes ni productos.

## Arquitectura

```
ChatbotClient (UI)  →  POST /api/chatbot  →  verificarMaster()
     ↑                                              ↓
     │                                        fetch KPIs (Supabase)
     │                                              ↓
     │                                    system prompt + KPIs + mensajes
     │                                              ↓
     │                                        Groq API (llama-3.3-70b)
     │                                              ↓
     └────────────── stream de tokens ←──────────────┘
```

## Componentes

| Archivo | Tipo | Rol |
|---|---|---|
| `src/app/api/chatbot/route.ts` | API Route (POST) | Verifica master, fetch KPIs, llama a Groq, streamea respuesta |
| `src/app/dashboard/admin/chatbot/page.tsx` | Server Component | Renderiza ChatbotClient |
| `src/app/dashboard/admin/chatbot/ChatbotClient.tsx` | Client Component | UI del chat: burbujas, streaming token por token, auto-scroll |
| `src/components/dashboard/Sidebar.tsx` | Client Component | Ítem "Chatbot" con ícono `Sparkles` (solo master) |

## API Route — `POST /api/chatbot`

### Auth
Usa `verificarMaster()` — mismo patrón que las demás API routes de admin.

### KPIs fetcheados en cada request
- Total de productos activos y cobertura de fotos
- Pedidos agrupados por estado
- Clientes agrupados por canal
- Última sincronización con Gesu (fecha, tipo, registros)

### System prompt
Define rol, contexto del negocio, reglas, y lista de capacidades/restricciones:
- **Puede**: explicar secciones, analizar KPIs, detectar anomalías, sugerir mejoras
- **No puede**: modificar datos, acceder a info individual, inventar estadísticas

### Modelo
- **Groq** con `llama-3.3-70b-versatile`, `temperature: 0.4`, `max_tokens: 2048`
- Streaming activado (`stream: true`)

### Respuesta
- `Content-Type: text/plain; charset=utf-8`
- `ReadableStream` que emite tokens en tiempo real

## UI — ChatbotClient

### Estados
- **Bienvenida**: mensaje inicial con sugerencias
- **Cargando**: spinner antes del primer token
- **Streaming**: texto que se construye token por token
- **Error**: mensaje de error genérico

### Diseño
Sigue el sistema de diseño Acero & Granito:
- Burbuja usuario: fondo `--color-granito`, texto blanco, alineada derecha
- Burbuja asistente: fondo `--color-acero-brillo`, texto `--foreground`, alineada izquierda
- Input: borde `--color-acero-claro`, botón enviar con `--color-granito`
- Disclaimer al pie: "BotManager solo lee métricas agregadas"

## Seguridad

- El endpoint verifica rol `master` en cada request
- Sin persistencia: las conversaciones viven solo en memoria del navegador
- `temperature: 0.4` para minimizar alucinaciones
- System prompt prohíbe explícitamente inventar datos o acceder a información individual
- El Groq client se instancia lazy (`getGroq()`) para no fallar en build si falta la API key

## Variables de entorno

```bash
GROQ_API_KEY=gsk_...    # https://console.groq.com/keys
```

Agregar en `.env.local` (desarrollo) y en Vercel → Settings → Environment Variables (producción).
