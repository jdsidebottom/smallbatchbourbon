import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col justify-center px-5 py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-4xl leading-tight text-cream sm:text-5xl">
        This one&apos;s not on the shelf.
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-cream-dim">
        The page you were looking for doesn&apos;t exist, or it moved. Here&apos;s where to
        go instead.
      </p>

      <ul className="mt-9 space-y-1">
        {[
          { label: "Home", href: "/" },
          { label: "What We'd Pay", href: "/#what-wed-pay" },
          { label: "Proof and Perspective", href: "/#proof-and-perspective" },
          { label: "About", href: "/about" },
          { label: "Contact", href: "/contact" },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-[3rem] items-center border-b border-ink-line text-cream-dim transition hover:text-amber"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
