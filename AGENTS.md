<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:deploy-rules -->
## Regla de pushes

- Hacer commits locales a medida que se avanza
- **NO hacer push sin que el usuario lo pida explícitamente**
- Solo pushear cuando los cambios estén consolidados (evitar deploys innecesarios en Vercel)
<!-- END:deploy-rules -->

<!-- BEGIN:feactures -->
## Feactures implementadas

### Postulaciones (Trabaja con Nosotros)
- 2 formularios: fulltime (con CV upload) y comisionista (movilidad/zonas)
- Tabla `postulaciones` con RLS + bucket `cv` en Storage
- Server actions: crear, actualizar estado, eliminar
- Admin panel con tabla de postulaciones, panel de detalle, filtros y búsqueda
- Rate limit: 5 postulaciones/hora por IP
- Validación: longitud de campos, MIME type de CV, formato email

### Hero carousel (homepage)
- Tabla `hero_assets` con RLS (lectura pública, internos todo)
- Panel de gestión en Multimedia > Hero: upload, ordenar, activar/desactivar, eliminar
- Editor de contenido por asset: etiqueta, título, subtítulo, botón texto/url (drawer lateral)
- Carousel automático con AnimatePresence, flechas, dots y pausa
- Fallback estático (hero1.jpg) si no hay assets

### Dashboard — bump de legibilidad
- `text-xs` → `text-sm` (12px → 14px)
- `text-sm` → `text-base` (14px → 16px)
- `font-medium` agregado a labels y botones
- Aplicado a 28 archivos del dashboard (admin + cliente + sidebar)

### Frontend — secciones oscuras
- Contacto y Trabaja con Nosotros: bordes 2px visibles, inputs con bg sólido + shadow-inner
- Labels más grandes (text-sm font-semibold), inputs text-base
- Placeholder más claro (acero vs granito-claro)
- Formularios de postulación compactados para entrar más cercano a una screen

### Bug fixes de auditoría
- `e.currentTarget` null después de async (capturar form antes del await)
- Optimistic delete sin rollback (guardar y restaurar si falla server action)
- Path de upload con colisión (Date.now() + random suffix)
- Validación de tamaño en uploads (server-side)
- Confirmación de eliminación en Multimedia (evita borrados accidentales)
<!-- END:feactures -->
