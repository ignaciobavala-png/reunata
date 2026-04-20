import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@reunata.com'
const PASSWORD = process.env.ADMIN_PASSWORD

if (!PASSWORD) {
  console.error('Falta variable de entorno: ADMIN_PASSWORD')
  process.exit(1)
}

const NOMBRE   = 'Gastón (Admin)'

const supabase = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
