import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1" style={{ background: 'var(--background)' }}>
        {children}
      </main>
      <Footer />
    </>
  )
}
