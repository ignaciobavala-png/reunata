import { redirect } from 'next/navigation'

export default function OfertasPage() {
  redirect('/dashboard/admin/productos?tab=ofertas')
}
