export function supabaseImg(
  supabaseUrl: string,
  path: string,
  _width?: number,
  _options?: { height?: number; bucket?: string }
): string {
  const bucket = _options?.bucket ?? 'multimedia'
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}
