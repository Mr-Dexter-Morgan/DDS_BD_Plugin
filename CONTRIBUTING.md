# Contributing to DDS BetterDiscord Plugin

Thanks for helping improve DDS.

DDS uses a conservative release process because the plugin runs inside Discord Desktop and depends on BetterDiscord runtime behavior that can differ from normal Node.js.

## Before changing code

Please keep these boundaries intact:

- the plugin stays lightweight;
- it only reads Discord data available to the signed-in client context;
- it does not extract credentials or tokens;
- it does not fetch hidden/inaccessible history;
- it does not transmit captured data externally;
- SQLite, search, media caching, Drive sync, and desktop UI belong to DDS Companion.

## Development workflow

1. Create a focused branch.
2. Keep one clear technical goal per release/change set.
3. Run a syntax check:

```bash
node --check DDS.plugin.js
```

4. Test the relevant behavior in Discord Desktop + BetterDiscord when the change depends on runtime behavior.
5. Update `CHANGELOG.md` when behavior changes.
6. Update `RELEASES.md` only after the release's validation status is known.
7. Open a pull request with the test evidence.

## Release discipline

A version is not stable merely because it compiles.

Use the following states:

- `VERIFIED`
- `VERIFIED / STABLE MILESTONE`
- `SUPERSEDED`
- `BROKEN`

If a released build fails at runtime, keep that release documented and fix the defect in a new patch version. Do not silently rewrite release history.

## Coding expectations

- Comments should explain **why**, not restate obvious syntax.
- Guard optional runtime APIs instead of assuming full Node.js availability.
- Isolate failures where practical.
- Clean up listeners, timers, patches, and pending work during `stop()`.
- Preserve compatibility with the documented capture/storage boundary.
- Do not introduce heavy dependencies into the BetterDiscord plugin without a strong reason.

## Pull request checklist

- [ ] Scope is focused.
- [ ] `node --check DDS.plugin.js` passes.
- [ ] BetterDiscord runtime assumptions were tested when relevant.
- [ ] Existing capture/storage behavior remains compatible or the schema change is documented.
- [ ] No credential/token collection was introduced.
- [ ] No hidden-history/network fetching was introduced unintentionally.
- [ ] Changelog/docs are updated where appropriate.
