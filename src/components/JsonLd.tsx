/**
 * Renders a JSON-LD block.
 *
 * `JSON.stringify` output is escaped for `<` so a stray "</script>" inside any
 * editorial string cannot close the element early and turn page copy into
 * markup. Nothing here is executed by the browser — it is data — but the
 * escaping is what makes that true regardless of what an editor types.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
