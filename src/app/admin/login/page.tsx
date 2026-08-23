import { LoginForm } from "@/components/admin/LoginForm";
import { safeAdminRedirect } from "@/lib/domain/redirect";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const safeNext = safeAdminRedirect(next);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <p className="eyebrow">Small Batch Bourbon</p>
      <h1 className="mt-3 text-3xl text-cream">Admin sign in</h1>
      <p className="mt-3 text-sm leading-relaxed text-cream-dim">
        Editorial access only. Sessions are checked against the database on every
        request.
      </p>

      <div className="mt-8">
        <LoginForm next={safeNext} />
      </div>
    </div>
  );
}
