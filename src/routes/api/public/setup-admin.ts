import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/setup-admin')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { token, email, password } = await request.json()
        if (token !== 'setup-ncbrasil-2026') {
          return new Response('forbidden', { status: 403 })
        }
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { data: list, error: le } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 })
        if (le) return new Response(JSON.stringify({ error: le.message }), { status: 500 })
        const user = list.users.find((u) => u.email === email)
        if (!user) return new Response(JSON.stringify({ error: 'user not found' }), { status: 404 })
        const { error: ue } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
        })
        if (ue) return new Response(JSON.stringify({ error: ue.message }), { status: 500 })
        const { error: pe } = await supabaseAdmin
          .from('profiles')
          .upsert({ id: user.id, is_admin: true }, { onConflict: 'id' })
        if (pe) return new Response(JSON.stringify({ error: pe.message }), { status: 500 })
        return new Response(JSON.stringify({ ok: true, id: user.id }), {
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  },
})
