# DDS Plugin — Release Status Registry

Project: **DDS — Discord Data Snatcher**  
Component: **BetterDiscord Plugin**  
Authors: **Mr_Dexter_Morgan, Masya**

This file is the authoritative status index for DDS BetterDiscord Plugin releases.

## Status legend

- **VERIFIED** — passed the intended live test for that release scope.
- **VERIFIED / STABLE MILESTONE** — live-verified and considered a stable architectural milestone.
- **VERIFIED / LIVE TESTED** — passed the intended live BetterDiscord validation and is eligible for normal use/release publication.
- **CANDIDATE / AWAITING LIVE VALIDATION** — code and automated checks exist, but the release must not be recommended/published as stable yet.
- **SUPERSEDED** — historically valid for its original scope but replaced by a later release.
- **BROKEN** — contains a confirmed runtime defect and must not be recommended for normal use.

## Release history

| Version | Date | Status | Scope / result |
|---|---|---|---|
| `0.1.0` | 2026-09-12 | **VERIFIED** | Foundation: lifecycle, scoped `BdApi`, Discord stores, current user/guild/channel detection, clean stop behavior. |
| `0.2.0` | 2026-09-12 | **VERIFIED** | Channel Awareness: selected guild/channel tracking, store subscriptions, debounce, transition logging. |
| `0.3.0` | 2026-09-12 | **VERIFIED** | Message Visibility: read-only access to already-loaded `MessageStore` data; live scrolling confirmed local store growth. |
| `0.4.0` | 2026-09-13 | **SUPERSEDED** | Structured Capture introduced; ordinary channels worked, but live testing exposed a forum-thread context edge case. |
| `0.4.1` | 2026-09-13 | **VERIFIED** | Thread Awareness: route-aware effective thread context with correct parent/thread separation. |
| `0.5.0` | 2026-09-13 | **BROKEN** | First Disk Export implementation; BetterDiscord renderer runtime failed around `require("os")`. |
| `0.5.1` | 2026-09-13 | **BROKEN** | Export-root hotfix; subsequent live testing showed BetterDiscord's fs polyfill lacked `openSync()`. |
| `0.5.2` | 2026-09-13 | **VERIFIED / STABLE MILESTONE** | BetterDiscord-compatible Disk Export live verified on Windows. |
| `0.5.3` | 2026-09-16 | **VERIFIED / LIVE TESTED** | `plugin-heartbeat-v1` live verified with Companion 0.4.4: RUNNING, periodic refresh, STOPPED, LIMITED, and automatic recovery. Capture semantics unchanged. |
| `0.5.4` | 2026-10-22 | **VERIFIED / RELEASED / USER ACCEPTED** | `source-evidence-v1`: authenticated Discord RestAPI, exact CHANNEL_DELETE proof, Companion SOURCE_GONE terminal lifecycle live accepted. |

## Current recommended release

**`0.5.4`**

Promoted on 2026-10-22 after live BetterDiscord evidence validation and Companion 0.8.7 SOURCE_GONE user acceptance.

Release: https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/releases/tag/v0.5.4

## 0.5.4 validation summary

- BetterDiscord resolved Discord's authenticated RestAPI rather than generic superagent.
- Exact `CHANNEL_DELETE` audit evidence was matched for two archived GUILD_VOICE sources.
- `source_evidence.json` sidecars were imported by Companion.
- Companion 0.8.7 live gate confirmed `UNRESOLVED → SOURCE_GONE`, terminal retry blocking and cached-file priority.
- Unrelated historical unresolved media remained unresolved without positive evidence.
- GitHub Release asset SHA-256: `3add179053cfb7d1f9b11b4c2ebbf52f8236948fac4aab954479679e6559e87b`.
- User approval: **LIVE TESTED / ACCEPTED / RELEASED**.

## 0.5.3 validation summary

- Live-tested with BetterDiscord and DDS Companion 0.4.4.
- Companion detected Plugin 0.5.3 as RUNNING with active heartbeat.
- Heartbeat timestamp advanced while enabled.
- Disabling DDS wrote STOPPED and changed Companion Health to LIMITED / NOT RUNNING.
- Re-enabling DDS restored RUNNING automatically without a Companion restart.
- Validated artifact SHA-256: `59184c7dfed3644acd9cfcc0f1c228eb491d60474e877366eed70cd42f6582af`.
- User approval: **LIVE TESTED / APPROVED**.

## Release policy

1. Each release should have one clear scope.
2. A build is not automatically considered stable.
3. Live validation determines release status.
4. Broken releases remain documented for traceability.
5. Runtime fixes are shipped as new patch releases rather than rewriting history.
6. The BetterDiscord plugin remains the thin Discord-facing capture layer.
7. Heavy storage, media, search, sync and UI concerns belong to DDS Companion.
8. Changes that alter capture/storage/health contracts must be documented explicitly.
9. **Every plugin code change bumps the plugin version, is documented in GitHub, is tested, and receives its own GitHub Release only after successful live validation.**

## Stable storage milestone

`0.5.2` remains the first verified persistent local-storage milestone. `0.5.3` builds on that storage layer without changing capture schema or archive layout.

Verified Windows storage root:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

Media remains metadata-only. Attachment and embed metadata/URLs are preserved, but binary media is not downloaded by the plugin.
