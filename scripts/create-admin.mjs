import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = 'https://znmqvjxdnslrrvsjquej.supabase.co'
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpubXF2anhkbnNscnJ2c2pxdWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUxMzEzOCwiZXhwIjoyMDkyMDg5MTM4fQ.iwT0P6NCA9Gu6pxrpwFklkdafOw-HJ0cmidfklQ5sIY'

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAIL    = 'admin@reunata.com'
const PASSWORD = '***REMOVED***'
const NOMBRE   = 'Gastón (Admin)'

const { data, error } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { rol: 'master', nombre: NOMBRE },
})

if (error) {
  if (error.message?.includes('already been registered')) {
    console.log('⚠  El usuario ya existe. Actualizando nombre y rol...')
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', EMAIL)
      .single()
    if (existing) {
      await supabase.from('profiles').update({ rol: 'master', nombre: NOMBRE }).eq('id', existing.id)
      console.log('✓ Perfil actualizado a master.')
    }
  } else {
    console.error('✗ Error:', error.message)
    process.exit(1)
  }
} else {
  await supabase.from('profiles').update({ nombre: NOMBRE }).eq('id', data.user.id)
  console.log('✓ Usuario admin creado exitosamente.')
}

console.log(`\n  Email:    ${EMAIL}`)
console.log(`  Password: ${PASSWORD}\n`)
