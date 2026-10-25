# Phase 2: finishing the online backup

**Done 25 Oct 2026.** Project `nuzzle` (ref `dfpfjivvcqxrjeolkhpo`) lives in the free Nuzzle organisation,
region ap-southeast-2. Both migrations are applied, and `nuzzle_sync` is callable by anon only (the extra
migration takes it away from signed in users). The security advisor's remaining notes are on purpose: the tables
have no policies because nothing reads them directly, and the function has to be public because there are no
accounts. `mobile/.env` holds the address and publishable key.

Everything in the app is built and tested (see `src/core/sync.ts`, `src/services/sync.ts`, the sync part of
`src/state/AppState.tsx`, `src/components/SyncSection.tsx`). Sync stays off until the app knows where the backup lives.

Philip chose a **free Supabase organisation called "Nuzzle"**, kept apart from the Quick-quote organisation
(which is on the Pro plan, where a new project would cost money). The organisation exists.

Steps left:

1. With the Supabase connector allowed to see the Nuzzle organisation, create a project named `nuzzle` in it,
   region `ap-southeast-2` (Perth/Sydney). It must be quoted at $0. Never create it in Quick-quote.
2. Apply `supabase/migrations/20261025000000_nuzzle_sync.sql` (already tested on Postgres 16), then run the
   security advisor and fix anything it flags.
3. Put the project URL and its publishable key (`sb_publishable_...`) in `.env`
   (see `.env.example`; both values are public by design and are committed so the phone build picks them up).
4. Check the function with one call to `/rest/v1/rpc/nuzzle_sync` using a test code, then delete that test family:
   `delete from nuzzle_families where family = encode(sha256(convert_to('<CODE>','UTF8')),'hex');`
5. Commit, push, and tell Philip to rebuild: `git pull`, `npm install`, `npx expo prebuild --clean --platform ios`,
   `npx expo run:ios --device --configuration Release`. Then Settings, Start backup and sharing on her phone,
   Join with a code on his.

## Moving Nuzzle to its own repository

Philip wants Nuzzle apart from Pip Flap (Game repository). Once he has made an empty private repository
`philipn1-sketch/nuzzle` and given Claude access to it:

```
git subtree split --prefix=mobile -b nuzzle-split
git push https://github.com/philipn1-sketch/nuzzle.git nuzzle-split:main
```

`mobile/.github/workflows/nuzzle.yml` and `mobile/README.md` are already written for the new repository's root.
