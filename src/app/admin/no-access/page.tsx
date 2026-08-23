export default function NoAccessPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 text-3xl text-cream">No editorial access</h1>
      <p className="mt-4 text-sm leading-relaxed text-cream-dim">
        This account is signed in but has no active editorial role. Ask an
        administrator to add it before trying again.
      </p>
      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="min-h-12 rounded-full border border-ink-line px-6 text-sm font-semibold tracking-[0.12em] text-cream uppercase transition hover:border-amber hover:text-amber"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
