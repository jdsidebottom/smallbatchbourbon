export const dynamic = "force-dynamic";

export default function SetupRequiredPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 font-display text-3xl text-cream">Supabase isn&apos;t configured</h1>
      <p className="mt-4 text-sm leading-relaxed text-cream-dim">
        The editorial admin needs a Supabase project. Add the three variables
        below to <code className="text-amber">.env.local</code>, run the
        migrations in <code className="text-amber">supabase/migrations</code>,
        then reload.
      </p>
      <ul className="mt-6 space-y-1 font-mono text-xs text-cream-muted">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
      </ul>
      <p className="mt-6 text-xs leading-relaxed text-cream-muted">
        The service-role key bypasses Row Level Security. It belongs only in
        server-side configuration — never in a NEXT_PUBLIC_ variable.
      </p>
    </div>
  );
}
