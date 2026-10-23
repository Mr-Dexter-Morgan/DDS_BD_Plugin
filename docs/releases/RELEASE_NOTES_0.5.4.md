# DDS Plugin 0.5.4

Status: **RELEASED / STABLE / USER ACCEPTED**  
Release date: **2026-10-22**

## Scope

0.5.4 adds verified SOURCE_GONE evidence while preserving the existing capture schema, storage layout and heartbeat contract.

## Changes

- Added bounded `source-evidence-v1` for archived Discord Voice/Stage sources.
- Positive evidence requires an exact guild audit-log `CHANNEL_DELETE` event whose `target_id` matches the archived channel.
- ChannelStore/source absence alone never becomes deletion proof.
- BetterDiscord Webpack resolution rejects generic superagent and selects Discord's authenticated RestAPI.
- Response-wrapper parsing is bounded and does not log tokens, headers, audit actors or reasons.
- Writes `source_evidence.json` sidecars for DDS Companion import.
- Existing capture schema v2 and `plugin-heartbeat-v1` behavior remain intact.

## Validation

Live Discord validation confirmed positive deletion evidence for archived Voice sources. DDS Companion imported that evidence and applied terminal SOURCE_GONE behavior without converting unrelated unresolved media.

GitHub release:

https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/releases/tag/v0.5.4

Validated `DDS.plugin.js` SHA-256:

```text
3add179053cfb7d1f9b11b4c2ebbf52f8236948fac4aab954479679e6559e87b
```

Recommended Companion baseline: **0.8.8 Stable**.
