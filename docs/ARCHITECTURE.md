# DDS BetterDiscord Plugin — Architecture

## Role in DDS

DDS is split into components on purpose. The BetterDiscord plugin is the Discord-facing adapter, not the whole application.

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
      ↓
SQLite / media / search / sync / UI
```

The plugin owns only the responsibilities that require direct access to the running Discord client.

## Plugin responsibilities

### Context awareness

DDS resolves the current Discord context using BetterDiscord-accessible stores and route information:

- current account;
- current guild/server;
- selected channel;
- effective message channel;
- forum/thread context;
- parent forum/channel metadata.

### Message visibility

DDS reads messages already present in Discord's local `MessageStore` for the active context.

The plugin does not perform its own hidden-history fetch or impersonate the user to retrieve additional message history. If Discord has not loaded a message into the client context, the plugin does not independently fetch it.

### Structured Capture

Loaded Discord objects are converted into plain JSON-compatible data. Current capture schema version: **2**.

A capture contains context metadata plus normalized message data such as:

- message IDs;
- author metadata;
- content;
- timestamps / edited timestamps;
- pinned/TTS flags;
- attachment metadata;
- embed metadata;
- message-reference metadata.

### Disk Export

The current verified release exports structured captures into an ID-addressed local directory tree under `DDS_Data`.

The storage layer deliberately uses Discord numeric IDs in paths and keeps human-readable names in JSON metadata. This avoids path churn when servers/channels/threads are renamed.

### Lifecycle

The plugin maintains an explicit cleanup model:

- listeners are registered centrally;
- timers are cleared during stop;
- pending exports are flushed where safe;
- BetterDiscord patches are removed during stop;
- store references and transient state are reset.

## Thread Awareness

Forum-thread navigation is a special case in Discord. During live testing, `SelectedChannelStore` remained pointed at the parent forum while thread messages were stored under the thread ID.

DDS therefore combines selected-store context with the active route. For routes shaped like:

```text
/channels/<guild>/<parent>/threads/<thread>
```

DDS treats `<thread>` as the effective message channel and preserves `<parent>` as parent metadata.

## Storage boundary

The plugin writes local JSON snapshots. It does **not** own the long-term normalized archive.

DDS Companion is responsible for:

- accumulating history across snapshots;
- SQLite storage;
- deduplication across imports;
- media caching;
- full-text search;
- activity and health reporting;
- external sync;
- desktop UI;
- backups and productization concerns.

## Reliability principles

The plugin follows two project-wide rules.

### 1. Small failures must stay small

A single malformed object, unavailable optional API, failed write, or cleanup problem should be isolated as much as possible instead of collapsing the entire DDS pipeline.

### 2. Runtime assumptions must be verified

BetterDiscord's renderer environment is not identical to a full Node.js process. Releases `0.5.0` and `0.5.1` are intentionally preserved as examples of why runtime capabilities must be tested instead of assumed.

The stable `0.5.2` Disk Export targets the smaller filesystem surface actually exposed by BetterDiscord.

## Security and privacy boundary

The plugin is local-first by design. It does not intentionally:

- extract authentication tokens;
- collect passwords or credentials;
- bypass Discord permissions;
- fetch inaccessible history;
- transmit captures to external services;
- download binary media;
- perform Google Drive sync.

See [SECURITY.md](../SECURITY.md) for reporting security issues.
