import Link from "next/link";
import { parseRichText, type Block, type InlineNode } from "@/lib/domain/richtext";

/**
 * Renders editor-written copy as React elements. The parser produces a typed
 * tree rather than an HTML string, so there is no `dangerouslySetInnerHTML`
 * here and no path by which article copy can inject markup into the page.
 */
function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.kind === "strong") return <strong key={index}>{node.value}</strong>;
        if (node.kind === "link") {
          // Internal links stay client-routed; external ones get the usual
          // rel treatment.
          return node.href.startsWith("/") ? (
            <Link key={index} href={node.href}>
              {node.value}
            </Link>
          ) : (
            <a key={index} href={node.href} rel="noopener noreferrer" target="_blank">
              {node.value}
            </a>
          );
        }
        return <span key={index}>{node.value}</span>;
      })}
    </>
  );
}

function renderBlock(block: Block, index: number) {
  if (block.kind === "heading") {
    return block.level === 2 ? (
      <h2 key={index}>
        <Inline nodes={block.content} />
      </h2>
    ) : (
      <h3 key={index}>
        <Inline nodes={block.content} />
      </h3>
    );
  }

  if (block.kind === "list") {
    const items = block.items.map((item, itemIndex) => (
      <li key={itemIndex}>
        <Inline nodes={item} />
      </li>
    ));
    return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
  }

  return (
    <p key={index}>
      <Inline nodes={block.content} />
    </p>
  );
}

/** Body copy with the site's long-form typography, matching the policy pages. */
export function RichText({
  source,
  className = "",
}: {
  source: string | null | undefined;
  className?: string;
}) {
  const blocks = parseRichText(source);
  if (blocks.length === 0) return null;

  return (
    <div
      className={[
        "space-y-5 text-[1.0625rem] leading-relaxed text-cream-dim",
        "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-cream",
        "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:text-cream",
        "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6",
        "[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6",
        "[&_strong]:text-cream",
        "[&_a]:text-amber [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-amber-glow",
        className,
      ].join(" ")}
    >
      {blocks.map(renderBlock)}
    </div>
  );
}
