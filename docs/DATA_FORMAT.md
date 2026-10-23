# DDS Plugin Capture and Storage Format

Current stable plugin: **0.5.4**  
Capture schema: **2**  
Storage schema: **1**

This is the local hand-off contract from DDS Plugin to DDS Companion.

## Storage root

```text
%APPDATA%\BetterDiscord\DDS_Data
```

## Layout

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
                ├── source_evidence.json   # when bounded source evidence is written
                └── threads/
                    └── <threadId>/
                        └── capture.json
```

Not every source has a `source_evidence.json`; absence of that file is not deletion proof.

## manifest.json

The manifest advertises the local storage/capture contract and capabilities. Relevant values include:

- `storageSchemaVersion`;
- `captureSchemaVersion`;
- plugin/DDS version;
- `dds-json` format;
- ID-addressed layout;
- metadata-only media policy;
- `plugin-heartbeat-v1`;
- `source-evidence-v1` when supported.

## capture.json

A capture is a JSON-compatible snapshot of messages already loaded by Discord for one active context.

Typical top-level fields include:

```text
schemaVersion
ddsVersion
captureRevision
capturedAt
reason
source
account
guild
channel
thread
route
messageCount
oldestMessageId
newestMessageId
messages
```

Message records can include IDs, author metadata, content, timestamps, attachment/embed metadata and message references.

Attachment URLs are metadata. DDS Plugin does **not** download the binary attachment.

## Threads

For routes shaped like:

```text
/channels/<guild>/<parent>/threads/<thread>
```

DDS keeps the parent channel as metadata but uses the thread ID as the effective message context.

## plugin_heartbeat.json

Heartbeat schema v1 is documented in [PLUGIN_HEARTBEAT.md](PLUGIN_HEARTBEAT.md).

## source_evidence.json

Plugin 0.5.4 can write bounded `source-evidence-v1` sidecars for archived Voice/Stage sources.

A positive evidence record is accepted only when an exact Discord audit-log `CHANNEL_DELETE` event matches the source channel ID. Missing/invalid/unavailable evidence remains non-terminal; Companion must not infer deletion from source absence alone.

## Durable archive boundary

`DDS_Data` is the Plugin→Companion capture hand-off, not the durable normalized archive.

DDS Companion imports this data into its local SQLite archive under:

```text
%LOCALAPPDATA%\DDS_Companion
```

The SQLite archive is the durable source of truth; media cache and ZIP exports are derived layers.
