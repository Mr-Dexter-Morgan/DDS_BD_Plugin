# DDS Capture and Storage Format

This document describes the current BetterDiscord Plugin output boundary used by DDS Companion.

## Versions

Current verified plugin: **0.5.2**  
Capture schema version: **2**  
Storage schema version: **1**

## Storage root

Verified Windows root:

```text
%APPDATA%\BetterDiscord\DDS_Data
```

DDS prefers the BetterDiscord plugins path as the runtime anchor and creates `DDS_Data` beside the `plugins` directory.

## Directory layout

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

All path IDs are validated Discord numeric IDs. Human-readable names are metadata only.

## `manifest.json`

The manifest describes the storage contract and the most recent successful export context. Current fields include:

```text
storageSchemaVersion
captureSchemaVersion
ddsVersion
format
layout
mediaPolicy
rootStructure
lastExport
```

The current format identifier is `dds-json`, layout is `id-addressed`, and media policy is `metadata-only`.

## `guild.json`

Contains stable guild metadata:

```json
{
  "id": "<guildId>",
  "name": "<human-readable guild name or null>"
}
```

## `channel.json`

Contains the stable parent/channel metadata required to interpret captures. The exact source can differ between ordinary channels and thread contexts, but the record preserves:

```text
id
name
type
guildId
parentId
```

## `capture.json`

A capture is a current JSON-compatible snapshot of messages already loaded by Discord for one active context.

Top-level data includes:

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

### Source

The source identifies Discord's client-side MessageStore as the origin and marks the capture as local-only. It can also indicate whether Discord reported the target collection as loading.

### Account

When available:

```text
id
username
globalName
```

### Guild

When available:

```text
id
name
```

### Channel

```text
id
name
type
guildId
parentId
```

### Thread

For forum/thread contexts, schema v2 preserves:

```text
id
name
parentChannelId
parentChannelName
parentChannelType
```

For an ordinary channel, `thread` is null.

### Route

Thread Awareness keeps navigation diagnostics:

```text
path
selectedChannelId
effectiveChannelId
```

This distinction matters because Discord can keep the selected channel pointed at a parent forum while the effective message collection belongs to the opened thread.

## Message object

Each normalized message can contain:

```text
id
channelId
guildId
type
timestamp
editedTimestamp
author
content
pinned
tts
attachments
embeds
messageReference
```

### Author

```text
id
username
globalName
displayName
bot
```

### Attachments

Attachment metadata can include:

```text
id
filename
title
description
contentType
size
url
proxyUrl
width
height
ephemeral
```

DDS Plugin does not download the referenced binary attachment.

### Embeds

Embed metadata can include:

```text
type
url
title
description
timestamp
color
provider
author
thumbnail
image
fields
footer
```

### Message reference

When present:

```text
messageId
channelId
guildId
```

## Snapshot semantics

The plugin maintains the **current** capture for a channel/thread context and overwrites that current JSON snapshot when Discord's loaded state changes.

DDS Companion is responsible for accumulating multiple observations into a durable historical archive. The plugin itself is not the long-term history database.

## Media policy

Current policy: **metadata-only**.

DDS Plugin records attachment/embed metadata and URLs but does not download binary media. Future media caching belongs to DDS Companion.

## Compatibility rules

Consumers should:

1. treat unknown additive fields as forward-compatible;
2. inspect `schemaVersion` before relying on schema-specific fields;
3. use Discord IDs as stable entity keys;
4. avoid treating names as path identifiers;
5. never infer message deletion merely because a later current snapshot contains fewer loaded messages;
6. preserve already-imported archive data when a source capture disappears or changes.
