/// <reference path="../types/melvor.d.ts" />
/**
 * Manages notification storage across multiple backends
 */
export class StorageManager {
	constructor(ctx, settings) {
		this.notifications = [];
		this.saveDebounceTimer = null;
		this.SAVE_DEBOUNCE_MS = 1000;
		this.MAX_CHARACTER_SAVE_BYTES = 8192; // 8KB
		this.ctx = ctx;
		this.settings = settings;
	}
	/**
	 * Optimize notification for storage by removing redundant data
	 * Prefers mediaRef, but falls back to optimized media URL if mediaRef is undefined
	 */
	optimizeNotification(notification) {
		const optimized = {
			id: notification.id,
			timestamp: notification.timestamp,
			type: notification.type,
			message: notification.message,
		};
		// Only include count if > 1
		if (notification.count && notification.count > 1) {
			optimized.count = notification.count;
		}
		// Only include quantity if > 1
		if (notification.quantity && notification.quantity > 1) {
			optimized.quantity = notification.quantity;
		}
		// Prefer mediaRef, but fall back to optimized media URL
		if (notification.mediaRef) {
			optimized.mediaRef = notification.mediaRef;
		} else if (notification.media) {
			// Fallback: save media URL with dl: prefix + CDN prefix replacement
			optimized.mediaRef = `dl:${notification.media.replace('https://cdn2-main.melvor.net/assets/media/', 'mainCDN:')}`;
		}
		// Include customID if present
		if (notification.customID) {
			optimized.customID = notification.customID;
		}
		return optimized;
	}
	/**
	 * Reconstruct notification from storage by rebuilding media URLs from mediaRef
	 */
	reconstructNotification(stored) {
		const notification = {
			id: stored.id,
			timestamp: stored.timestamp,
			type: stored.type,
			message: stored.message,
			count: stored.count || 1, // Default to 1 if not present
			quantity: stored.quantity || 1, // Default to 1 if not present
		};
		// Reconstruct media URL from mediaRef
		if (stored.mediaRef) {
			notification.media = this.reconstructMedia(stored.mediaRef);
			// Only preserve mediaRef if it's a real reference (not a fallback URL with dl: prefix)
			if (!stored.mediaRef.startsWith('dl:')) {
				notification.mediaRef = stored.mediaRef; // Keep the ref for potential re-saves
			}
			// For fallback URLs (dl: prefix), mediaRef remains undefined so it gets re-optimized on next save
		}
		// Restore customID if present
		if (stored.customID) {
			notification.customID = stored.customID;
		}
		return notification;
	}
	/**
	 * Reconstruct media URL from reference
	 * Examples:
	 *   "skill:woodcutting" -> game.skills.getObjectByID('woodcutting').media
	 *   "item:melvorD:Oak_Logs" -> game.items.getObjectByID('melvorD:Oak_Logs').media
	 *   "static:coins.png" -> "assets/media/main/coins.png"
	 *   "dl:mainCDN:path/file.png" -> "https://cdn2-main.melvor.net/assets/media/path/file.png" (fallback URL)
	 */
	reconstructMedia(mediaRef) {
		if (!mediaRef) return '';
		// Check for direct link (dl:) fallback - these are optimized URLs, not real references
		if (mediaRef.startsWith('dl:')) {
			const urlPart = mediaRef.substring(3); // Remove "dl:" prefix
			if (urlPart.startsWith('mainCDN:')) {
				return urlPart.replace(
					'mainCDN:',
					'https://cdn2-main.melvor.net/assets/media/',
				);
			}
			return urlPart; // Return as-is if it's a full URL
		}
		const [type, ...idParts] = mediaRef.split(':');
		const id = idParts.join(':'); // Rejoin in case ID contains colons
		try {
			switch (type) {
				case 'item':
					return game.items.getObjectByID(id)?.media || '';
				case 'skill':
					return game.skills.getObjectByID(id)?.media || '';
				case 'currency':
					return game.currencies.getObjectByID(id)?.media || '';
				case 'mastery':
					// Mastery actions are skill-specific
					// Try to find the action in all skills
					for (const skill of game.skills.allObjects) {
						if (skill.actions) {
							const action = skill.actions.getObjectByID(id);
							if (action?.media) return action.media;
						}
					}
					return '';
				case 'mark':
					// Summoning marks
					const mark = game.summoning?.marks?.getObjectByID(id);
					return mark?.markMedia || '';
				case 'static':
					// Static media files
					return `assets/media/main/${id}`;
				default:
					logger.warn(`Unknown mediaRef type: ${type}`);
					return '';
			}
		} catch (error) {
			logger.error(
				`Failed to reconstruct media from ref "${mediaRef}":`,
				error,
			);
			return '';
		}
	}
	/**
	 * Update storage settings
	 */
	updateSettings(settings) {
		const oldMode = this.settings.mode;
		this.settings = { ...this.settings, ...settings };
		// If mode changed, trigger immediate save to new backend
		if (settings.mode && settings.mode !== oldMode) {
			logger.info(`Storage mode changed: ${oldMode} → ${settings.mode}`);
			this.save();
		}
		logger.debug('Storage settings updated:', this.settings);
	}
	/**
	 * Setup event listeners for settings changes
	 */
	setupSettingsListeners() {
		// Listen for storage mode changes
		document.addEventListener(
			'activity-monitor-storage-mode-changed',
			(event) => {
				const { mode } = event.detail;
				this.updateSettings({ mode });
				logger.info(`Storage mode changed to: ${mode}`);
			},
		);
		// Listen for other storage setting changes
		document.addEventListener(
			'activity-monitor-settings-changed',
			(event) => {
				const { key, value } = event.detail;
				// Map setting key to storage settings property
				const settingMap = {
					characterSaveType: 'characterSaveType',
					characterSavePercentage: 'characterSavePercentage',
					characterSaveLineCount: 'characterSaveLineCount',
					localStorageLineCount: 'localStorageLineCount',
				};
				const settingKey = settingMap[key];
				if (settingKey) {
					this.updateSettings({ [settingKey]: value });
					logger.debug(`Storage setting updated: ${key} = ${value}`);
				}
			},
		);
		logger.info('Storage settings listeners registered');
	}
	/**
	 * Add notification to storage (with grouping)
	 */
	addNotification(notification) {
		// Get grouping settings
		const settingsManager = globalThis.ActivityMonitorMod?.settings;
		const groupSimilar =
			settingsManager?.getSetting('groupSimilar') ?? true;
		const timeWindowSeconds =
			settingsManager?.getSetting('groupSimilarTimeWindow') ?? 30;
		if (groupSimilar) {
			// Try to find existing notification to group with
			const timeWindowMs = timeWindowSeconds * 1000;
			const now = Date.now();
			// Notifications with a quantity are grouped by type alone (e.g. all GP
			// gains collapse into one entry regardless of individual amounts).
			// Message-only notifications (e.g. errors) still require an exact
			// message match so unrelated errors are never merged.
			const hasQuantity = notification.quantity !== undefined;
			let existingIndex = -1;
			for (let i = 0; i < this.notifications.length; i++) {
				const n = this.notifications[i];
				if (now - n.timestamp > timeWindowMs) {
					break; // All remaining notifications are older, stop early
				}
				const typeMatches = n.type === notification.type;
				const contentMatches =
					hasQuantity || n.message === notification.message;
				if (typeMatches && contentMatches) {
					existingIndex = i;
					break;
				}
			}
			if (existingIndex !== -1) {
				// Found matching notification - increment count instead of adding new
				const existing = this.notifications[existingIndex];
				existing.count = (existing.count || 1) + 1;
				existing.timestamp = now; // Update to latest timestamp
				// Accumulate quantity so the grouped entry reflects the running total
				if (hasQuantity) {
					existing.quantity =
						(existing.quantity || 0) + notification.quantity;
				}
				// Remove from current position
				this.notifications.splice(existingIndex, 1);
				// Put at beginning - it has the newest timestamp
				this.notifications.unshift(existing);
				// Dispatch event for UI updates
				document.dispatchEvent(
					new CustomEvent('activity-monitor-notification-updated', {
						detail: { notification: existing },
					}),
				);
				// Debounced save
				this.debouncedSave();
				return;
			}
		}
		// No match found or grouping disabled - add as new notification
		notification.count = 1;
		this.notifications.unshift(notification);
		// Prune if necessary
		this.pruneIfNeeded();
		// Dispatch event for UI updates
		document.dispatchEvent(
			new CustomEvent('activity-monitor-notification-added', {
				detail: { notification },
			}),
		);
		// Debounced save
		this.debouncedSave();
	}
	/**
	 * Get all notifications
	 */
	getNotifications() {
		return this.notifications.map((n) => ({ ...n }));
	}
	/**
	 * Get notification by ID
	 */
	getNotification(id) {
		return this.notifications.find((n) => n.id === id);
	}
	/**
	 * Update notification
	 */
	updateNotification(id, updates) {
		const index = this.notifications.findIndex((n) => n.id === id);
		if (index !== -1) {
			this.notifications[index] = {
				...this.notifications[index],
				...updates,
			};
			this.debouncedSave();
		}
	}
	/**
	 * Remove notification by ID
	 */
	removeNotification(id) {
		this.notifications = this.notifications.filter((n) => n.id !== id);
		this.debouncedSave();
	}
	/**
	 * Clear all notifications
	 */
	clearAll() {
		this.notifications = [];
		this.save();
	}
	/**
	 * Load notifications from storage
	 */
	async load() {
		try {
			switch (this.settings.mode) {
				case 'character-save':
					await this.loadFromCharacterStorage();
					break;
				case 'local-storage':
					await this.loadFromLocalStorage();
					break;
				case 'memory-only':
					this.notifications = [];
					logger.info(
						'Memory-only mode - starting with empty notifications',
					);
					break;
			}
			logger.info(
				`Loaded ${this.notifications.length} notifications from ${this.settings.mode}`,
			);
		} catch (error) {
			logger.error('Failed to load notifications:', error);
			this.notifications = [];
		}
	}
	/**
	 * Save notifications to storage (debounced)
	 */
	debouncedSave() {
		if (this.saveDebounceTimer !== null) {
			clearTimeout(this.saveDebounceTimer);
		}
		this.saveDebounceTimer = window.setTimeout(() => {
			this.save();
			this.saveDebounceTimer = null;
		}, this.SAVE_DEBOUNCE_MS);
	}
	/**
	 * Save notifications to storage (immediate)
	 */
	async save() {
		try {
			switch (this.settings.mode) {
				case 'character-save':
					await this.saveToCharacterStorage();
					break;
				case 'local-storage':
					await this.saveToLocalStorage();
					break;
				case 'memory-only':
					// No-op
					break;
			}
			logger.debug(
				`Saved ${this.notifications.length} notifications to ${this.settings.mode}`,
			);
		} catch (error) {
			logger.error('Failed to save notifications:', error);
		}
	}
	/**
	 * Save to character storage
	 */
	async saveToCharacterStorage() {
		// Optimize notifications before compression
		const optimizedNotifications = this.notifications.map((n) =>
			this.optimizeNotification(n),
		);
		const compressed = await CompressionUtil.compress(
			optimizedNotifications,
		);
		const base64 = CompressionUtil.toBase64(compressed.compressed);
		const storageData = {
			data: base64,
			uncompressedSize: compressed.uncompressedSize,
			version: compressed.version,
		};
		this.ctx.characterStorage.setItem(
			'notifications',
			JSON.stringify(storageData),
		);
		const sizeKB = (compressed.compressed.length / 1024).toFixed(2);
		logger.debug(`Saved ${sizeKB}KB to character storage`);
	}
	/**
	 * Load from localStorage
	 */
	async loadFromLocalStorage() {
		const key = this.getLocalStorageKey();
		const data = localStorage.getItem(key);
		if (!data) {
			this.notifications = [];
			return;
		}
		try {
			const storageData = JSON.parse(data);
			const compressed = CompressionUtil.fromBase64(storageData.data);
			const compressedStore = {
				compressed,
				uncompressedSize: storageData.uncompressedSize,
				version: storageData.version,
			};
			const storedNotifications =
				await CompressionUtil.decompress(compressedStore);
			// Reconstruct media URLs from mediaRef
			this.notifications = storedNotifications.map((n) =>
				this.reconstructNotification(n),
			);
			logger.info(
				`Loaded ${this.notifications.length} notifications from localStorage`,
			);
		} catch (error) {
			logger.error('Failed to parse localStorage data:', error);
			this.notifications = [];
		}
	}
	/**
	 * Save to localStorage
	 */
	async saveToLocalStorage() {
		const key = this.getLocalStorageKey();
		// Optimize notifications before compression
		const optimizedNotifications = this.notifications.map((n) =>
			this.optimizeNotification(n),
		);
		const compressed = await CompressionUtil.compress(
			optimizedNotifications,
		);
		const base64 = CompressionUtil.toBase64(compressed.compressed);
		const storageData = {
			data: base64,
			uncompressedSize: compressed.uncompressedSize,
			version: compressed.version,
		};
		localStorage.setItem(key, JSON.stringify(storageData));
		const sizeKB = (compressed.compressed.length / 1024).toFixed(2);
		logger.debug(`Saved ${sizeKB}KB to localStorage`);
	}
	/**
	 * Load from character storage
	 */
	async loadFromCharacterStorage() {
		const data = this.ctx.characterStorage.getItem('notifications');
		if (!data) {
			this.notifications = [];
			return;
		}
		try {
			const storageData = JSON.parse(data);
			const compressed = CompressionUtil.fromBase64(storageData.data);
			const compressedStore = {
				compressed,
				uncompressedSize: storageData.uncompressedSize,
				version: storageData.version,
			};
			const storedNotifications =
				await CompressionUtil.decompress(compressedStore);
			// Reconstruct media URLs from mediaRef
			this.notifications = storedNotifications.map((n) =>
				this.reconstructNotification(n),
			);
			logger.info(
				`Loaded ${this.notifications.length} notifications from character storage`,
			);
		} catch (error) {
			logger.error('Failed to parse character storage data:', error);
			this.notifications = [];
		}
	}
	/**
	 * Prune notifications if necessary based on storage mode settings
	 */
	async pruneIfNeeded() {
		if (this.settings.mode === 'character-save') {
			if (this.settings.characterSaveType === 'percentage') {
				await this.pruneToPercentage();
			} else {
				await this.pruneToCount(this.settings.characterSaveLineCount);
			}
		} else if (this.settings.mode === 'local-storage') {
			await this.pruneToCount(this.settings.localStorageLineCount);
		}
		// memory-only mode doesn't need pruning
	}
	/**
	 * Get localStorage key for current character
	 */
	getLocalStorageKey() {
		const characterName = game?.currentGamemode?.localID || 'default';
		return `activity-monitor-notifications-${characterName}`;
	}
	/**
	 * Prune to stay within percentage of max character save size
	 */
	async pruneToPercentage() {
		const maxBytes = Math.floor(
			this.MAX_CHARACTER_SAVE_BYTES *
				(this.settings.characterSavePercentage / 100),
		);
		// Check current size
		const compressed = await CompressionUtil.compress(this.notifications);
		const currentSize = compressed.compressed.length;
		if (currentSize <= maxBytes) {
			return; // Within limit
		}
		// Remove oldest notifications until within limit
		let pruneCount = 0;
		while (this.notifications.length > 0 && currentSize > maxBytes) {
			this.notifications.pop(); // Remove oldest (at end)
			pruneCount++;
			// Only re-compress after removing multiple items to reduce overhead
			if (pruneCount % 5 === 0 || this.notifications.length === 0) {
				const testCompressed = await CompressionUtil.compress(
					this.notifications,
				);
				const newSize = testCompressed.compressed.length;
				if (newSize <= maxBytes) {
					if (pruneCount > 0) {
						logger.debug(
							`Pruned ${pruneCount} notifications to stay within ${this.settings.characterSavePercentage}% limit`,
						);
					}
					return;
				}
			}
		}
		if (pruneCount > 0) {
			logger.debug(
				`Pruned ${pruneCount} notifications to stay within ${this.settings.characterSavePercentage}% limit`,
			);
		}
	}
	/**
	 * Prune to specific count
	 */
	async pruneToCount(maxCount) {
		if (this.notifications.length <= maxCount) {
			return; // Within limit
		}
		const pruneCount = this.notifications.length - maxCount;
		this.notifications = this.notifications.slice(0, maxCount);
		logger.debug(
			`Pruned ${pruneCount} notifications to stay within ${maxCount} limit`,
		);
	}
	/**
	 * Get storage statistics
	 */
	async getStats() {
		const compressed = await CompressionUtil.compress(this.notifications);
		const uncompressedSize = compressed.uncompressedSize;
		const compressedSize = compressed.compressed.length;
		const ratio =
			uncompressedSize > 0 ?
				(1 - compressedSize / uncompressedSize) * 100
			:	0;
		// Estimate max count based on current compression ratio
		const avgCompressedPerNotif =
			this.notifications.length > 0 ?
				compressedSize / this.notifications.length
			:	60; // Default estimate
		let estimatedMax = 0;
		if (
			this.settings.mode === 'character-save' &&
			this.settings.characterSaveType === 'percentage'
		) {
			const maxBytes = Math.floor(
				this.MAX_CHARACTER_SAVE_BYTES *
					(this.settings.characterSavePercentage / 100),
			);
			estimatedMax = Math.floor(maxBytes / avgCompressedPerNotif);
		} else if (this.settings.mode === 'character-save') {
			estimatedMax = this.settings.characterSaveLineCount;
		} else if (this.settings.mode === 'local-storage') {
			estimatedMax = this.settings.localStorageLineCount;
		} else {
			estimatedMax = 999999; // Memory-only - unlimited
		}
		return {
			count: this.notifications.length,
			compressedSize,
			uncompressedSize,
			compressionRatio: ratio,
			estimatedMaxCount: estimatedMax,
		};
	}
}
//# sourceMappingURL=storage.js.map
