import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente público (client components): respeita as policies do Supabase, nunca usar
// pra operações que exigem privilégio total.
export const supabasePublic = createClient(supabaseUrl, anonKey);

// Cliente admin (server-only): usado em API routes/server actions pra Storage
// (upload de logo/fotos) e qualquer operação que precise ignorar policies.
// NUNCA importar este arquivo em um componente client.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
