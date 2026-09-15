# DDS Plugin Heartbeat Contract — v1

Status: **candidate contract for DDS Plugin 0.5.3 / DDS Companion 0.4.4**

The heartbeat exists only so DDS Companion can distinguish these states without guessing from message traffic:

- plugin is enabled and alive;
- plugin was cleanly disabled;
- plugin/Discord disappeared without a clean shutdown;
- DDS_Data exists but its producer is no longer active.

The heartbeat does **not** change capture semantics and does not add any network activity.

## Location

```text
DDS_Data/plugin_heartbeat.json
```

`manifest.json` advertises:

```json
{
  "capabilities": ["plugin-heartbeat-v1"],
  "pluginHeartbeat": {
    "schemaVersion": 1,
    "file": "plugin_heartbeat.json",
    "intervalMs": 30000
  }
}
```

## Heartbeat payload

```json
{
  "schemaVersion": 1,
  "plugin": "DDS",
  "pluginVersion": "0.5.3",
  "state": "RUNNING",
  "updatedAt": "2026-09-16T00:00:00.000Z",
  "heartbeatIntervalMs": 30000,
  "captureSchemaVersion": 2
}
```

Required semantics:

- On successful startup, write `RUNNING` immediately.
- While enabled, refresh `RUNNING` every 30 seconds.
- On clean BetterDiscord `stop()`, cancel the timer and write `STOPPED` once.
- Failure to refresh heartbeat must never abort Structured Capture or Disk Export.
- Repeated heartbeat-write failures should not spam logs.

## Companion interpretation

DDS Companion 0.4.4 uses the advertised interval with conservative minimum thresholds:

- fresh `RUNNING` -> `RUNNING`;
- explicit `STOPPED` -> `NOT RUNNING`;
- old heartbeat -> `STALE`, then `NOT RUNNING` if it ages further;
- heartbeat-capable plugin with missing/invalid heartbeat -> `LIMITED`;
- older stable plugin without this capability -> `UPDATE AVAILABLE`, not a false failure.

The local archive remains usable when the plugin is unavailable. Overall Health may become `LIMITED`, but this state is not equivalent to a Companion application error.

## Release discipline

This contract is not considered stable merely because it builds. Plugin 0.5.3 must pass live BetterDiscord enable/disable/re-enable testing together with Companion 0.4.4 before merge/release promotion.
