/**
 * A deliberately small markdown subset for editor-written body copy.
 *
 * This parses to a typed tree that the renderer turns into React elements. It
 * never produces an HTML string, so `dangerouslySetInnerHTML` is not involved
 * anywhere and editorial copy cannot inject markup into the page — which also
 * means the CSP does not have to loosen to accommodate article bodies.
 *
 * The supported subset is what editorial copy actually needs: headings, lists,
 * paragraphs, bold, and links. Anything else stays literal text rather than
 * silently disappearing.
 */

export type InlineNode =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "link"; value: string; href: string };

export type Block =
  | { kind: "heading"; level: 2 | 3; content: InlineNode[] }
  | { kind: "paragraph"; content: InlineNode[] }
  | { kind: "list"; ordered: boolean; items: InlineNode[][] };

const HEADING = /^(#{2,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+[.)]\s+(.*)$/;

// Bold before link, so `**[a](b)**` bolds rather than half-matching.
const INLINE = /(\*\*(?!\s)([^*]+?)\*\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

/**
 * Only http(s) and site-relative links are emitted. Anything else — `javascript:`
 * above all — renders as plain text, so a paste from an untrusted source cannot
 * become a live hostile link.
 */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https?:\/\/[^\s]+$/i.test(href)) return href;
  return null;
}

export function parseInline(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  INLINE.lastIndex = 0;
  for (let match = INLINE.exec(input); match !== null; match = INLINE.exec(input)) {
    if (match.index > cursor) {
      nodes.push({ kind: "text", value: input.slice(cursor, match.index) });
    }

    if (match[2] !== undefined) {
      nodes.push({ kind: "strong", value: match[2] });
    } else {
      const href = safeHref(match[5] ?? "");
      nodes.push(
        href
          ? { kind: "link", value: match[4], href }
          : // Keep the original text so the editor can see what was rejected.
            { kind: "text", value: match[3] },
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < input.length) nodes.push({ kind: "text", value: input.slice(cursor) });
  return nodes;
}

export function parseRichText(source: string | null | undefined): Block[] {
  if (!source) return [];

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", content: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({
      kind: "list",
      ordered: list.ordered,
      items: list.items.map(parseInline),
    });
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        content: parseInline(heading[2]),
      });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);

    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      // A bulleted line directly after a numbered one starts a new list rather
      // than joining the wrong kind.
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet?.[1] ?? numbered?.[1] ?? "").trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/** Plain text, for meta descriptions and excerpt fallbacks. */
export function richTextToPlain(source: string | null | undefined, limit = 300): string {
  const text = parseRichText(source)
    .flatMap((block) =>
      block.kind === "list"
        ? block.items.map((item) => item.map((node) => node.value).join(""))
        : [block.content.map((node) => node.value).join("")],
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
