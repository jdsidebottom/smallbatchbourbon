-- ============================================================================
-- 0004 — Bottle media storage.
--
-- Uploads are restricted by MIME type and size at the bucket level, so a
-- mistake in application code cannot turn the bucket into arbitrary file
-- hosting. Filenames are generated server-side.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bottle-media',
  'bottle-media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Bottle images are public to read: they are published editorial assets.
create policy bottle_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'bottle-media');

-- Writes are never performed by a browser-held key. The server uploads with the
-- service role after authorizing the editor, so no insert/update/delete policy
-- is granted to anon or authenticated.
