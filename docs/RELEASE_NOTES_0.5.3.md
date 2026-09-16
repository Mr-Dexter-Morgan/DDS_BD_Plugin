# DDS Plugin 0.5.3 — Plugin Heartbeat

DDS Plugin 0.5.3 adds the local `plugin-heartbeat-v1` contract used by DDS Companion for truthful health reporting.

## Highlights

- immediate `RUNNING` heartbeat on plugin start;
- heartbeat refresh every 30 seconds;
- clean `STOPPED` marker on plugin disable;
- heartbeat metadata advertised in `manifest.json`;
- write failures isolated from the capture pipeline and log-throttled;
- capture schema v2 and existing archive layout remain unchanged.

## Live validation

Validated on 2026-09-16 with BetterDiscord and DDS Companion 0.4.4:

- `RUNNING` detected correctly;
- periodic heartbeat refresh observed;
- disable produced `STOPPED` / Companion `LIMITED`;
- re-enable restored `RUNNING` automatically without Companion restart.

Validated artifact SHA-256:

`59184c7dfed3644acd9cfcc0f1c228eb491d60474e877366eed70cd42f6582af`
