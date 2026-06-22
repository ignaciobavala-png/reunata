/**
 * Crea (o resetea) los usuarios de prueba para cada canal.
 * Uso: npx tsx scripts/seed-test-users.ts
 * Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en .env.local
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface TestUser {
  email: string
  password: string
  nombre: string
  rol: string
  canal_id: number
  aprobado: boolean
}

const TEST_USERS: TestUser[] = [
  {
    email: 'test-cf@reunata.com',
    password: 'Test1234!',
    nombre: 'Test Consumidor',
    rol: 'consumidor_final',
    canal_id: 1,
    aprobado: true,
  },
  {
    email: 'test-local@reunata.com',
    password: 'Test1234!',
    nombre: 'Test Local',
    rol: 'local',
    canal_id: 3,
    aprobado: true,
  },
  {
    email: 'test-dist@reunata.com',
    password: 'Test1234!',
    nombre: 'Test Distribuidor',
    rol: 'distribuidor',
    canal_id: 2,
    aprobado: true,
  },
  {
    email: 'test-mercha@reunata.com',
    password: 'Test1234!',
    nombre: 'Test Mercha',
    rol: 'mercha',
    canal_id: 4,
    aprobado: true,
  },
]

async function seedUser(u: TestUser) {
  // Buscar si ya existe
  const { data: existing } = await admin.auth.admin.listUsers()
  const found = existing?.users?.find(x => x.email === u.email)

  let userId: string

  if (found) {
    // Resetear contraseña
    const { error } = await admin.auth.admin.updateUserById(found.id, {
      password: u.password,
      email_confirm: true,
    })
    if (error) throw new Error(`update ${u.email}: ${error.message}`)
    userId = found.id
    console.log(`  ↺  ${u.email} — reseteado`)
  } else {
    // Crear nuevo
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, rol: u.rol },
    })
    if (error || !data.user) throw new Error(`create ${u.email}: ${error?.message}`)
    userId = data.user.id
    console.log(`  +  ${u.email} — creado`)
  }

  // Upsert perfil
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      nombre: u.nombre,
      rol: u.rol,
      canal_id: u.canal_id,
      aprobado: u.aprobado,
    }, { onConflict: 'id' })

  if (profileError) throw new Error(`profile ${u.email}: ${profileError.message}`)
}

async function main() {
  console.log('Seeding usuarios de prueba...\n')
  for (const u of TEST_USERS) {
    await seedUser(u)
  }
  console.log('\nListo. Contraseña para todos: Test1234!')
}

main().catch(err => { console.error(err); process.exit(1) })
