import { describe, expect, it } from "vitest";
import { parseInline, parseRichText, richTextToPlain } from "./richtext";

describe("parseInline", () => {
  it("keeps plain text as a single node", () => {
    expect(parseInline("just words")).toEqual([{ kind: "text", value: "just words" }]);
  });

  it("splits bold out of surrounding text", () => {
    expect(parseInline("a **b** c")).toEqual([
      { kind: "text", value: "a " },
      { kind: "strong", value: "b" },
      { kind: "text", value: " c" },
    ]);
  });

  it("parses site-relative and https links", () => {
    expect(parseInline("[Eagle Rare](/bourbon/eagle-rare)")).toEqual([
      { kind: "link", value: "Eagle Rare", href: "/bourbon/eagle-rare" },
    ]);
    expect(parseInline("[TTB](https://ttb.gov)")).toEqual([
      { kind: "link", value: "TTB", href: "https://ttb.gov" },
    ]);
  });

  it("refuses javascript: and data: hrefs, keeping the text visible", () => {
    for (const href of ["javascript:alert(1)", "data:text/html,<script>", "//evil.example"]) {
      const [node] = parseInline(`[click](${href})`);
      expect(node.kind).toBe("text");
      expect(node.value).toContain("click");
    }
  });

  it("never emits raw markup for angle brackets", () => {
    // The renderer produces React elements, so this is text either way — but
    // assert it so a future HTML-string shortcut fails loudly.
    expect(parseInline("<script>x</script>")).toEqual([
      { kind: "text", value: "<script>x</script>" },
    ]);
  });
});

describe("parseRichText", () => {
  it("returns nothing for empty input", () => {
    expect(parseRichText(null)).toEqual([]);
    expect(parseRichText("")).toEqual([]);
    expect(parseRichText("   \n\n  ")).toEqual([]);
  });

  it("joins wrapped lines into one paragraph and splits on blank lines", () => {
    const blocks = parseRichText("one\ntwo\n\nthree");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ kind: "paragraph", content: [{ kind: "text", value: "one two" }] });
  });

  it("parses h2 and h3", () => {
    const blocks = parseRichText("## Big\n### Small");
    expect(blocks.map((b) => b.kind === "heading" && b.level)).toEqual([2, 3]);
  });

  it("groups consecutive bullets into one list", () => {
    const blocks = parseRichText("- one\n- two\n- three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "list", ordered: false });
    expect(blocks[0].kind === "list" && blocks[0].items).toHaveLength(3);
  });

  it("does not merge a bulleted list into a numbered one", () => {
    const blocks = parseRichText("1. one\n- two");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: "list", ordered: true });
    expect(blocks[1]).toMatchObject({ kind: "list", ordered: false });
  });

  it("closes a list when a paragraph follows", () => {
    const blocks = parseRichText("- one\nafter");
    expect(blocks.map((b) => b.kind)).toEqual(["list", "paragraph"]);
  });

  it("parses inline formatting inside list items and headings", () => {
    const blocks = parseRichText("## A **bold** heading\n- see [this](/bourbon/x)");
    expect(blocks[0].kind === "heading" && blocks[0].content[1]).toEqual({
      kind: "strong",
      value: "bold",
    });
    expect(blocks[1].kind === "list" && blocks[1].items[0][1]).toEqual({
      kind: "link",
      value: "this",
      href: "/bourbon/x",
    });
  });
});

describe("richTextToPlain", () => {
  it("flattens blocks and drops markup", () => {
    expect(richTextToPlain("## Title\n\nSome **bold** copy.\n\n- a\n- b")).toBe(
      "Title Some bold copy. a b",
    );
  });

  it("truncates with an ellipsis at the limit", () => {
    const out = richTextToPlain("x".repeat(400), 50);
    expect(out).toHaveLength(50);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves short text untouched", () => {
    expect(richTextToPlain("short", 50)).toBe("short");
  });
});
