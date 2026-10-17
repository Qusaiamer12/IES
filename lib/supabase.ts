import 'server-only';

// Form submissions are stored in Supabase through its REST API (PostgREST).
// The publishable key may only INSERT into the two form tables (Row Level Security); it cannot read them.
const url = () => process.env.SUPABASE_URL?.replace(/\/+$/, '');
const key = () => process.env.SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = () => Boolean(url() && key());

export async function insertRow(table: 'contact_messages' | 'join_requests', row: Record<string, unknown>) {
  const res = await fetch(`${url()}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key()!,
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Supabase insert into ${table} failed: ${res.status} ${await res.text()}`);
}
