import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const VALID_ROLES = ['admin', 'petugas', 'guru', 'kepala_sekolah']

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Tidak diizinkan' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify the caller's JWT and confirm they are an admin.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: 'Sesi tidak valid' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const callerId = callerData.user.id

    const { data: callerRoles, error: rolesErr } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
    if (rolesErr || !callerRoles?.some((r) => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Hanya Admin yang dapat menambah pengguna' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validate input
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const fullName = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
    const role = typeof body?.role === 'string' ? body.role : ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email tidak valid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Kata sandi minimal 6 karakter' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!fullName) {
      return new Response(JSON.stringify({ error: 'Nama lengkap wajib diisi' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!VALID_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'Peran tidak valid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create the auth user (auto-confirmed so they can sign in right away).
    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'Gagal membuat pengguna'
      const friendly = /already been registered|already exists/i.test(msg)
        ? 'Email sudah terdaftar'
        : msg
      return new Response(JSON.stringify({ error: friendly }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const newId = created.user.id

    // The signup trigger creates the profile and a default 'guru' role.
    // Update the profile name and replace the default role with the chosen one.
    await serviceClient.from('profiles').update({ full_name: fullName, email }).eq('id', newId)
    await serviceClient.from('user_roles').delete().eq('user_id', newId)
    const { error: roleErr } = await serviceClient
      .from('user_roles')
      .insert({ user_id: newId, role })
    if (roleErr) {
      return new Response(JSON.stringify({ error: 'Pengguna dibuat, tetapi gagal mengatur peran: ' + roleErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true, user: { id: newId, email, full_name: fullName, role } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Terjadi kesalahan' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
