# DDS Plugin Architecture

## DDS component model

DDS is one product split into three independently versioned components:

| Component | Responsibility |
|---|---|
| **DDS Plugin** | Capture data that the running Discord client has actually loaded |
| **DDS Companion** | Durable archive, media lifecycle/cache, Library, ZIP export, desktop UI |
| **DDS Installer** | Windows installation, repair and component integration |

Primary data path:

```text
Discord Desktop → BetterDiscord → DDS Plugin → DDS_Data → DDS Companion → SQLite archive
```

DDS Installer sits beside this data path as the setup/repair control plane. It must not own or rewrite the user's archive.

## Plugin responsibilities

### Client context

The plugin resolves the current account, guild, selected channel, effective message channel and forum/thread context through BetterDiscord-accessible Discord stores and route state.

### Message capture

The plugin reads messages already present in Discord's client-side `MessageStore`. It does not independently crawl hidden history or bypass Discord permissions.

Current capture schema: **v2**.

### Local export

The plugin exports JSON-compatible captures under:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

Filesystem paths are based on stable Discord numeric IDs. Human-readable names remain metadata.

### Health contract

`plugin_heartbeat.json` implements `plugin-heartbeat-v1` so Companion can distinguish an active plugin from stale DDS_Data.

### SOURCE_GONE evidence

Plugin 0.5.4 adds `source-evidence-v1`.

For archived Voice/Stage sources, DDS requires **positive deletion proof**. ChannelStore absence alone is never enough. The plugin performs a bounded authenticated Discord audit-log request and accepts only exact `CHANNEL_DELETE` evidence whose target ID matches the archived source. When proof is unavailable, the result stays UNKNOWN.

No Discord credential is written to DDS_Data.

## Companion boundary

DDS Companion owns:

- accumulation/deduplication across captures;
- SQLite storage and migrations;
- media download/cache/re-cache lifecycle;
- SOURCE_GONE terminal lifecycle after imported positive evidence;
- Library, Activity, Health and Settings UI;
- ZIP export;
- application update/rollback.

## Installer boundary

DDS Installer may install or repair Discord/BetterDiscord/DDS Plugin/DDS Companion, but it must preserve:

- `%APPDATA%\BetterDiscord\DDS_Data`;
- `%LOCALAPPDATA%\DDS_Companion`;
- the Companion SQLite archive and user settings unless explicit data removal is requested.

## Reliability rules

- Small failures stay isolated.
- Optional evidence/heartbeat failure must not collapse ordinary capture.
- BetterDiscord runtime assumptions must be validated in the actual client environment.
- Capture/storage/health contract changes require automated checks and live validation before stable promotion.
