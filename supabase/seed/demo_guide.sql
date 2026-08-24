-- ============================================================================
-- Demo guide seed — LOCAL AND PREVIEW ONLY.
--
-- Requires demo_bottle.sql to have been run first: this guide references those
-- fictional bottles. Nothing here states a fact about a real bourbon, which is
-- the point — the PRD forbids inventing prices, verdicts or tasting notes for
-- real products, and a guide exists to reuse canonical records rather than to
-- author new claims about them.
--
-- To remove it:
--   psql "$DATABASE_URL" -f supabase/seed/demo_guide_teardown.sql
-- ============================================================================

-- ------------------------------------------------------- the buying guide ----

insert into articles (
  slug, title, article_type, excerpt, intro, methodology,
  status, published_at, reviewed_at
)
values (
  'demo-bourbon-under-50',
  'Demo: Best Example Bourbon Under $50',
  'buying_guide',
  'A demonstration buying guide built entirely from fictional bottles. Not editorial advice.',
  'This page exists to demonstrate the guide format. Every bottle in it is invented, and so is every number attached to it.

Real guides work the same way: the picks below pull their proof, reference price, price ladder and verdict straight from the bottle records, so correcting a bottle corrects this page too.',
  'Nothing was tasted, because nothing here exists. A real guide weighs taste, everyday value, availability and batch-to-batch consistency, and says so here.',
  'published',
  now(),
  current_date
)
on conflict (slug) do nothing;

-- ------------------------------------------------------------------ picks ----

-- Rank 1: a bottle with a verified reference price, a tasting profile and
-- Best for / Skip if — exercises every field the pick card can render.
insert into guide_items (article_id, bottle_id, rank, label, rationale)
select a.id, b.id, 1, 'Best overall',
       'Exercises the fully-populated card: verified reference price, a verdict derived from it, a flavour profile and both review lines.'
  from articles a, bottles b
 where a.slug = 'demo-bourbon-under-50'
   and b.slug = 'example-bourbon-small-batch'
on conflict (article_id, bottle_id) do nothing;

-- Rank 2: no verified reference price, no tasting profile, no review lines —
-- the card must degrade to "Not verified" and drop the verdict pill rather
-- than inventing either.
insert into guide_items (article_id, bottle_id, rank, label, rationale)
select a.id, b.id, 2, 'Sparse record',
       'Deliberately thin. With no verified reference price there is no honest verdict to show, so the card shows none.'
  from articles a, bottles b
 where a.slug = 'demo-bourbon-under-50'
   and b.slug = 'sample-creek-single-barrel'
on conflict (article_id, bottle_id) do nothing;

-- --------------------------------------------------------- a Learn page ----

insert into articles (
  slug, title, article_type, excerpt, intro, body, status, published_at, reviewed_at
)
values (
  'demo-reading-a-bourbon-label',
  'Demo: How to read a bourbon label',
  'learn',
  'A demonstration Learn page. Illustrates the format only.',
  'Learn pages carry no bottle picks. They are body copy, and they cite their own sources.',
  '## What the parser supports

Editor copy is written in a small markdown subset and rendered as React elements, never as raw HTML.

- **Bold** for emphasis
- Links, including internal ones such as [our bourbon index](/bourbon)
- Ordered lists

1. Headings at two levels
2. Paragraphs
3. Nothing else — anything unsupported stays literal text

### Why the subset is small

A larger subset would mean either a markdown dependency or an HTML string, and an HTML string would mean article copy could inject markup into the page.',
  'published',
  now(),
  current_date
)
on conflict (slug) do nothing;

insert into sources (entity_table, entity_id, source_type, title, verified_at, internal_notes)
select 'articles', a.id, 'other', 'Demonstration source — not a real citation', current_date,
       'Seeded so the Learn page satisfies the publish gate.'
  from articles a
 where a.slug = 'demo-reading-a-bourbon-label'
   and not exists (
     select 1 from sources s where s.entity_table = 'articles' and s.entity_id = a.id
   );
