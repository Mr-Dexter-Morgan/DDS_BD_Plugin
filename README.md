# DDS BetterDiscord Plugin

> **DDS — Discord Data Snatcher**  
> *Are you sure your data is secure?*

[![Current version](https://img.shields.io/badge/version-0.5.2-7b7cff)](./RELEASES.md)
[![Status](https://img.shields.io/badge/status-verified%20stable-55d6a2)](./RELEASES.md)
[![BetterDiscord](https://img.shields.io/badge/platform-BetterDiscord-5865F2)](https://betterdiscord.app/)
[![Syntax check](https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/actions/workflows/syntax-check.yml/badge.svg)](https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/actions/workflows/syntax-check.yml)

**DDS_BD_Plugin** is the Discord-facing capture layer of DDS. It observes the Discord Desktop client through BetterDiscord, reads only message data already loaded and visible to the signed-in user, converts that data into a stable structured capture, and exports the current capture locally for **DDS Companion**.

The plugin is intentionally lightweight. Storage, indexing, search, media caching, health monitoring, sync, and UI belong to DDS Companion rather than the Discord plugin.

## Current stable milestone

**v0.5.2 — Disk Export / BetterDiscord filesystem compatibility**

This is the current recommended plugin release. It has been live-validated on Windows with Discord Desktop + BetterDiscord.

Core capabilities:

- current user / guild / channel awareness;
- live channel-switch tracking;
- forum-thread awareness;
- read-only access to messages already present in Discord's `MessageStore`;
- structured JSON-compatible captures;
- local ID-addressed disk export;
- per-target debounce and duplicate-write suppression;
- metadata capture for attachments, embeds, and message references;
- clean lifecycle and listener/timer cleanup;
- graceful compatibility with BetterDiscord's reduced filesystem API.

## Data flow

```text
Discord Desktop
      ↓
BetterDiscord
      ↓
DDS Plugin
      ↓
DDS_Data / JSON
      ↓
DDS Companion
```

DDS Plugin is the **capture adapter**. DDS Companion is the **archive / processing application**.

## Local storage

On the verified Windows setup, DDS writes to:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

The storage layout is ID-addressed so renaming a Discord server, channel, or thread does not change its archive path:

```text
DDS_Data/
├── manifest.json
└── guilds/
    └── <guildId>/
        ├── guild.json
        └── channels/
            └── <channelId>/
                ├── channel.json
                ├── capture.json
                └── threads/
                    └── <threadId>/
                        └── capture.json
```

Human-readable names live inside JSON metadata. Filesystem paths use stable Discord numeric IDs.

## Privacy and scope

DDS is designed around a strict local-first boundary.

The plugin **does**:

- inspect the current Discord client context;
- read messages already loaded by Discord for the current user;
- preserve message text and structural metadata in local captures;
- record attachment/embed metadata and URLs;
- write capture files to local DDS storage.

The plugin **does not**:

- extract Discord credentials or authentication tokens;
- fetch hidden or inaccessible message history;
- impersonate the user to scrape additional data;
- download binary media at this stage;
- send captured data to an external service;
- write to SQLite or Google Drive;
- perform DDS Companion's indexing/search/sync responsibilities.

## Installation

Until the DDS installer is built, installation is manual:

1. Install Discord Desktop and BetterDiscord.
2. Copy `DDS.plugin.js` into the BetterDiscord plugins directory.
3. Open Discord → **Settings → BetterDiscord → Plugins**.
4. Enable **DDS**.
5. DDS will create/update its local `DDS_Data` storage as visible Discord contexts are visited.

The future DDS installer is intentionally a separate project and repository.

## Repository layout

```text
DDS_BD_Plugin/
├── DDS.plugin.js                 # current verified plugin
├── README.md
├── CHANGELOG.md                  # release-by-release history
├── RELEASES.md                   # authoritative validation/status registry
├── CONTRIBUTING.md
├── SECURITY.md
├── docs/
│   ├── ARCHITECTURE.md
│   └── DATA_FORMAT.md
└── .github/
    ├── workflows/
    │   └── syntax-check.yml
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

## Release history

| Version | Status | Milestone |
|---|---|---|
| `0.1.0` | VERIFIED | Foundation / lifecycle / Discord stores |
| `0.2.0` | VERIFIED | Channel Awareness |
| `0.3.0` | VERIFIED | Message Visibility |
| `0.4.0` | SUPERSEDED | Structured Capture |
| `0.4.1` | VERIFIED | Thread Awareness |
| `0.5.0` | BROKEN | First Disk Export attempt |
| `0.5.1` | BROKEN | Runtime-path hotfix attempt |
| `0.5.2` | VERIFIED / STABLE MILESTONE | BetterDiscord-compatible Disk Export |

See [CHANGELOG.md](./CHANGELOG.md) for what changed and [RELEASES.md](./RELEASES.md) for validation status and historical failures.

## Development rules

DDS follows a deliberately conservative release discipline:

1. One clear task per release.
2. A release is not considered stable merely because it builds.
3. Live validation is required before a release becomes recommended.
4. Broken releases remain documented instead of being silently rewritten.
5. Runtime fixes are shipped as a new patch release.
6. The BetterDiscord plugin stays lightweight.
7. Heavy storage, search, media, sync, and UI responsibilities stay in DDS Companion.
8. A small failure must not take down the entire DDS pipeline.

Every push and pull request runs a JavaScript syntax check against `DDS.plugin.js`.

## Authors

**Mr_Dexter_Morgan, Masya**

## License

No open-source license has been selected yet. Until a license is explicitly added, the repository does not grant general permission to copy, modify, or redistribute the code.
