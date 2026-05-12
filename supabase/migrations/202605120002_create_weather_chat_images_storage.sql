insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'weather-chat-images',
  'weather-chat-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read weather chat images"
on storage.objects;

create policy "Anyone can read weather chat images"
on storage.objects
for select
using (bucket_id = 'weather-chat-images');

drop policy if exists "Anyone can upload weather chat images"
on storage.objects;

create policy "Anyone can upload weather chat images"
on storage.objects
for insert
with check (
  bucket_id = 'weather-chat-images'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
);
