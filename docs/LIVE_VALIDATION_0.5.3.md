# DDS Plugin 0.5.3 — Live validation

Date: **2026-09-16**  
Result: **PASS**  
Status: **LIVE TESTED / APPROVED**

Validated with **BetterDiscord + DDS Companion 0.4.4**.

Observed lifecycle:

- DDS Plugin 0.5.3 reported `RUNNING` with an active heartbeat.
- The heartbeat timestamp refreshed while the plugin remained enabled.
- Disabling DDS wrote `STOPPED` and Companion changed overall Health from `RUNNING` to `LIMITED`.
- The DDS Plugin card changed to `NOT RUNNING`.
- Re-enabling DDS restored the heartbeat and Companion recovered automatically from `LIMITED` to `RUNNING` without a restart or manual refresh.

Validated artifact SHA-256:

`59184c7dfed3644acd9cfcc0f1c228eb491d60474e877366eed70cd42f6582af`

Approval: **LIVE TESTED / APPROVED**.
