import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PublicCartDrawer } from '@/components/cliente/PublicCartDrawer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <PublicCartDrawer />
    </div>
  )
}
