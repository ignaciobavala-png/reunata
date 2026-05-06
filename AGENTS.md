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
- 3 formularios: fulltime (CV upload), comisionista (movilidad/zonas), proveedor (cargo/empresa/CUIT/web)
- Tabla `postulaciones` con RLS + bucket `cv` en Storage
- Server actions: crear, actualizar estado, eliminar
- Admin panel con tabla de postulaciones, panel de detalle, filtros y búsqueda
- Rate limit: 5 postulaciones/hora por IP
- Validación: longitud de campos, MIME type de CV, formato email
- Página web como texto libre (no URL estricta)
- Fallback a email en tabla admin si nombre es null

### Accordion de formularios (Trabaja con Nosotros)
- Layout accordion con 3 secciones (Fulltime, Comisionista, Proveedor)
- Solo un formulario abierto a la vez (ninguno por defecto)
- Animación suave con framer-motion (AnimatePresence)
- Responsive mobile

### Hero carousel (homepage)
- Tabla `hero_assets` con RLS (lectura pública, internos todo)
- Panel de gestión en Multimedia > Hero: upload, ordenar, activar/desactivar, eliminar
- Editor de contenido por asset: etiqueta, título, subtítulo, botón texto/url (drawer lateral)
- Carousel automático con AnimatePresence, flechas, dots y pausa
- Fallback estático (hero1.jpg) si no hay assets

### CategoryGallery (antes CategoryBento)
- Grilla regular 4 columnas desktop, 2 columnas mobile
- Imagen full-bleed, texto superpuesto inferior izquierdo sin overlay oscuro
- Mini thumbnails de fotos adicionales de productos en cada categoría
- Estilo editorial/fashion premium con tipografía blanca
- +X indicador si hay más fotos

### FloatingActions (botones flotantes)
- 3 botones en esquina inferior derecha: WhatsApp, Ofertas (Reloj), Hot Sale (Fuego)
- Stack vertical, fixed, hover scale
- Solo visible en páginas públicas (oculto en /dashboard)
- Ofertas y Hot Sale abren drawer lateral con animación slide-in
- Drawer claro (max-w-xl) con grid de cards: foto + título + precio + badge descuento
- Mockdata de ofertas (configurable desde panel a futuro)

### Dashboard — bump de legibilidad
- `text-xs` → `text-sm` (12px → 14px)
- `text-sm` → `text-base` (14px → 16px)
- `font-medium` agregado a labels y botones
- Aplicado a 28 archivos del dashboard (admin + cliente + sidebar)

### Frontend — secciones claras
- Contacto y Trabaja con Nosotros: fondo `acero-claro` (platinado azulado) en lugar de negro
- Textos en `granito-oscuro` (negro) para legibilidad
- Inputs con fondo blanco, botones oscuros, placeholder gris
- Secciones estilo platino/editorial minimalista

### Bug fixes de auditoría
- `e.currentTarget` null después de async (capturar form antes del await)
- Optimistic delete sin rollback (guardar y restaurar si falla server action)
- Path de upload con colisión (Date.now() + random suffix)
- Validación de tamaño en uploads (server-side)
- Confirmación de eliminación en Multimedia (evita borrados accidentales)
- Color `--foreground` en lugar de `--color-acero-brillo` en Postulaciones (compatibilidad light/dark)

### Ofertas y Hot Sale (panel + drawer)
- Tabla `ofertas`: id, canal (ofertas|hotsale), producto_id FK, precio_oferta, descuento_porcentaje, orden, activo
- Panel en `/dashboard/admin/ofertas` con:
  - Dropdown Ofertas / Hot Sale
  - Tabla editable: producto, precio lista, precio oferta, % descuento, orden
  - Precio oferta y % descuento se auto-sincronizan
  - Modal selector de producto con búsqueda
- Sidebar: agrupado bajo "Marketing" con Chatbot
- RLS: lectura pública (drawer FloatingActions), CRUD solo master/empleado
- FloatingActions aún usa mockdata (pendiente conectar a DB)

### Redes y contacto
- Link Instagram actualizado a https://www.instagram.com/reunata.ar/
- Todos los links de Instagram abren en nueva ventana (target="_blank")
- WhatsApp actualizado a +54 9 11 3272-0974
- WhatsApp en FloatingActions, Footer, Contacto, Pedidos
- "Trabaja con nosotros" removido del Header, solo en Footer

### Diseño (panel de control)
- Nueva sección "Diseño" en Multimedia > Diseño
- 8 color pickers editables: acero (brillo/claro/medio/oscuro), granito (claro/medio/oscuro), fondo general
- Vista previa en tiempo real al cambiar colores
- Guardado en tabla `configuracion`
- Restaurar colores originales
- Swatch circular clickable que abre el color picker
- `ThemeProvider` inyecta CSS variables en todas las páginas públicas

### Multimedia — tabla de fotos
- Grid visual de productos reemplazado por tabla compacta
- Columnas: Producto, Categoría, Fotos (miniaturas + badge), Acción
- Miniaturas superpuestas de hasta 3 fotos por producto
- Fila seleccionable con highlight, drawer lateral para gestión detallada
- Filtros por categoría y estado (con/sin foto) se mantienen

### Frontend — secciones claras
- Contacto, Trabaja con Nosotros y Nosotros: fondo `acero-claro` en lugar de negro
- Textos en `granito-oscuro` para legibilidad
- Inputs fondo blanco, botones oscuros, placeholder gris
- Cards con `border-2` y padding optimizado
- Secciones estilo platino/editorial minimalista
<!-- END:feactures -->
