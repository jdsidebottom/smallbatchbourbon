-- ============================================================================
-- 0012 - Align existing reviews with their bottle's publication state.
--
-- reviews_public_read (0003) requires reviews.published_at to be set as well as
-- the bottle to be published, and no application code ever set it. Every review
-- written through the admin has therefore been invisible to readers since the
-- feature shipped; only the demo seed set the column, which is what hid it.
--
-- setPublicationStatus now moves the two together, so a bottle published from
-- here on carries its review. That leaves the rows published before this change
-- still hidden until someone happens to re-publish them.
--
-- This aligns them once, using the bottle's own publication timestamp rather
-- than now(), so the review does not claim to have been published today.
--
-- Reviews whose bottle is not published are left alone: the bottle's status
-- already hides them, and nulling the column would discard the date a review
-- previously went public.
-- ============================================================================

update reviews r
   set published_at = b.published_at
  from bottles b
 where b.id = r.bottle_id
   and b.status = 'published'
   and r.published_at is null;
