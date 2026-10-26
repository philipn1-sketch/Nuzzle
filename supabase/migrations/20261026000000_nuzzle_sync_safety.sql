-- Critic round 10: one sync per family at a time (so the change counter can't skip anything),
-- size limits, and safe handling of odd ids and change times. Replaces the function in place.

create or replace function public.nuzzle_sync(
  code text,
  feeds jsonb,
  babies jsonb,
  babies_updated bigint,
  since bigint
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  fam text;
  result jsonb;
begin
  if length(clean) <> 12 then
    raise exception 'family code must be 12 characters';
  end if;
  if jsonb_typeof(coalesce(feeds, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(feeds, '[]'::jsonb)) > 2000
     or octet_length(coalesce(feeds, '[]'::jsonb)::text) > 1000000 then
    raise exception 'too much in one go';
  end if;
  if babies is not null and octet_length(babies::text) > 20000 then
    raise exception 'babies list too large';
  end if;
  fam := encode(sha256(convert_to(clean, 'UTF8')), 'hex');

  insert into public.nuzzle_families (family) values (fam) on conflict (family) do nothing;
  -- one sync at a time per family, so change numbers are handed out in the order changes are saved
  -- and a phone reading "everything after n" can never skip a change still being written
  perform 1 from public.nuzzle_families as nf where nf.family = fam for update;

  if (select count(*) from public.nuzzle_feeds as f where f.family = fam) > 100000 then
    raise exception 'this family is full';
  end if;

  insert into public.nuzzle_feeds (family, id, data, updated_at, seq)
  select fam, f->>'id', f,
    case when jsonb_typeof(f->'updatedAt') = 'number' then floor((f->>'updatedAt')::numeric)::bigint else 0 end,
    nextval('public.nuzzle_seq')
  from jsonb_array_elements(coalesce(feeds, '[]'::jsonb)) as f
  where jsonb_typeof(f) = 'object' and jsonb_typeof(f->'id') = 'string' and length(f->>'id') <= 64
  on conflict (family, id) do update
    set data = excluded.data, updated_at = excluded.updated_at, seq = excluded.seq
    where public.nuzzle_feeds.updated_at < excluded.updated_at;

  if babies is not null and jsonb_typeof(babies) = 'array' and jsonb_array_length(babies) > 0 then
    update public.nuzzle_families as nf
      set babies = nuzzle_sync.babies, babies_updated = nuzzle_sync.babies_updated, seq = nextval('public.nuzzle_seq')
      where nf.family = fam and nf.babies_updated < nuzzle_sync.babies_updated;
  end if;

  select jsonb_build_object(
    'seq', greatest(coalesce((select max(f.seq) from public.nuzzle_feeds as f where f.family = fam), 0), nf.seq),
    'feeds', coalesce(
      (select jsonb_agg(f.data) from public.nuzzle_feeds as f where f.family = fam and f.seq > coalesce(nuzzle_sync.since, 0)),
      '[]'::jsonb
    ),
    'babies', case when nf.seq > coalesce(nuzzle_sync.since, 0) then nf.babies end,
    'babiesUpdated', nf.babies_updated
  )
  into result
  from public.nuzzle_families as nf
  where nf.family = fam;
  return result;
end;
$$;

revoke all on function public.nuzzle_sync(text, jsonb, jsonb, bigint, bigint) from public;
grant execute on function public.nuzzle_sync(text, jsonb, jsonb, bigint, bigint) to anon;
revoke execute on function public.nuzzle_sync(text, jsonb, jsonb, bigint, bigint) from authenticated;
