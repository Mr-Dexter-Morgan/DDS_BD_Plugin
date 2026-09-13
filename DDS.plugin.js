/**
 * @name DDS
 * @author Mr_Dexter_Morgan, Masya
 * @description 🌌 [Discord Data Snatcher] — Private client data collector & event grabber. For personal use only.
 * @version 0.5.2
 * @source https://localhost
 */

module.exports = class DDS {
    constructor() {
        this.api = new BdApi("DDS");

        this.version = "0.5.2";
        this.captureSchemaVersion = 2;

        this.started = false;
        this.cleanups = [];

        this.locationRefreshTimer = null;
        this.messageRefreshTimer = null;

        this.lastLocation = {
            guildId: null,
            channelId: null
        };

        this.lastMessageSignature = null;
        this.currentCapture = null;
        this.captureRevision = 0;

        this.storageSchemaVersion = 1;
        this.exportDebounceMs = 1000;
        this.exportRoot = null;
        this.fs = null;
        this.path = null;
        this.atomicWriteCounter = 0;
        this.pendingExports = new Map();
        this.lastExportFingerprints = new Map();

        this.stores = {
            UserStore: null,
            GuildStore: null,
            SelectedGuildStore: null,
            ChannelStore: null,
            SelectedChannelStore: null,
            MessageStore: null
        };
    }

    start() {
        if (this.started) {
            this.api.Logger.warn("DDS уже запущен. Повторный start() пропущен.");
            return;
        }

        this.started = true;
        this.api.Logger.info(`Запуск DDS v${this.version}...`);

        try {
            this.loadStores();
            this.logCurrentUser();
            this.initializeDiskExport();

            const initialLocation = this.getLocationSnapshot();
            this.lastLocation = initialLocation;
            this.logLocationSnapshot(initialLocation, "Текущая позиция");

            this.subscribeToLocationChanges();
            this.subscribeToRouteChanges();
            this.subscribeToMessageChanges();

            // Даём Discord закончить первичную загрузку текущего канала.
            this.scheduleMessageRefresh(250, "startup");

            this.api.UI.showToast(`DDS v${this.version} запущен`, {
                type: "success",
                timeout: 3000
            });

            this.api.Logger.info(
                "Structured Capture активирован. DDS строит JSON-совместимый снимок уже загруженных клиентом сообщений в памяти."
            );
            this.api.Logger.info(
                "Thread Awareness активирован. DDS учитывает открытую форумную ветку из маршрута Discord и читает её собственный MessageStore-контекст."
            );
            this.api.Logger.info(
                `Disk Export активирован. JSON-хранилище: ${this.exportRoot}`
            );
        } catch (error) {
            this.api.Logger.error("Ошибка запуска DDS:", error);

            this.api.UI.showToast(
                "DDS: ошибка запуска. Открой консоль для подробностей.",
                {
                    type: "error",
                    timeout: 5000
                }
            );

            this.stop();
        }
    }

    stop() {
        if (!this.started) return;

        this.api.Logger.info("Остановка DDS...");

        this.clearTimer("locationRefreshTimer");
        this.clearTimer("messageRefreshTimer");

        try {
            this.flushPendingExports();
        } catch (error) {
            this.api.Logger.warn("Не удалось завершить отложенный Disk Export при остановке:", error);
        }

        for (const cleanup of this.cleanups.splice(0)) {
            try {
                cleanup();
            } catch (error) {
                this.api.Logger.warn("Ошибка при очистке ресурса DDS:", error);
            }
        }

        try {
            this.api.Patcher.unpatchAll();
        } catch (error) {
            this.api.Logger.warn("Не удалось снять патчи DDS:", error);
        }

        for (const key of Object.keys(this.stores)) {
            this.stores[key] = null;
        }

        this.lastLocation = {
            guildId: null,
            channelId: null
        };

        this.lastMessageSignature = null;
        this.currentCapture = null;
        this.captureRevision = 0;
        this.pendingExports.clear();
        this.lastExportFingerprints.clear();
        this.started = false;

        this.api.UI.showToast("DDS остановлен", {
            type: "info",
            timeout: 2000
        });

        this.api.Logger.info("DDS полностью остановлен.");
    }

    clearTimer(propertyName) {
        const timer = this[propertyName];

        if (timer !== null) {
            clearTimeout(timer);
            this[propertyName] = null;
        }
    }

    loadStores() {
        const names = Object.keys(this.stores);

        for (const name of names) {
            try {
                this.stores[name] = BdApi.Webpack.getStore(name) ?? null;
            } catch (error) {
                this.stores[name] = null;
                this.api.Logger.warn(`Не удалось получить ${name}:`, error);
            }
        }

        const loaded = names.filter(name => this.stores[name]).length;
        this.api.Logger.info(`Discord stores готовы (${loaded}/${names.length}).`);

        const missing = names.filter(name => !this.stores[name]);

        if (missing.length) {
            this.api.Logger.warn(`Недоступные stores: ${missing.join(", ")}`);
        }

        const required = [
            "GuildStore",
            "SelectedGuildStore",
            "ChannelStore",
            "SelectedChannelStore",
            "MessageStore"
        ];

        const missingRequired = required.filter(name => !this.stores[name]);

        if (missingRequired.length) {
            throw new Error(
                `Не найдены обязательные stores: ${missingRequired.join(", ")}`
            );
        }

        if (typeof this.stores.MessageStore?.getMessages !== "function") {
            throw new Error("MessageStore найден, но getMessages() недоступен.");
        }
    }

    logCurrentUser() {
        const user = this.stores.UserStore?.getCurrentUser?.();

        if (!user) {
            this.api.Logger.warn("Текущий пользователь не определён.");
            return;
        }

        const displayName =
            user.globalName ||
            user.username ||
            "неизвестный пользователь";

        this.api.Logger.info(`Привет, ${displayName}. ID: ${user.id}`);
    }

    subscribeToLocationChanges() {
        const watchedStores = [
            ["SelectedGuildStore", this.stores.SelectedGuildStore],
            ["SelectedChannelStore", this.stores.SelectedChannelStore]
        ];

        let subscribed = 0;

        for (const [name, store] of watchedStores) {
            if (
                typeof store?.addChangeListener !== "function" ||
                typeof store?.removeChangeListener !== "function"
            ) {
                this.api.Logger.warn(
                    `${name} не поддерживает addChangeListener/removeChangeListener.`
                );
                continue;
            }

            const listener = () => this.scheduleLocationRefresh();

            store.addChangeListener(listener);

            this.registerCleanup(() => {
                store.removeChangeListener(listener);
            });

            subscribed++;
        }

        if (subscribed === 0) {
            throw new Error(
                "Не удалось подписаться на изменения выбранного сервера/канала."
            );
        }

        this.api.Logger.info(
            `Channel Awareness: активны подписки (${subscribed}/${watchedStores.length}).`
        );
    }

    subscribeToMessageChanges() {
        const store = this.stores.MessageStore;

        if (
            typeof store?.addChangeListener !== "function" ||
            typeof store?.removeChangeListener !== "function"
        ) {
            throw new Error(
                "MessageStore не поддерживает addChangeListener/removeChangeListener."
            );
        }

        const listener = () => {
            this.scheduleMessageRefresh(180, "message-store");
        };

        store.addChangeListener(listener);

        this.registerCleanup(() => {
            store.removeChangeListener(listener);
        });

        this.api.Logger.info("Message Visibility: подписка на MessageStore активна.");
    }

    subscribeToRouteChanges() {
        try {
            if (
                typeof window === "undefined" ||
                !window.history ||
                typeof window.addEventListener !== "function"
            ) {
                this.api.Logger.warn(
                    "Route Awareness: window/history недоступны; остаётся fallback через MessageStore."
                );
                return;
            }

            const onRouteChange = () => this.scheduleLocationRefresh();

            window.addEventListener("popstate", onRouteChange);
            this.registerCleanup(() => {
                window.removeEventListener("popstate", onRouteChange);
            });

            let patched = 0;

            for (const method of ["pushState", "replaceState"]) {
                if (typeof window.history[method] !== "function") continue;

                try {
                    this.api.Patcher.after(
                        window.history,
                        method,
                        onRouteChange
                    );
                    patched++;
                } catch (error) {
                    this.api.Logger.warn(
                        `Route Awareness: не удалось наблюдать history.${method}():`,
                        error
                    );
                }
            }

            this.api.Logger.info(
                `Route Awareness: popstate + History API (${patched}/2) активны.`
            );
        } catch (error) {
            this.api.Logger.warn(
                "Route Awareness не удалось полностью активировать; MessageStore fallback остаётся включён.",
                error
            );
        }
    }

    scheduleLocationRefresh() {
        if (!this.started) return;

        this.clearTimer("locationRefreshTimer");

        // Discord может уведомить несколько Flux stores об одном переходе.
        this.locationRefreshTimer = setTimeout(() => {
            this.locationRefreshTimer = null;

            if (!this.started) return;

            try {
                this.handleLocationChange();
            } catch (error) {
                this.api.Logger.error(
                    "Ошибка обработки переключения сервера/канала:",
                    error
                );
            }
        }, 75);
    }

    scheduleMessageRefresh(delay = 180, reason = "unknown") {
        if (!this.started) return;

        this.clearTimer("messageRefreshTimer");

        // Склеиваем пачку событий MessageStore после одной загрузки/навигации.
        this.messageRefreshTimer = setTimeout(() => {
            this.messageRefreshTimer = null;

            if (!this.started) return;

            try {
                this.inspectCurrentChannelMessages(reason);
            } catch (error) {
                this.api.Logger.error(
                    "Ошибка чтения/структурирования загруженных сообщений:",
                    error
                );
            }
        }, delay);
    }

    handleLocationChange() {
        const next = this.getLocationSnapshot();
        const changed = this.updateLocationState(next, "selection-change");

        if (changed) {
            this.scheduleMessageRefresh(
                250,
                next.isThread ? "thread-change" : "channel-change"
            );
        }
    }

    updateLocationState(next, reason = "unknown") {
        const previous = this.lastLocation ?? {};

        if (this.locationsEqual(previous, next)) {
            return false;
        }

        this.lastLocation = next;
        this.lastMessageSignature = null;
        this.currentCapture = null;

        const guildChanged = next.guildId !== previous.guildId;
        const channelChanged = next.channelId !== previous.channelId;
        const threadModeChanged = Boolean(next.isThread) !== Boolean(previous.isThread);

        if (guildChanged) {
            if (next.guildId) {
                this.api.Logger.info(
                    `Сервер → ${next.guildName} (${next.guildId})`
                );
            } else {
                this.api.Logger.info("Сервер → не выбран");
            }
        }

        if (channelChanged || threadModeChanged) {
            if (next.isThread) {
                this.api.Logger.info(
                    `Тема → ${next.channelName} (${next.channelId}), ` +
                    `родитель: ${next.parentChannelName} (${next.parentChannelId}). ` +
                    `Источник: ${reason}.`
                );
            } else if (previous.isThread && next.channelId) {
                this.api.Logger.info(
                    `Тема закрыта → канал: ${next.channelName} (${next.channelId}). ` +
                    `Источник: ${reason}.`
                );
            } else if (next.channelId) {
                this.api.Logger.info(
                    `Канал → ${next.channelName} (${next.channelId})`
                );
            } else {
                this.api.Logger.info("Канал → не выбран");
            }
        }

        return true;
    }

    locationsEqual(a, b) {
        return (
            (a?.guildId ?? null) === (b?.guildId ?? null) &&
            (a?.channelId ?? null) === (b?.channelId ?? null) &&
            (a?.parentChannelId ?? null) === (b?.parentChannelId ?? null) &&
            Boolean(a?.isThread) === Boolean(b?.isThread)
        );
    }

    inspectCurrentChannelMessages(reason = "manual") {
        const location = this.getLocationSnapshot();

        // SelectedChannelStore остаётся на родительском forum-channel, когда
        // Discord открывает /threads/<threadId>. MessageStore при этом уже
        // наполняется по threadId. Синхронизируем эффективный контекст здесь
        // как fallback, когда загрузка темы вызывает изменение MessageStore.
        this.updateLocationState(location, "message-store-route");

        if (!location.channelId) {
            this.lastMessageSignature = null;
            this.currentCapture = null;
            return;
        }

        const messages = this.getLoadedMessages(location.channelId);
        const signature = this.computeMessageSignature(location.channelId, messages);

        if (signature === this.lastMessageSignature) {
            return;
        }

        this.lastMessageSignature = signature;

        let loading = false;

        try {
            loading =
                this.stores.MessageStore?.isLoadingMessages?.(
                    location.channelId
                ) === true;
        } catch {
            loading = false;
        }

        const capture = this.createStructuredCapture(
            location,
            messages,
            loading,
            reason
        );

        const serializedLength = this.assertSerializable(capture);

        this.currentCapture = capture;
        this.captureRevision = capture.captureRevision;

        this.scheduleDiskExport(capture, signature);

        this.api.Logger.info(
            `Structured Capture → ${location.channelName} (${location.channelId}): ` +
            `${capture.messageCount} сообщений, rev ${capture.captureRevision}, ` +
            `JSON ${serializedLength} символов` +
            `${loading ? " [загрузка ещё идёт]" : ""}. Причина: ${reason}.`
        );

        if (capture.messages.length > 0) {
            this.api.Logger.info(
                "Structured Capture sample (последнее загруженное сообщение):",
                capture.messages[capture.messages.length - 1]
            );
        }
    }

    createStructuredCapture(location, messages, loading, reason) {
        const user = this.stores.UserStore?.getCurrentUser?.() ?? null;
        const channel = location.channelId
            ? this.stores.ChannelStore?.getChannel?.(location.channelId)
            : null;
        const parentChannel = location.parentChannelId
            ? this.stores.ChannelStore?.getChannel?.(location.parentChannelId)
            : null;

        const structuredMessages = messages.map(message =>
            this.structureMessage(message, location)
        );

        const nextRevision = this.captureRevision + 1;

        return {
            schemaVersion: this.captureSchemaVersion,
            ddsVersion: this.version,
            captureRevision: nextRevision,
            capturedAt: new Date().toISOString(),
            reason,
            source: {
                kind: "discord-client-message-store",
                localOnly: true,
                loading: Boolean(loading)
            },
            account: user
                ? {
                    id: user.id ?? null,
                    username: user.username ?? null,
                    globalName: user.globalName ?? null
                }
                : null,
            guild: location.guildId
                ? {
                    id: location.guildId,
                    name: location.guildName
                }
                : null,
            channel: {
                id: location.channelId,
                name: location.channelName,
                type: this.toFiniteNumber(channel?.type),
                guildId: channel?.guild_id ?? channel?.guildId ?? location.guildId ?? null,
                parentId:
                    channel?.parent_id ??
                    channel?.parentId ??
                    location.parentChannelId ??
                    null
            },
            thread: location.isThread
                ? {
                    id: location.channelId,
                    name: location.channelName,
                    parentChannelId: location.parentChannelId,
                    parentChannelName: location.parentChannelName,
                    parentChannelType: this.toFiniteNumber(parentChannel?.type)
                }
                : null,
            route: {
                path: location.routePath ?? null,
                selectedChannelId: location.selectedChannelId ?? null,
                effectiveChannelId: location.channelId ?? null
            },
            messageCount: structuredMessages.length,
            oldestMessageId: structuredMessages[0]?.id ?? null,
            newestMessageId:
                structuredMessages[structuredMessages.length - 1]?.id ?? null,
            messages: structuredMessages
        };
    }

    structureMessage(message, location) {
        const author = message?.author ?? null;

        return {
            id: message?.id ?? null,
            channelId: message?.channel_id ?? message?.channelId ?? location.channelId ?? null,
            guildId: message?.guild_id ?? message?.guildId ?? location.guildId ?? null,
            type: this.toFiniteNumber(message?.type),
            timestamp: this.normalizeTimestamp(message?.timestamp),
            editedTimestamp: this.normalizeTimestamp(
                message?.editedTimestamp ?? message?.edited_timestamp
            ),
            author: author
                ? {
                    id: author.id ?? null,
                    username: author.username ?? null,
                    globalName: author.globalName ?? null,
                    displayName: author.displayName ?? null,
                    bot: Boolean(author.bot)
                }
                : null,
            content: typeof message?.content === "string" ? message.content : "",
            pinned: Boolean(message?.pinned),
            tts: Boolean(message?.tts),
            attachments: this.toArraySafe(message?.attachments).map(attachment =>
                this.structureAttachment(attachment)
            ),
            embeds: this.toArraySafe(message?.embeds).map(embed =>
                this.structureEmbed(embed)
            ),
            messageReference: this.structureMessageReference(
                message?.messageReference ?? message?.message_reference
            )
        };
    }

    structureAttachment(attachment) {
        if (!attachment) return null;

        return {
            id: attachment.id ?? null,
            filename: attachment.filename ?? null,
            title: attachment.title ?? null,
            description: attachment.description ?? null,
            contentType: attachment.content_type ?? attachment.contentType ?? null,
            size: this.toFiniteNumber(attachment.size),
            url: attachment.url ?? null,
            proxyUrl: attachment.proxy_url ?? attachment.proxyUrl ?? null,
            width: this.toFiniteNumber(attachment.width),
            height: this.toFiniteNumber(attachment.height),
            ephemeral: Boolean(attachment.ephemeral)
        };
    }

    structureEmbed(embed) {
        if (!embed) return null;

        const fields = this.toArraySafe(embed.fields).map(field => ({
            name: field?.name ?? null,
            value: field?.value ?? null,
            inline: Boolean(field?.inline)
        }));

        return {
            type: embed.type ?? null,
            url: embed.url ?? null,
            title: embed.title ?? null,
            description: embed.description ?? null,
            timestamp: this.normalizeTimestamp(embed.timestamp),
            color: this.toFiniteNumber(embed.color),
            provider: embed.provider
                ? {
                    name: embed.provider.name ?? null,
                    url: embed.provider.url ?? null
                }
                : null,
            author: embed.author
                ? {
                    name: embed.author.name ?? null,
                    url: embed.author.url ?? null,
                    iconUrl: embed.author.icon_url ?? embed.author.iconURL ?? null
                }
                : null,
            thumbnail: this.structureEmbedMedia(embed.thumbnail),
            image: this.structureEmbedMedia(embed.image),
            fields,
            footer: embed.footer
                ? {
                    text: embed.footer.text ?? null,
                    iconUrl: embed.footer.icon_url ?? embed.footer.iconURL ?? null
                }
                : null
        };
    }

    structureEmbedMedia(media) {
        if (!media) return null;

        return {
            url: media.url ?? null,
            proxyUrl: media.proxy_url ?? media.proxyURL ?? null,
            width: this.toFiniteNumber(media.width),
            height: this.toFiniteNumber(media.height)
        };
    }

    structureMessageReference(reference) {
        if (!reference) return null;

        return {
            messageId:
                reference.message_id ?? reference.messageId ?? null,
            channelId:
                reference.channel_id ?? reference.channelId ?? null,
            guildId:
                reference.guild_id ?? reference.guildId ?? null
        };
    }

    initializeDiskExport() {
        this.fs = require("fs");
        this.path = require("path");

        const fsCapabilities = [
            "mkdirSync",
            "readFileSync",
            "writeFileSync",
            "existsSync",
            "renameSync",
            "rmSync",
            "unlinkSync"
        ].filter(name => typeof this.fs?.[name] === "function");

        this.api.Logger.info(
            `Disk Export fs capabilities: ${fsCapabilities.join(", ") || "нет доступных методов"}.`
        );

        this.exportRoot = this.resolveExportRoot();
        this.fs.mkdirSync(this.exportRoot, {recursive: true});

        const manifestPath = this.path.join(this.exportRoot, "manifest.json");

        this.writeJsonIfChanged(manifestPath, {
            storageSchemaVersion: this.storageSchemaVersion,
            captureSchemaVersion: this.captureSchemaVersion,
            ddsVersion: this.version,
            format: "dds-json",
            layout: "id-addressed",
            mediaPolicy: "metadata-only",
            rootStructure:
                "guilds/<guildId>/channels/<channelId>[/threads/<threadId>]/capture.json"
        });
    }

    resolveExportRoot() {
        // BetterDiscord уже знает реальную папку plugins на текущей ОС.
        // Строим DDS_Data рядом с ней и не зависим от require("os"),
        // который в renderer-runtime BetterDiscord может резолвиться как локальный файл.
        const pluginFolder =
            typeof BdApi !== "undefined" &&
            BdApi.Plugins &&
            typeof BdApi.Plugins.folder === "string"
                ? BdApi.Plugins.folder
                : null;

        if (pluginFolder) {
            return this.path.join(
                this.path.dirname(pluginFolder),
                "DDS_Data"
            );
        }

        // Fallback на env нужен только если API папки когда-либо станет недоступен.
        const env =
            typeof process !== "undefined" && process.env
                ? process.env
                : {};

        if (env.APPDATA) {
            return this.path.join(
                env.APPDATA,
                "BetterDiscord",
                "DDS_Data"
            );
        }

        const home = env.HOME || env.USERPROFILE || ".";
        const configHome =
            env.XDG_CONFIG_HOME ||
            this.path.join(home, ".config");

        return this.path.join(
            configHome,
            "BetterDiscord",
            "DDS_Data"
        );
    }

    scheduleDiskExport(capture, fingerprint) {
        const descriptor = this.getExportDescriptor(capture);

        if (!descriptor) {
            this.api.Logger.warn(
                "Disk Export: снимок пропущен — пока поддерживаются только серверные каналы/темы с Discord ID."
            );
            return;
        }

        const key = descriptor.key;
        const previous = this.pendingExports.get(key);

        if (previous?.timer) {
            clearTimeout(previous.timer);
        }

        const entry = {
            capture,
            descriptor,
            fingerprint,
            timer: null
        };

        entry.timer = setTimeout(() => {
            entry.timer = null;

            try {
                this.flushExportKey(key);
            } catch (error) {
                this.api.Logger.error(
                    `Disk Export: ошибка записи ${key}:`,
                    error
                );
            }
        }, this.exportDebounceMs);

        this.pendingExports.set(key, entry);
    }

    flushPendingExports() {
        for (const [key, entry] of Array.from(this.pendingExports.entries())) {
            if (entry?.timer) {
                clearTimeout(entry.timer);
                entry.timer = null;
            }

            this.flushExportKey(key);
        }
    }

    flushExportKey(key) {
        const entry = this.pendingExports.get(key);

        if (!entry) return false;

        this.pendingExports.delete(key);

        if (this.lastExportFingerprints.get(key) === entry.fingerprint) {
            return false;
        }

        this.persistCapture(entry.capture, entry.descriptor);
        this.lastExportFingerprints.set(key, entry.fingerprint);

        return true;
    }

    getExportDescriptor(capture) {
        const guildId = this.requireSnowflake(capture?.guild?.id, "guildId");

        if (!guildId) {
            return null;
        }

        const guildDir = this.path.join(
            this.exportRoot,
            "guilds",
            guildId
        );

        if (capture?.thread?.id) {
            const parentChannelId = this.requireSnowflake(
                capture.thread.parentChannelId,
                "parentChannelId"
            );
            const threadId = this.requireSnowflake(
                capture.thread.id,
                "threadId"
            );

            if (!parentChannelId || !threadId) {
                return null;
            }

            const channelDir = this.path.join(
                guildDir,
                "channels",
                parentChannelId
            );

            return {
                key: `guild:${guildId}:channel:${parentChannelId}:thread:${threadId}`,
                kind: "thread",
                guildId,
                channelId: parentChannelId,
                threadId,
                guildDir,
                channelDir,
                targetDir: this.path.join(
                    channelDir,
                    "threads",
                    threadId
                )
            };
        }

        const channelId = this.requireSnowflake(
            capture?.channel?.id,
            "channelId"
        );

        if (!channelId) {
            return null;
        }

        const channelDir = this.path.join(
            guildDir,
            "channels",
            channelId
        );

        return {
            key: `guild:${guildId}:channel:${channelId}`,
            kind: "channel",
            guildId,
            channelId,
            threadId: null,
            guildDir,
            channelDir,
            targetDir: channelDir
        };
    }

    requireSnowflake(value, label) {
        if (value === null || value === undefined || value === "") {
            return null;
        }

        const text = String(value);

        if (!/^\d+$/.test(text)) {
            throw new Error(
                `Disk Export: ${label} содержит недопустимый Discord ID: ${text}`
            );
        }

        return text;
    }

    persistCapture(capture, descriptor) {
        this.fs.mkdirSync(descriptor.targetDir, {recursive: true});

        const guildMetadata = {
            id: descriptor.guildId,
            name: capture?.guild?.name ?? null
        };

        this.writeJsonIfChanged(
            this.path.join(descriptor.guildDir, "guild.json"),
            guildMetadata
        );

        const channelMetadata = this.createChannelMetadata(
            capture,
            descriptor
        );

        this.writeJsonIfChanged(
            this.path.join(descriptor.channelDir, "channel.json"),
            channelMetadata
        );

        const capturePath = this.path.join(
            descriptor.targetDir,
            "capture.json"
        );

        this.atomicWriteJson(capturePath, capture);

        this.atomicWriteJson(
            this.path.join(this.exportRoot, "manifest.json"),
            {
                storageSchemaVersion: this.storageSchemaVersion,
                captureSchemaVersion: this.captureSchemaVersion,
                ddsVersion: this.version,
                format: "dds-json",
                layout: "id-addressed",
                mediaPolicy: "metadata-only",
                rootStructure:
                    "guilds/<guildId>/channels/<channelId>[/threads/<threadId>]/capture.json",
                lastExport: {
                    exportedAt: new Date().toISOString(),
                    kind: descriptor.kind,
                    guildId: descriptor.guildId,
                    channelId: descriptor.channelId,
                    threadId: descriptor.threadId,
                    captureRevision: capture?.captureRevision ?? null,
                    messageCount: capture?.messageCount ?? 0
                }
            }
        );

        this.api.Logger.info(
            `Disk Export → ${descriptor.kind === "thread" ? "тема" : "канал"} ` +
            `${descriptor.threadId ?? descriptor.channelId}: ` +
            `${capture?.messageCount ?? 0} сообщений → ${capturePath}`
        );
    }

    createChannelMetadata(capture, descriptor) {
        const sourceChannel = this.stores.ChannelStore?.getChannel?.(
            descriptor.channelId
        );

        if (sourceChannel) {
            return {
                id: descriptor.channelId,
                name: sourceChannel.name ?? null,
                type: this.toFiniteNumber(sourceChannel.type),
                guildId:
                    sourceChannel.guild_id ??
                    sourceChannel.guildId ??
                    descriptor.guildId,
                parentId:
                    sourceChannel.parent_id ??
                    sourceChannel.parentId ??
                    null
            };
        }

        if (descriptor.kind === "thread") {
            return {
                id: descriptor.channelId,
                name: capture?.thread?.parentChannelName ?? null,
                type: capture?.thread?.parentChannelType ?? null,
                guildId: descriptor.guildId,
                parentId: null
            };
        }

        return {
            id: descriptor.channelId,
            name: capture?.channel?.name ?? null,
            type: capture?.channel?.type ?? null,
            guildId:
                capture?.channel?.guildId ??
                descriptor.guildId,
            parentId: capture?.channel?.parentId ?? null
        };
    }

    writeJsonIfChanged(filePath, value) {
        const serialized = this.serializeJson(value);

        try {
            if (this.fs.existsSync(filePath)) {
                const current = this.fs.readFileSync(filePath, "utf8");

                if (current === serialized) {
                    return false;
                }
            }
        } catch (error) {
            this.api.Logger.warn(
                `Disk Export: не удалось сравнить ${filePath}; файл будет перезаписан.`,
                error
            );
        }

        this.atomicWriteText(filePath, serialized);
        return true;
    }

    atomicWriteJson(filePath, value) {
        this.atomicWriteText(
            filePath,
            this.serializeJson(value)
        );
    }

    serializeJson(value) {
        return `${JSON.stringify(value, null, 2)}\n`;
    }

    atomicWriteText(filePath, text) {
        const directory = this.path.dirname(filePath);
        const basename = this.path.basename(filePath);

        this.fs.mkdirSync(directory, {recursive: true});

        if (typeof this.fs.writeFileSync !== "function") {
            throw new Error(
                "Disk Export: BetterDiscord fs polyfill не предоставляет writeFileSync()."
            );
        }

        const tempPath = this.path.join(
            directory,
            `.${basename}.${process.pid}.${++this.atomicWriteCounter}.tmp`
        );

        try {
            // BetterDiscord предоставляет совместимый fs-polyfill, но не весь
            // Node.js fs API. В частности, openSync()/fsyncSync() могут отсутствовать.
            // Поэтому пишем временный файл через поддерживаемый writeFileSync().
            this.fs.writeFileSync(tempPath, text, "utf8");

            if (typeof this.fs.renameSync === "function") {
                try {
                    this.fs.renameSync(tempPath, filePath);
                    return;
                } catch (error) {
                    // На Windows замена уже существующего файла через rename может
                    // быть ограничена реализацией polyfill. В таком случае сохраняем
                    // корректность данных через прямую запись и убираем temp.
                    this.api.Logger.warn(
                        `Disk Export: atomic rename недоступен для ${filePath}; ` +
                        "используется совместимый writeFileSync fallback.",
                        error
                    );
                }
            } else {
                this.api.Logger.warn(
                    "Disk Export: fs.renameSync() недоступен; " +
                    "используется совместимый writeFileSync fallback."
                );
            }

            this.fs.writeFileSync(filePath, text, "utf8");
            this.removeTempFile(tempPath);
        } catch (error) {
            this.removeTempFile(tempPath);
            throw error;
        }
    }

    removeTempFile(tempPath) {
        try {
            if (
                typeof this.fs.existsSync === "function" &&
                !this.fs.existsSync(tempPath)
            ) {
                return;
            }

            if (typeof this.fs.rmSync === "function") {
                this.fs.rmSync(tempPath, {force: true});
                return;
            }

            if (typeof this.fs.unlinkSync === "function") {
                this.fs.unlinkSync(tempPath);
            }
        } catch {
            // Cleanup temp-файла не должен маскировать исходный результат записи.
        }
    }

    getCurrentCapture() {
        return this.currentCapture;
    }

    assertSerializable(capture) {
        try {
            const serialized = JSON.stringify(capture);

            if (typeof serialized !== "string") {
                throw new Error("JSON.stringify() не вернул строку.");
            }

            return serialized.length;
        } catch (error) {
            throw new Error(
                `Structured Capture не прошёл JSON-проверку: ${error?.message || error}`
            );
        }
    }

    computeMessageSignature(channelId, messages) {
        let hash = 2166136261;

        const feed = value => {
            const text = String(value ?? "");

            for (let i = 0; i < text.length; i++) {
                hash ^= text.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
        };

        feed(channelId);
        feed(messages.length);

        for (const message of messages) {
            feed(message?.id);
            feed(
                this.normalizeTimestamp(
                    message?.editedTimestamp ??
                    message?.edited_timestamp ??
                    message?.timestamp
                )
            );
            feed(typeof message?.content === "string" ? message.content.length : 0);
            feed(this.getCollectionSize(message?.attachments));
            feed(this.getCollectionSize(message?.embeds));
        }

        return `${channelId}:${messages.length}:${(hash >>> 0).toString(16)}`;
    }

    getLoadedMessages(channelId) {
        const collection = this.stores.MessageStore?.getMessages?.(channelId);

        if (!collection) {
            return [];
        }

        const messages = this.toArraySafe(collection).filter(Boolean);

        if (messages.length === 0 && this.getCollectionSize(collection) > 0) {
            this.api.Logger.warn(
                "MessageStore.getMessages() вернул коллекцию неизвестного типа."
            );
        }

        return messages;
    }

    toArraySafe(value) {
        if (!value) return [];

        if (Array.isArray(value)) {
            return value.slice();
        }

        if (typeof value.toArray === "function") {
            try {
                const array = value.toArray();
                return Array.isArray(array) ? array : [];
            } catch {
                return [];
            }
        }

        if (Array.isArray(value._array)) {
            return value._array.slice();
        }

        if (typeof value.values === "function") {
            try {
                return Array.from(value.values());
            } catch {
                return [];
            }
        }

        return [];
    }

    normalizeTimestamp(value) {
        if (!value) return null;

        try {
            if (typeof value.toISOString === "function") {
                return value.toISOString();
            }

            if (typeof value.toDate === "function") {
                const date = value.toDate();

                if (date && typeof date.toISOString === "function") {
                    return date.toISOString();
                }
            }

            const date = new Date(value);

            if (!Number.isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch {
            // Оставляем fallback ниже.
        }

        return String(value);
    }

    toFiniteNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    getCollectionSize(value) {
        if (!value) return 0;

        if (Array.isArray(value)) {
            return value.length;
        }

        if (typeof value.size === "number") {
            return value.size;
        }

        if (typeof value.length === "number") {
            return value.length;
        }

        if (typeof value.count === "function") {
            try {
                return value.count();
            } catch {
                return 0;
            }
        }

        return 0;
    }

    getRouteSnapshot() {
        const pathname = this.safeGetPathname();
        const segments = pathname.split("/").filter(Boolean);

        const result = {
            pathname,
            guildId: null,
            channelId: null,
            parentChannelId: null,
            threadId: null
        };

        if (segments[0] !== "channels") {
            return result;
        }

        const guildPart = segments[1] ?? null;
        const channelPart = segments[2] ?? null;

        result.guildId = guildPart && guildPart !== "@me" ? guildPart : null;
        result.channelId = channelPart;

        if (segments[3] === "threads" && segments[4]) {
            result.parentChannelId = channelPart;
            result.threadId = segments[4];
        }

        return result;
    }

    safeGetPathname() {
        try {
            if (
                typeof window !== "undefined" &&
                typeof window.location?.pathname === "string"
            ) {
                return window.location.pathname;
            }
        } catch {
            // Возвращаем пустой маршрут ниже.
        }

        return "";
    }

    getLocationSnapshot() {
        const selectedGuildId =
            this.stores.SelectedGuildStore?.getGuildId?.() ?? null;

        const selectedChannelId =
            this.stores.SelectedChannelStore?.getChannelId?.() ?? null;

        const route = this.getRouteSnapshot();

        const routeGuildMatches =
            !route.guildId ||
            !selectedGuildId ||
            route.guildId === selectedGuildId;

        const routeParentMatches =
            !route.parentChannelId ||
            !selectedChannelId ||
            route.parentChannelId === selectedChannelId;

        const threadId =
            routeGuildMatches && routeParentMatches
                ? route.threadId
                : null;

        const guildId = selectedGuildId ?? route.guildId ?? null;
        const effectiveChannelId = threadId ?? selectedChannelId ?? null;

        const guild = guildId
            ? this.stores.GuildStore?.getGuild?.(guildId)
            : null;

        const channel = effectiveChannelId
            ? this.stores.ChannelStore?.getChannel?.(effectiveChannelId)
            : null;

        const parentChannelId = threadId
            ? route.parentChannelId ?? selectedChannelId ?? null
            : null;

        const parentChannel = parentChannelId
            ? this.stores.ChannelStore?.getChannel?.(parentChannelId)
            : null;

        return {
            guildId,
            guildName: guild?.name || "неизвестный сервер",
            selectedChannelId,
            channelId: effectiveChannelId,
            channelName:
                channel?.name ||
                (threadId ? "неизвестная тема" : "неизвестный канал"),
            isThread: Boolean(threadId),
            threadId,
            parentChannelId,
            parentChannelName:
                parentChannel?.name ||
                (threadId ? "неизвестный родительский канал" : null),
            routePath: route.pathname
        };
    }

    logLocationSnapshot(location, label = "Позиция") {
        if (location.guildId) {
            this.api.Logger.info(
                `${label} — сервер: ${location.guildName} (${location.guildId})`
            );
        } else {
            this.api.Logger.info(`${label} — сервер не выбран.`);
        }

        if (location.isThread && location.channelId) {
            this.api.Logger.info(
                `${label} — тема: ${location.channelName} (${location.channelId}), ` +
                `родитель: ${location.parentChannelName} (${location.parentChannelId})`
            );
        } else if (location.channelId) {
            this.api.Logger.info(
                `${label} — канал: ${location.channelName} (${location.channelId})`
            );
        } else {
            this.api.Logger.info(`${label} — канал не выбран.`);
        }
    }

    registerCleanup(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(
                "DDS registerCleanup() ожидает функцию."
            );
        }

        this.cleanups.push(callback);
        return callback;
    }
};
