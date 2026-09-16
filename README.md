# DDS BetterDiscord Plugin

> **DDS — Discord Data Snatcher**  
> *Are you sure your data is secure?*

[![Current version](https://img.shields.io/badge/version-0.5.3-7b7cff)](./RELEASES.md)
[![Status](https://img.shields.io/badge/status-live%20tested-55d6a2)](./RELEASES.md)
[![BetterDiscord](https://img.shields.io/badge/platform-BetterDiscord-5865F2)](https://betterdiscord.app/)
[![Syntax check](https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/actions/workflows/syntax-check.yml/badge.svg)](https://github.com/Mr-Dexter-Morgan/DDS_BD_Plugin/actions/workflows/syntax-check.yml)

**DDS_BD_Plugin** is the Discord-facing capture layer of DDS. It observes Discord Desktop through BetterDiscord, reads only message data already loaded and visible to the signed-in user, converts that data into a stable structured capture, and exports the current capture locally for **DDS Companion**.

The plugin is intentionally lightweight. Storage, indexing, search, media caching, health monitoring, sync, and UI belong to DDS Companion rather than the Discord plugin.

## Current stable milestone

**v0.5.3 — Plugin Heartbeat / truthful Companion health**

This is the current recommended plugin release. It has been live-validated on Windows with Discord Desktop + BetterDiscord and DDS Companion 0.4.4.

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
- graceful compatibility with BetterDiscord's reduced filesystem API;
- local `plugin-heartbeat-v1` status for DDS Companion Health, including clean STOPPED state and automatic recovery.

## Quick installation

1. Install Discord Desktop and BetterDiscord.
2. Download or copy `DDS.plugin.js` from this repository.
3. In Discord open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
4. Put `DDS.plugin.js` into that folder.
5. Return to the BetterDiscord Plugins page and enable **DDS**.
6. Visit Discord servers/channels normally. DDS will create and update its local `DDS_Data` storage automatically.

> You do **not** need Git, Node.js, a terminal, or DDS Companion just to install and enable the plugin.

## User installation (RU)

<details>
<summary><strong>Открыть простую инструкцию по установке на русском</strong></summary>

### Что понадобится

- обычный **Discord Desktop**;
- установленный **BetterDiscord**;
- файл **`DDS.plugin.js`** из этого репозитория.

Никакой Git, Node.js, командная строка или сборка проекта для обычной установки не нужны.

### Установка

1. Установи и запусти **Discord Desktop**.
2. Установи **BetterDiscord**, если его ещё нет.
3. Скачай файл **`DDS.plugin.js`** из этого репозитория.
4. В Discord открой **Настройки пользователя → BetterDiscord → Plugins**.
5. Нажми **Open Plugins Folder / Открыть папку плагинов**.
6. Скопируй в открывшуюся папку файл **`DDS.plugin.js`**.
7. Вернись в Discord на страницу **BetterDiscord → Plugins**.
8. Найди **DDS** и включи переключатель рядом с ним.

Готово. Плагин начинает работать вместе с Discord и отслеживает только тот контекст, который уже загружен и доступен твоему текущему Discord-клиенту.

### Где появляются данные

На Windows DDS создаёт локальное хранилище здесь:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

Открыть его можно через `Win + R` → вставить путь выше → Enter.

### Если DDS не появился в списке плагинов

- проверь, что файл называется именно **`DDS.plugin.js`**;
- убедись, что файл лежит именно в папке BetterDiscord Plugins;
- не запускай `.js` двойным кликом — его должен загружать BetterDiscord;
- перезапусти Discord после копирования файла;
- проверь, что BetterDiscord вообще активен и другие его плагины отображаются.

### Что важно знать

DDS не вытаскивает пароль или Discord-токен, не получает скрытую историю и сам по себе ничего не отправляет в интернет. Он работает как локальный слой захвата и сохраняет доступный клиенту контекст в `DDS_Data` для дальнейшей обработки DDS Companion.

</details>

<details>
<summary><strong>Technical overview: data flow and local storage</strong></summary>

### Data flow

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

### Local storage

On the verified Windows setup, DDS writes to:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

The storage layout is ID-addressed so renaming a Discord server, channel, or thread does not change its archive path:

```text
DDS_Data/
├── manifest.json
├── plugin_heartbeat.json
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

`plugin_heartbeat.json` is a small local health contract. DDS writes `RUNNING` immediately and refreshes it every 30 seconds while enabled; a clean plugin stop writes `STOPPED`. DDS Companion uses this to distinguish a live capture producer from a disabled/stale one.

</details>

<details>
<summary><strong>Privacy and scope</strong></summary>

DDS is designed around a strict local-first boundary.

The plugin **does**:

- inspect the current Discord client context;
- read messages already loaded by Discord for the current user;
- preserve message text and structural metadata in local captures;
- record attachment/embed metadata and URLs;
- write capture files to local DDS storage;
- write a small local heartbeat file for DDS Companion health monitoring.

The plugin **does not**:

- extract Discord credentials or authentication tokens;
- fetch hidden or inaccessible message history;
- impersonate the user to scrape additional data;
- download binary media at this stage;
- send captured data to an external service;
- write to SQLite or Google Drive;
- perform DDS Companion's indexing/search/sync responsibilities.

</details>

<details>
<summary><strong>Release history</strong></summary>

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
| `0.5.3` | VERIFIED / LIVE TESTED | Plugin Heartbeat / Companion Health contract |

See [CHANGELOG.md](./CHANGELOG.md) for what changed and [RELEASES.md](./RELEASES.md) for validation status and historical failures.

</details>

<details>
<summary><strong>Repository layout and development rules</strong></summary>

### Repository layout

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
│   ├── DATA_FORMAT.md
│   └── PLUGIN_HEARTBEAT.md
└── .github/
    ├── workflows/
    │   └── syntax-check.yml
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

### Development rules

DDS follows a deliberately conservative release discipline:

1. One clear task per release.
2. A release is not considered stable merely because it builds.
3. Live validation is required before a release becomes recommended.
4. Broken releases remain documented instead of being silently rewritten.
5. Runtime fixes are shipped as a new patch release.
6. The BetterDiscord plugin stays lightweight.
7. Heavy storage, search, media, sync, and UI responsibilities stay in DDS Companion.
8. A small failure must not take down the entire DDS pipeline.
9. Every plugin code change receives a version bump, GitHub documentation, live validation, and its own GitHub Release after approval.

Every push and pull request runs a JavaScript syntax check against `DDS.plugin.js`.

</details>

## Authors

**Mr_Dexter_Morgan, Masya**

## License

No open-source license has been selected yet. Until a license is explicitly added, the repository does not grant general permission to copy, modify, or redistribute the code.