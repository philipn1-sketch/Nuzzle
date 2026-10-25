-- Supabase grants execute on new functions to authenticated by default. The app has no accounts,
-- so only anon (the app's publishable key) needs nuzzle_sync.
revoke execute on function public.nuzzle_sync(text, jsonb, jsonb, bigint, bigint) from authenticated;
