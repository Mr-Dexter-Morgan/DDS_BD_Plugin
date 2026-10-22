# DDS Plugin 0.5.4 — SOURCE_GONE evidence candidate

Baseline 0.5.3: `88e763c47f17b3b52ed3f8d1103227aefc854009`.
Linked owner of lifecycle: DDS Companion 0.8.6. Not publicly released.

The Plugin already exports channel.json with id/guildId/type and capture-v2.
Neither an absent ChannelStore item nor an internal CHANNEL_DELETE dispatch is
accepted as proof. The latter is only a wake-up hint for a positive audit lookup.

Five seconds after Plugin start, archived voice/stage channels missing from the
current store are candidates for a bounded audit read. Current user and guild must
be available. The native HTTP module is feature-detected; requests use the normal
Discord client, never tokens or an external transport. Per start: at most ten
guilds, one request per guild, action_type CHANNEL_DELETE (12), limit100, retries0.
No recurring polling or pagination. Dispatch hints can check not-yet-checked guilds.

Only a successful guild-scoped response with an audit CHANNEL_DELETE entry whose
target_id matches the archived channel exactly can produce GONE_VERIFIED. Persisted
type must be GUILD_VOICE (2) or GUILD_STAGE_VOICE (13), and any audit type must agree.
A currently visible channel, unavailable store/guild/user, denied permission, empty
or truncated audit history, HTTP errors, missing adapter and Stage instance deletion
(85) are UNKNOWN. No terminal inference is made from these conditions.

Sidecar: guilds/<guildId>/channels/<channelId>/source_evidence.json.
Fields: schemaVersion1, availability GONE_VERIFIED, kind discord-audit-log-channel-delete,
guildId, channelId, channelType, observedAt, pluginVersion, auditEntry containing only
id, target_id, action_type and optional type changes. Written with the existing
atomic JSON writer; repeated proof is stable. It does not rewrite captures or include
audit actors/reasons. Manifest adds source-evidence-v1; capture-v2 remains unchanged.
Stopping invalidates in-flight results, cancels the timer and unsubscribes hints.

Tests: `node --check DDS.plugin.js` and `node --test tests/source_evidence.test.js`.
Twelve automated cases pass, covering positive voice/stage proof, all unknown gates,
request limits, cancellation, currently visible sources and subscription cleanup.
Companion also imports actual JSON produced by this code in a cross-language check.

LIVE DISCORD ADAPTER: NOT VERIFIED. The native Discord module/response shape requires
one authorized Windows check. Audit logs require VIEW_AUDIT_LOG and retain 45 days;
the first page may omit an older deletion. Missing proof deliberately leaves UNKNOWN.
This candidate does not promise to classify the six historical attachments without
positive evidence. Current status: PARTIAL / NEEDS FIX pending live acceptance.

Official protocol/API references:
https://docs.discord.com/developers/resources/audit-log
https://docs.discord.com/developers/resources/channel#channel-object-channel-types
https://docs.betterdiscord.app/api/webpack
