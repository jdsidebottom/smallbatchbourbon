-- Removes everything demo_bottle.sql created.
delete from bottle_retailers where destination_url like 'https://example.com/%';
delete from retailers where slug in ('example-shop', 'dormant-shop');
delete from bottle_relationships where source_bottle_id in (
  select id from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%'
);
delete from sources where entity_id in (
  select id from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%'
);
delete from tasting_profiles where bottle_id in (
  select id from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%'
);
delete from reviews where bottle_id in (
  select id from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%'
);
delete from bottle_prices where bottle_id in (
  select id from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%'
);
delete from bottles where slug like 'example-bourbon%' or slug like 'sample-creek%';
delete from brands where slug in ('example-distilling', 'sample-creek');
