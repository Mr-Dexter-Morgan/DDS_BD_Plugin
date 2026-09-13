# Changelog

All notable DDS BetterDiscord Plugin releases are documented here.

This repository was created after the first plugin milestones had already been developed and live-tested, so the early release history below was reconstructed from the project's authoritative release records and per-version changelogs.

## [0.5.2] — 2026-09-13
### BetterDiscord filesystem compatibility hotfix

**Status: VERIFIED / STABLE MILESTONE**

- Fixed the BetterDiscord runtime failure `TypeError: this.fs.openSync is not a function`.
- Removed the hard dependency on `openSync()`, `fsyncSync()`, and `closeSync()`.
- Switched Disk Export to `writeFileSync()`, which is available in BetterDiscord's filesystem polyfill.
- Uses `renameSync()` when available; otherwise falls back to direct `writeFileSync()` replacement and temp cleanup.
- Added compatible temp cleanup using `rmSync()` or `unlinkSync()`.
- Added startup diagnostics showing filesystem methods exposed by the active BetterDiscord runtime.
- Preserved ID-addressed `DDS_Data`, 1000 ms debounce, export fingerprints, Structured Capture schema v2, Thread Awareness, and metadata-only media policy.
- No network fetching, token access, media downloading, SQLite integration, or Drive sync.

Live validation later confirmed this release working on Windows + BetterDiscord and established it as the current stable plugin milestone.

## [0.5.1] — 2026-09-13
### Disk Export runtime-path hotfix

**Status: BROKEN**

- Removed `require("os")` from the BetterDiscord renderer runtime.
- Fixed the first `0.5.0` startup-path failure caused by `require("os")` resolving incorrectly.
- Derived the export root from `BdApi.Plugins.folder`.
- Placed `DDS_Data` beside the BetterDiscord plugins directory.
- Added environment-variable fallback when the BetterDiscord plugins path is unavailable.
- Kept Structured Capture schema, ID-addressed layout, debounce, fingerprints, Thread Awareness, and metadata-only media behavior unchanged.

Live testing exposed a second runtime incompatibility: BetterDiscord's filesystem polyfill did not provide `fs.openSync()`. This release is preserved as broken history and was replaced by `0.5.2`.

## [0.5.0] — 2026-09-13
### First Disk Export implementation

**Status: BROKEN**

- Added the first persistent local export layer for Structured Capture.
- Introduced the ID-addressed storage layout under `DDS_Data/`.
- Added `manifest.json`, `guild.json`, `channel.json`, and current `capture.json` files.
- Added separate channel and thread capture paths.
- Added 1000 ms per-target debounce.
- Added per-target export fingerprints to skip duplicate writes.
- Added same-directory temporary files and atomic replacement logic.
- Added strict numeric Discord ID validation for filesystem paths.
- Added clean flush of pending exports on plugin stop.
- Media remained metadata-only.

Live BetterDiscord testing exposed an invalid renderer assumption: `require("os")` did not behave like normal Node.js in the BetterDiscord environment. The release was kept for traceability and superseded by hotfix work.

## [0.4.1] — 2026-09-13
### Thread Awareness hotfix

**Status: VERIFIED**

- Fixed forum-thread capture after live testing exposed a Discord routing edge case.
- Parsed routes shaped like `/channels/<guild>/<parent>/threads/<thread>`.
- Separated the selected parent forum channel from the effective message channel.
- Read `MessageStore` using the effective thread ID while a forum thread is open.
- Added parent forum metadata and explicit thread metadata.
- Added route diagnostics with selected and effective channel IDs.
- Increased capture schema version from 1 to 2.
- Added lightweight route-change awareness through History API observation and `popstate`.
- Preserved MessageStore-change detection as a fallback.
- Restored parent channel context cleanly when leaving a thread.

Live testing confirmed correct forum-thread capture and message-count growth while scrolling.

## [0.4.0] — 2026-09-13
### Structured Capture

**Status: SUPERSEDED**

- Added a JSON-compatible in-memory capture model for messages already loaded by Discord.
- Added capture metadata: schema version, DDS version, revision, timestamp, reason, source state, account, guild, channel, counts, and oldest/newest IDs.
- Added structured message objects with author, content, timestamps, attachments, embeds, and references.
- Added JSON serialization validation before promoting a capture to the active snapshot.
- Added monotonically increasing capture revisions.
- Replaced the coarse message-state signature with an FNV-1a based fingerprint so edits could refresh captures without count changes.
- Added generic collection-to-array handling.
- Kept the full capture in memory while logging only compact summaries.

Ordinary-channel behavior was valid, but live testing exposed the forum-thread context bug fixed in `0.4.1`.

## [0.3.0] — 2026-09-12
### Message Visibility

**Status: VERIFIED**

- Added read-only access to messages already loaded in the current Discord channel through `MessageStore.getMessages()`.
- Added MessageStore change subscription.
- Added debounced message refresh.
- Added per-channel message-state signatures to suppress duplicate scans.
- Added automatic scans after startup and channel switches.
- Added compact metadata preview for recent loaded messages.
- Added tolerant support for multiple Discord collection shapes.
- Added timestamp normalization and collection-size helpers.
- Added `MessageStore` to required-store validation.
- Explicitly kept network interception, history fetching, file export, attachment downloading, token access, and external transmission disabled.

Live testing verified MessageStore growth while browsing/scrolling without DDS fetching additional history itself.

## [0.2.0] — 2026-09-12
### Channel Awareness

**Status: VERIFIED**

- Added real-time selected guild/server tracking.
- Added real-time selected channel tracking.
- Subscribed to `SelectedGuildStore` and `SelectedChannelStore`.
- Added 75 ms debounce to merge duplicate Flux notifications from one navigation event.
- Added clean transition logging.
- Added required-store validation.
- Added automatic listener removal during `stop()`.
- Preserved the clean lifecycle foundation from `0.1.0`.

## [0.1.0] — 2026-09-12
### Initial foundation

**Status: VERIFIED**

- Added BetterDiscord plugin skeleton with clean `start()` / `stop()` lifecycle.
- Added scoped `BdApi` instance for DDS.
- Added startup/shutdown logs and toast notifications.
- Added Discord store discovery for `UserStore`, `GuildStore`, `SelectedGuildStore`, `ChannelStore`, `SelectedChannelStore`, and `MessageStore`.
- Added current-user, current-guild, and current-channel detection.
- Added cleanup registry for future listeners/resources.
- Added `Patcher.unpatchAll()` during shutdown.
- Kept message interception, export, file writing, and network activity disabled by design.

Live testing confirmed all six target stores and current context detection.
