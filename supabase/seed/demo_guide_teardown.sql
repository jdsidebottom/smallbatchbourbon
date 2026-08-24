-- Removes everything demo_guide.sql created. Safe to run before the bottle
-- teardown; guide_items cascade from articles anyway.
delete from sources where entity_table = 'articles' and entity_id in (
  select id from articles where slug like 'demo-%'
);
delete from guide_items where article_id in (
  select id from articles where slug like 'demo-%'
);
delete from articles where slug like 'demo-%';
