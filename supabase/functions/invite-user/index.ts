import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { email, full_name, role } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: 'https://auto-gestion-pro.vercel.app',
  })

  if (error) return new Response(JSON.stringify({ error: error.message }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

  // Crear perfil inmediatamente
  await supabase.from('profiles').upsert({
    id: data.user.id,
    full_name,
    role: role ?? 'vendedor',
  })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
