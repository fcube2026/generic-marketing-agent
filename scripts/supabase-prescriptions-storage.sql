-- Prescription storage hardening for Supabase Storage.
-- Run this in the Supabase SQL editor for the project that backs the API.
--
-- The API uses the service-role key and signed URLs only.
-- The bucket must stay private. We intentionally do not create broad
-- authenticated/anon policies for storage.objects in this bucket.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'prescriptions',
  'prescriptions',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Do not add client upload or client download policies here.
-- Private access is enforced through the backend using:
-- 1. service-role key for uploads
-- 2. short-lived signed URLs for reads

select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'prescriptions';