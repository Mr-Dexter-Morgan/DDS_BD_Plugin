# DDS Plugin Heartbeat Contract — v1

Status: **stable contract**  
Current producer: **DDS Plugin 0.5.4**  
Current Companion baseline: **DDS Companion 0.8.8**

The heartbeat lets Companion distinguish an active Plugin from stale DDS_Data without guessing from message traffic.

## Location

```text
%APPDATA%\BetterDiscord\DDS_Data\plugin_heartbeat.json
```

## Payload

Representative schema:

```json
{
  "schemaVersion": 1,
  "plugin": "DDS",
  "pluginVersion": "0.5.4",
  "state": "RUNNING",
  "updatedAt": "2026-10-23T00:00:00.000Z",
  "heartbeatIntervalMs": 30000,
  "captureSchemaVersion": 2
}
```

## Semantics

- successful plugin startup writes `RUNNING` immediately;
- while enabled, `RUNNING` refreshes every 30 seconds;
- a clean BetterDiscord stop writes `STOPPED`;
- heartbeat write failure must not stop normal capture/export;
- repeated heartbeat errors are throttled.

## Companion interpretation

DDS Companion uses heartbeat age and explicit state to classify Plugin health:

- fresh `RUNNING` → Plugin RUNNING;
- explicit `STOPPED` → Plugin NOT RUNNING;
- old heartbeat → STALE and later NOT RUNNING according to Companion thresholds;
- missing/invalid heartbeat from a heartbeat-capable plugin → degraded/LIMITED health, not archive corruption.

Discord process detection is a separate Companion health signal. The local archive remains readable even when Discord or Plugin is unavailable.

## Boundary

Heartbeat is local status metadata only. It adds no external telemetry and carries no Discord credential.
