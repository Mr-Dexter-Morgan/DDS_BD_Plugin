# DDS Plugin — Discord Data Snatcher

**Current stable:** **DDS Plugin 0.5.4** · BetterDiscord · Windows live-validated.

DDS Plugin is the thin Discord-facing capture layer of the DDS project. It reads only the context already available to the signed-in Discord client, writes structured local capture data into `DDS_Data`, and leaves archive/media/UI responsibilities to DDS Companion.

## DDS components

| Component | Current public version | Role |
|---|---|---|
| **DDS Plugin** | **0.5.4 Stable** | Discord/BetterDiscord capture layer |
| **DDS Companion** | **0.8.8 Stable** | SQLite archive, Library, media lifecycle/cache, ZIP export, desktop UI |
| **DDS Installer** | **v0.9.0-rc.1 Preview** | Windows install/repair orchestration |

Repositories:

- Plugin: https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin
- Companion: https://github.com/Mr-Dexter-Morgan/DDS_Companion
- Installer: https://github.com/Mr-Dexter-Morgan/DDS_Installer

The three components use **independent version numbers**.

## Data flow

```text
Discord Desktop
      ↓
BetterDiscord
      ↓
DDS Plugin
      ↓
%APPDATA%\BetterDiscord\DDS_Data
      ↓
DDS Companion
      ↓
SQLite archive → media cache / ZIP export
```

DDS Installer is the setup/repair control plane around those components; it does not own the user archive.

## Install

Recommended path: use **DDS Installer** when appropriate.

Manual plugin installation:

1. Install Discord Desktop and BetterDiscord.
2. Download `DDS.plugin.js` from the [v0.5.4 release](https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/releases/tag/v0.5.4).
3. Open **Discord → Settings → BetterDiscord → Plugins → Open Plugins Folder**.
4. Copy `DDS.plugin.js` into that folder.
5. Enable **DDS**.

Plugin data is stored locally at:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

## What the Plugin owns

- current account/guild/channel/thread context;
- messages already loaded in Discord's client-side MessageStore;
- structured capture schema v2;
- local ID-addressed JSON export;
- `plugin-heartbeat-v1` for Companion Health;
- bounded `source-evidence-v1` for positive Voice/Stage deletion evidence.

For SOURCE_GONE evidence the plugin may use Discord's authenticated internal RestAPI only for the bounded audit-log proof required by that contract. It does not export credentials or captures to an external service.

## What the Plugin does not own

- the long-term SQLite archive;
- media downloading/caching;
- Library/Health/desktop UI;
- ZIP export;
- Companion updater;
- installation/repair orchestration.

Those belong to DDS Companion or DDS Installer.

## Privacy boundary

DDS Plugin does not intentionally:

- extract Discord passwords or authentication tokens;
- bypass Discord permissions;
- fetch inaccessible message history;
- transmit captured archive data to third-party services;
- download binary attachment media.

It observes the running client and writes local DDS data for the same user.

## Development / validation

There is no build step for the plugin itself. The release artifact is `DDS.plugin.js`.

Every push and pull request runs:

```text
node --check DDS.plugin.js
node --test tests/source_evidence.test.js
```

Current release notes: [docs/releases/RELEASE_NOTES_0.5.4.md](docs/releases/RELEASE_NOTES_0.5.4.md)

Active contracts:

- [Architecture](docs/ARCHITECTURE.md)
- [Capture / storage format](docs/DATA_FORMAT.md)
- [Plugin heartbeat](docs/PLUGIN_HEARTBEAT.md)
- [Security](SECURITY.md)

## Repository layout

```text
DDS.plugin.js
tests/
docs/
  ARCHITECTURE.md
  DATA_FORMAT.md
  PLUGIN_HEARTBEAT.md
  releases/RELEASE_NOTES_0.5.4.md
.github/workflows/syntax-check.yml
README.md
SECURITY.md
```

## License

No separate open-source license has been granted. Public repository visibility alone does not grant general redistribution rights.
