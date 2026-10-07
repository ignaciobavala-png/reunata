/**
 * Redimensiona una imagen a `maxLado` y la reencoda como WebP en el navegador,
 * antes de subirla a Storage. Así lo que se guarda con extensión .webp es WebP
 * de verdad (el banner subía el JPEG crudo etiquetado como image/webp).
 */
export function optimizarImagen(archivo: File, maxLado = 1920, calidad = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(archivo)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxLado || height > maxLado) {
        if (width >= height) { height = Math.round((height * maxLado) / width); width = maxLado }
        else { width = Math.round((width * maxLado) / height); height = maxLado }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob falló')), 'image/webp', calidad)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo cargar')) }
    img.src = url
  })
}
