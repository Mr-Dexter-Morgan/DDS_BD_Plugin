'use strict';
const {test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const GUILD = '111111111111111111', CHANNEL = '222222222222222222';
const ENTRY = ((BigInt(Date.parse('2026-09-14T00:00:00Z')) - 1420070400000n) << 22n).toString();
const noop = () => {};
let modules, temp, dds, requests, loggedIn, guildAvailable, liveChannel, handlers, logs;
class MockBdApi {
    constructor() {
        this.Logger = {
            info: (...args) => logs.push(["info", ...args]),
            warn: (...args) => logs.push(["warn", ...args]),
            error: (...args) => logs.push(["error", ...args])
        };
        this.UI = {showToast: noop};
        this.Patcher = {unpatchAll: noop};
    }
    static Webpack = {getModule(filter) {
        for (const module of modules) {
            try { if (filter(module)) return module; } catch {}
        }
        return undefined;
    }};
}
global.BdApi = MockBdApi;
const DDS = require('../DDS.plugin.js');
function auditEntry(overrides = {}) { return {id: ENTRY, target_id: CHANNEL, action_type: 12, changes: [{key: 'type', old_value: 2}], ...overrides}; }
function evidencePath() { return path.join(temp, 'guilds', GUILD, 'channels', CHANNEL, 'source_evidence.json'); }
function metadata(type = 2) {
    const base = path.dirname(evidencePath());
    fs.mkdirSync(base, {recursive: true});
    fs.writeFileSync(path.join(base, 'channel.json'), JSON.stringify({id: CHANNEL, guildId: GUILD, type}));
}
function http(entries = [], status = 200) {
    const module = {post: noop, put: noop, del: noop, patch: noop,
        async get(options) { requests.push(options); return {status, body: {audit_log_entries: entries}}; }};
    modules = [module];
    return module;
}
beforeEach(() => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dds-source-evidence-'));
    modules = []; requests = []; handlers = new Map(); logs = []; loggedIn = true; guildAvailable = true; liveChannel = null;
    dds = new DDS(); dds.started = true; dds.exportRoot = temp; dds.fs = fs; dds.path = path;
    dds.stores.UserStore = {getCurrentUser: () => loggedIn ? {id: '999999999999999999'} : null};
    dds.stores.GuildStore = {getGuild: () => guildAvailable ? {id: GUILD} : null};
    dds.stores.ChannelStore = {getChannel: () => liveChannel};
    metadata();
});
afterEach(() => { dds.clearTimer('sourceEvidenceTimer'); fs.rmSync(temp, {recursive: true, force: true}); });

test('existing text/voice/stage channels never generate deletion proof', async () => {
    for (const type of [0, 2, 13]) {
        metadata(type); liveChannel = {id: CHANNEL, type}; http([auditEntry()]);
        await dds.checkArchivedSourceEvidence();
        assert.equal(fs.existsSync(evidencePath()), false);
    }
    assert.equal(requests.length, 0);
});
test('null/unhydrated ChannelStore alone never proves deletion', async () => {
    http([]); await dds.checkArchivedSourceEvidence();
    assert.equal(fs.existsSync(evidencePath()), false);
});
test('missing guild/logout perform no audit requests and produce no proof', async () => {
    http([auditEntry()]); guildAvailable = false;
    await dds.checkArchivedSourceEvidence();
    guildAvailable = true; loggedIn = false;
    await dds.checkArchivedSourceEvidence();
    assert.equal(requests.length, 0); assert.equal(fs.existsSync(evidencePath()), false);
});
test('permission denial, missing access, rate limit, network error stay UNKNOWN', async () => {
    for (const status of [403, 404, 429, 500]) {
        dds.sourceEvidenceRequests.clear(); http([auditEntry()], status);
        await dds.checkArchivedSourceEvidence();
        assert.equal(fs.existsSync(evidencePath()), false);
    }
    dds.sourceEvidenceRequests.clear(); const module = http(); module.get = async () => { throw new Error('offline'); };
    await dds.checkArchivedSourceEvidence(); assert.equal(fs.existsSync(evidencePath()), false);
});
test('positive voice deletion exports a bounded, scoped proof through atomic writer', async () => {
    http([auditEntry({user_id: 'private-actor', reason: 'private-reason'})]);
    await dds.checkArchivedSourceEvidence();
    const proof = JSON.parse(fs.readFileSync(evidencePath(), 'utf8'));
    assert.equal(proof.availability, 'GONE_VERIFIED'); assert.equal(proof.channelType, 2);
    assert.equal(proof.guildId, GUILD); assert.equal(proof.channelId, CHANNEL);
    assert.equal(proof.auditEntry.id, ENTRY); assert.equal(proof.pluginVersion, '0.5.4');
    assert.equal(proof.auditEntry.user_id, undefined); assert.equal(proof.auditEntry.reason, undefined);
    assert.deepEqual(requests[0], {url: `/guilds/${GUILD}/audit-logs`, query: {action_type: 12, limit: 100}, retries: 0});
    // Used by the cross-language gate when explicitly requested by the developer.
    if (process.env.DDS_SOURCE_EVIDENCE_FIXTURE_ROOT) {
        const target = path.join(process.env.DDS_SOURCE_EVIDENCE_FIXTURE_ROOT, 'guilds', GUILD, 'channels', CHANNEL);
        fs.mkdirSync(target, {recursive: true}); fs.copyFileSync(evidencePath(), path.join(target, 'source_evidence.json'));
    }
});
test('positive Stage channel deletion works; Stage instance deletion is insufficient', async () => {
    metadata(13); http([auditEntry({action_type: 85})]); await dds.checkArchivedSourceEvidence();
    assert.equal(fs.existsSync(evidencePath()), false);
    dds.sourceEvidenceRequests.clear(); http([auditEntry({changes: [{key: 'type', old_value: 13}]})]);
    await dds.checkArchivedSourceEvidence(); assert.equal(JSON.parse(fs.readFileSync(evidencePath())).channelType, 13);
});
test('wrong target/type or text source cannot produce proof', async () => {
    for (const entry of [auditEntry({target_id: '333'}), auditEntry({changes: [{key: 'type', old_value: 0}]})]) {
        dds.sourceEvidenceRequests.clear(); http([entry]); await dds.checkArchivedSourceEvidence();
        assert.equal(fs.existsSync(evidencePath()), false);
    }
    metadata(0); dds.sourceEvidenceRequests.clear(); http([auditEntry()]); await dds.checkArchivedSourceEvidence();
    assert.equal(fs.existsSync(evidencePath()), false);
});
test('guild read is bounded once per start and repeated proof does not rewrite file', async () => {
    http([auditEntry()]); await dds.checkArchivedSourceEvidence();
    const before = fs.readFileSync(evidencePath(), 'utf8');
    await dds.checkArchivedSourceEvidence(); assert.equal(requests.length, 1);
    dds.sourceEvidenceRequests.clear(); await dds.checkArchivedSourceEvidence();
    assert.equal(fs.readFileSync(evidencePath(), 'utf8'), before);
});
test('logout or stop while request is in flight prevents publishing evidence', async () => {
    const module = http([auditEntry()]); let resolve;
    module.get = () => new Promise(r => { resolve = r; });
    const pending = dds.checkArchivedSourceEvidence();
    dds.started = false; dds.sourceEvidenceGeneration += 1;
    resolve({status: 200, body: {audit_log_entries: [auditEntry()]}}); await pending;
    assert.equal(fs.existsSync(evidencePath()), false);
});
test('channel becoming visible while awaiting HTTP prevents publication', async () => {
    const module = http(); module.get = async () => { liveChannel = {id: CHANNEL}; return {status: 200, body: {audit_log_entries: [auditEntry()]}}; };
    await dds.checkArchivedSourceEvidence(); assert.equal(fs.existsSync(evidencePath()), false);
});
test('CHANNEL_DELETE subscription is just a hint and cleanup unsubscribes it', () => {
    modules = [{dispatch: noop, subscribe: (type, fn) => handlers.set(type, fn), unsubscribe: type => handlers.delete(type)}];
    dds.startSourceEvidence(); assert.equal(handlers.has('CHANNEL_DELETE'), true);
    handlers.get('CHANNEL_DELETE')({channel: {id: CHANNEL, guild_id: GUILD, type: 2}});
    assert.equal(fs.existsSync(evidencePath()), false);
    for (const cleanup of dds.cleanups) cleanup();
    assert.equal(handlers.size, 0);
});
test('missing Webpack HTTP adapter leaves UNKNOWN', async () => {
    modules = []; await dds.checkArchivedSourceEvidence(); assert.equal(fs.existsSync(evidencePath()), false);
});

test('relaxed native HTTP feature detection accepts delete instead of del', async () => {
    modules = [{
        post: noop,
        delete: noop,
        async get(options) {
            requests.push(options);
            return {status: 200, body: {audit_log_entries: [auditEntry()]}};
        }
    }];
    await dds.checkArchivedSourceEvidence();
    assert.equal(JSON.parse(fs.readFileSync(evidencePath(), 'utf8')).availability, 'GONE_VERIFIED');
    assert.equal(requests.length, 1);
});

test('audit response parser accepts current wrapper variants without weakening proof', async () => {
    for (const response of [
        {audit_log_entries: [auditEntry()]},
        {statusCode: 200, data: {auditLogEntries: [auditEntry()]}},
        {status: 200, body: JSON.stringify({audit_log_entries: [auditEntry()]})},
        {status: 200, text: JSON.stringify({audit_log_entries: [auditEntry()]})},
        {status: 200, xhr: {responseText: JSON.stringify({auditLogEntries: [auditEntry()]})}},
        {status: 200, body: {body: {audit_log_entries: [auditEntry()]}}},
        {status: 200, response: {result: {audit_log_entries: [auditEntry()]}}},
        {status: 200, body: {async json() { return {audit_log_entries: [auditEntry()]}; }}}
    ]) {
        fs.rmSync(evidencePath(), {force: true});
        dds.sourceEvidenceRequests.clear();
        modules = [{
            post: noop,
            put: noop,
            async get(options) { requests.push(options); return response; }
        }];
        await dds.checkArchivedSourceEvidence();
        assert.equal(fs.existsSync(evidencePath()), true);
    }
});

test('live diagnostics distinguish no candidates from missing HTTP adapter', async () => {
    liveChannel = {id: CHANNEL, type: 2};
    await dds.checkArchivedSourceEvidence();
    assert.equal(logs.some(row => String(row[1]).includes('no eligible archived voice/stage channels')), true);

    liveChannel = null;
    logs = [];
    await dds.checkArchivedSourceEvidence();
    assert.equal(logs.some(row => String(row[1]).includes('HTTP adapter NOT FOUND')), true);
});

test('unsupported live response shape is reported without exposing response values', async () => {
    modules = [{
        post: noop,
        put: noop,
        async get() { return {status: 200, body: {mystery: {secret: 'do-not-log'}}}; }
    }];
    await dds.checkArchivedSourceEvidence();
    const line = logs.map(row => String(row[1])).find(value => value.includes('unsupported'));
    assert.equal(Boolean(line), true);
    assert.equal(line.includes('do-not-log'), false);
});
