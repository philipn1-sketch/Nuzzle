-- Delete a family's online copy: the feeds and entries, the babies list, and the family itself.
-- Anyone holding the code can already read and change everything in it, so the code is the right
-- key for deleting it too. Phones still sharing simply start a fresh, empty copy if they sync again.
create or replace function public.nuzzle_delete(code text) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  fam text;
begin
  if length(clean) <> 12 then
    raise exception 'family code must be 12 characters';
  end if;
  fam := encode(sha256(convert_to(clean, 'UTF8')), 'hex');
  -- feeds go with the family (on delete cascade)
  delete from public.nuzzle_families nf where nf.family = fam;
  return found;
end;
$$;

revoke all on function public.nuzzle_delete(text) from public;
grant execute on function public.nuzzle_delete(text) to anon;
revoke execute on function public.nuzzle_delete(text) from authenticated;
