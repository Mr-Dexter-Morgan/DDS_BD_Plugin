# DDS Plugin — Release Status Registry

Project: **DDS — Discord Data Snatcher**  
Component: **BetterDiscord Plugin**  
Authors: **Mr_Dexter_Morgan, Masya**

This file is the authoritative status index for DDS BetterDiscord Plugin releases.

## Status legend

- **VERIFIED** — passed the intended live test for that release scope.
- **VERIFIED / STABLE MILESTONE** — live-verified and considered a stable architectural milestone.
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
| `0.5.2` | 2026-09-13 | **VERIFIED / STABLE MILESTONE** | BetterDiscord-compatible Disk Export live verified on Windows; current recommended plugin release. |
| `0.5.3` | pending live test | **CANDIDATE / AWAITING LIVE VALIDATION** | Adds `plugin-heartbeat-v1` for truthful Companion health: immediate/periodic RUNNING heartbeat and clean STOPPED marker. Capture semantics unchanged. |

## Current recommended release

**`0.5.2`**

Use this version for normal development and live testing until 0.5.3 explicitly earns VERIFIED status.

## Current candidate

**`0.5.3` — Plugin Heartbeat v1**

Candidate rules:

1. Keep 0.5.2 as stable/recommended during testing.
2. Test 0.5.3 in real BetterDiscord together with DDS Companion 0.4.4.
3. Verify enable -> RUNNING heartbeat, disable -> STOPPED, re-enable -> recovery.
4. Verify ordinary Structured Capture / Disk Export still works.
5. Only after live validation: merge/promote and create a GitHub Release.

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

`0.5.2` remains the first verified persistent local-storage milestone.

Verified Windows storage root:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

Media remains metadata-only. Attachment and embed metadata/URLs are preserved, but binary media is not downloaded by the plugin.
