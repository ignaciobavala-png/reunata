import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SyncClient } from './SyncClient'

export default async function SyncPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  return <SyncClient isMaster={profile?.rol === 'master'} />
}
