/// <reference path="../types/melvor.d.ts" />

// Maps notification type names to their corresponding capture settings property.
const NOTIFICATION_TYPE_TO_SETTING = Object.freeze({
	Error: 'captureErrors',
	Success: 'captureSuccess',
	Info: 'captureInfo',
	AddItem: 'captureItemsAdded',
	RemoveItem: 'captureItemsRemoved',
	AddGP: 'captureGPAdded',
	RemoveGP: 'captureGPRemoved',
	AddSlayerCoins: 'captureSlayerCoinsAdded',
	RemoveSlayerCoins: 'captureSlayerCoinsRemoved',
	AddCurrency: 'captureCurrencyAdded',
	RemoveCurrency: 'captureCurrencyRemoved',
	SkillXP: 'captureSkillXP',
	AbyssalXP: 'captureAbyssalXP',
	MasteryLevel: 'captureMasteryLevel',
	SummoningMark: 'captureSummoningMarks',
});

// Valid capture setting keys accepted from settings-change events.
const VALID_CAPTURE_SETTING_KEYS = new Set([
	'captureEnabled',
	'captureErrors',
	'captureSuccess',
	'captureInfo',
	'captureItemsAdded',
	'captureItemsRemoved',
	'captureGPAdded',
	'captureGPRemoved',
	'captureSlayerCoinsAdded',
	'captureSlayerCoinsRemoved',
	'captureCurrencyAdded',
	'captureCurrencyRemoved',
	'captureSkillXP',
	'captureAbyssalXP',
	'captureMasteryLevel',
	'captureSummoningMarks',
]);

/**
 * Manages notification capture from the game
 */
export class NotificationCapture {
	constructor(settings) {
		this.callback = null;
		this.captureCount = 0;
		this.settings = settings;
	}
	/**
	 * Update capture settings
	 */
	updateSettings(settings) {
		this.settings = { ...this.settings, ...settings };
		logger.debug('Capture settings updated:', this.settings);
	}
	/**
	 * Setup event listeners for settings changes
	 */
	setupSettingsListeners() {
		document.addEventListener(
			'activity-monitor-capture-setting-changed',
			(event) => {
				const { key, value } = event.detail;
				if (VALID_CAPTURE_SETTING_KEYS.has(key)) {
					this.updateSettings({ [key]: value });
					logger.debug(`Capture setting updated: ${key} = ${value}`);
				}
			},
		);
		logger.info('Capture settings listeners registered');
	}
	/**
	 * Register callback for when notifications are captured
	 */
	onCapture(callback) {
		this.callback = callback;
	}
	/**
	 * Set up game patches to intercept notifications
	 */
	setupPatches(ctx) {
		logger.info('Setting up notification capture patches...');
		// Get NotificationsManager class from game (game is a global variable)
		const NotificationsManager = game.notifications.constructor;
		// Patch error notifications
		ctx.patch(NotificationsManager, 'createErrorNotification').after(
			(result, customID, msg) => {
				if (this.shouldCapture('Error')) {
					this.captureNotification({
						type: 'Error',
						message: msg,
						customID,
					});
				}
			},
		);
		// Patch success notifications
		// Signature: createSuccessNotification(customID, msg, media, quantity = 1)
		ctx.patch(NotificationsManager, 'createSuccessNotification').after(
			(result, customID, msg, media, quantity = 1) => {
				if (this.shouldCapture('Success')) {
					this.captureNotification({
						type: 'Success',
						message: msg,
						media,
						customID,
						quantity,
					});
				}
			},
		);
		// Patch info notifications
		ctx.patch(NotificationsManager, 'createInfoNotification').after(
			(result, customID, msg, media) => {
				if (this.shouldCapture('Info')) {
					this.captureNotification({
						type: 'Info',
						message: msg,
						media,
						customID,
					});
				}
			},
		);
		// Patch item notifications
		// Signature: createItemNotification(item, quantity)
		// quantity > 0 = add, quantity < 0 = remove
		ctx.patch(NotificationsManager, 'createItemNotification').after(
			(result, item, quantity) => {
				const notifType = quantity > 0 ? 'AddItem' : 'RemoveItem';
				const settingKey =
					quantity > 0 ? 'captureItemsAdded' : 'captureItemsRemoved';
				if (this.shouldCapture(notifType, settingKey)) {
					this.captureNotification({
						type: notifType,
						message: `${quantity > 0 ? '+' : ''}${quantity} ${item.name}`,
						media: item.media,
						quantity: Math.abs(quantity),
						sourceObject: item,
						sourceType: 'item',
					});
				}
			},
		);
		// Patch currency notifications (GP, Slayer Coins, etc.)
		// Signature: createCurrencyNotification(currency, quantity)
		// quantity > 0 = add, quantity < 0 = remove
		ctx.patch(NotificationsManager, 'createCurrencyNotification').after(
			(result, currency, quantity) => {
				// Determine notification type based on currency and quantity sign
				let notifType;
				let settingKey;
				const isAdd = quantity > 0;
				if (currency.id === 'melvorD:GP') {
					notifType = isAdd ? 'AddGP' : 'RemoveGP';
					settingKey = isAdd ? 'captureGPAdded' : 'captureGPRemoved';
				} else if (currency.id === 'melvorD:SlayerCoins') {
					notifType = isAdd ? 'AddSlayerCoins' : 'RemoveSlayerCoins';
					settingKey =
						isAdd ?
							'captureSlayerCoinsAdded'
						:	'captureSlayerCoinsRemoved';
				} else {
					notifType = isAdd ? 'AddCurrency' : 'RemoveCurrency';
					settingKey =
						isAdd ?
							'captureCurrencyAdded'
						:	'captureCurrencyRemoved';
				}
				if (this.shouldCapture(notifType, settingKey)) {
					this.captureNotification({
						type: notifType,
						message: `${isAdd ? '+' : ''}${quantity} ${currency.name}`,
						media: currency.media,
						quantity: Math.abs(quantity),
						sourceObject: currency,
						sourceType: 'currency',
					});
				}
			},
		);
		// Patch GP notifications
		// Signature: createGPNotification(quantity)
		// quantity > 0 = add, quantity < 0 = remove
		ctx.patch(NotificationsManager, 'createGPNotification').after(
			(result, quantity) => {
				const notifType = quantity > 0 ? 'AddGP' : 'RemoveGP';
				const settingKey =
					quantity > 0 ? 'captureGPAdded' : 'captureGPRemoved';
				if (this.shouldCapture(notifType, settingKey)) {
					this.captureNotification({
						type: notifType,
						message: `${quantity > 0 ? '+' : ''}${quantity} GP`,
						media: 'assets/media/main/coins.png',
						quantity: Math.abs(quantity),
						sourceObject: 'coins.png',
						sourceType: 'static',
					});
				}
			},
		);
		// Patch Slayer Coins notifications
		// Signature: createSlayerCoinsNotification(quantity)
		// quantity > 0 = add, quantity < 0 = remove
		ctx.patch(NotificationsManager, 'createSlayerCoinsNotification').after(
			(result, quantity) => {
				const notifType =
					quantity > 0 ? 'AddSlayerCoins' : 'RemoveSlayerCoins';
				const settingKey =
					quantity > 0 ?
						'captureSlayerCoinsAdded'
					:	'captureSlayerCoinsRemoved';
				if (this.shouldCapture(notifType, settingKey)) {
					this.captureNotification({
						type: notifType,
						message: `${quantity > 0 ? '+' : ''}${quantity} Slayer Coins`,
						media: 'assets/media/main/slayer_coins.png',
						quantity: Math.abs(quantity),
						sourceObject: 'slayer_coins.png',
						sourceType: 'static',
					});
				}
			},
		);
		// Patch skill XP notifications
		ctx.patch(NotificationsManager, 'createSkillXPNotification').after(
			(result, skill, xp) => {
				if (this.shouldCapture('SkillXP')) {
					this.captureNotification({
						type: 'SkillXP',
						message: `+${xp.toFixed(3)} ${skill.name} XP`,
						media: skill.media,
						quantity: xp,
						sourceObject: skill,
						sourceType: 'skill',
					});
				}
			},
		);
		// Patch abyssal XP notifications
		ctx.patch(NotificationsManager, 'createAbyssalXPNotification').after(
			(result, skill, xp) => {
				if (this.shouldCapture('AbyssalXP')) {
					this.captureNotification({
						type: 'AbyssalXP',
						message: `+${xp.toFixed(3)} ${skill.name} Abyssal XP`,
						media: skill.media,
						quantity: xp,
						sourceObject: skill,
						sourceType: 'skill',
					});
				}
			},
		);
		// Patch mastery level notifications
		// Signature: createMasteryLevelNotification(action, level)
		ctx.patch(NotificationsManager, 'createMasteryLevelNotification').after(
			(result, action, level) => {
				if (this.shouldCapture('MasteryLevel')) {
					this.captureNotification({
						type: 'MasteryLevel',
						message: `${action.name} Mastery Level ${level}`,
						media: action.media,
						quantity: level,
						sourceObject: action,
						sourceType: 'mastery',
					});
				}
			},
		);
		// Patch summoning mark notifications
		// Signature: createSummoningMarkNotification(mark)
		ctx.patch(
			NotificationsManager,
			'createSummoningMarkNotification',
		).after((result, mark) => {
			if (this.shouldCapture('SummoningMark')) {
				this.captureNotification({
					type: 'SummoningMark',
					message: `Summoning Mark Discovered: ${game.summoning.getMarkName(mark)} (Level ${game.summoning.getMarkLevel(mark)})`,
					media: mark.markMedia,
					quantity: 1,
					sourceObject: mark,
					sourceType: 'mark',
				});
			}
		});
		logger.info(
			`Notification capture patches installed (${this.captureCount} total)`,
		);
	}
	/**
	 * Check if we should capture this notification type
	 */
	shouldCapture(type, settingKey) {
		// Master toggle
		if (!this.settings.captureEnabled) {
			return false;
		}
		// Use specific setting key if provided
		if (settingKey) {
			return this.settings[settingKey];
		}
		const key = NOTIFICATION_TYPE_TO_SETTING[type];
		return this.settings[key];
	}
	/**
	 * Generate media reference for storage
	 */
	generateMediaRef(source, sourceType) {
		if (!source) return undefined;
		if (sourceType === 'static') {
			// For static media paths like GP/Slayer Coins
			return `static:${source}`;
		}
		// For game objects with IDs
		if (source.id) {
			return `${sourceType}:${source.id}`;
		}
		return undefined;
	}
	/**
	 * Capture a notification
	 */
	captureNotification(data) {
		// Validate notification data before capturing
		if (!this.isValidNotification(data)) {
			logger.debug('Skipping invalid notification:', data);
			return;
		}
		// Generate media ref if source provided
		const mediaRef =
			data.sourceObject && data.sourceType ?
				this.generateMediaRef(data.sourceObject, data.sourceType)
			:	undefined;
		const notification = {
			id: this.generateId(),
			timestamp: Date.now(),
			type: data.type,
			message: data.message,
			media: data.media, // Keep for display, won't be saved to storage
			mediaRef, // This is what gets saved
			quantity: data.quantity,
			customID: data.customID,
		};
		this.captureCount++;
		if (this.callback) {
			this.callback(notification);
		}
		logger.debug(
			`Captured ${notification.type} notification:`,
			notification.message,
		);
	}
	/**
	 * Validate notification data before capturing
	 */
	isValidNotification(data) {
		// Must have type and message
		if (!data.type || !data.message) {
			return false;
		}
		// Message must not be empty or just whitespace
		if (data.message.trim().length === 0) {
			return false;
		}
		// Message must not contain "undefined" (indicates invalid data from game)
		if (data.message.includes('undefined')) {
			return false;
		}
		// Message must not contain "null"
		if (data.message.includes('null')) {
			return false;
		}
		// For item/currency notifications, quantity should be valid
		if (
			data.type &&
			(data.type.includes('Item') ||
				data.type.includes('GP') ||
				data.type.includes('Coins') ||
				data.type.includes('Currency') ||
				data.type.includes('XP'))
		) {
			// Quantity must be a valid number (note: quantities are always positive, sign is in message)
			if (
				data.quantity === undefined ||
				data.quantity === null ||
				isNaN(data.quantity)
			) {
				return false;
			}
		}
		return true;
	}
	/**
	 * Generate unique ID for notification (short format)
	 */
	generateId() {
		// Use base36 timestamp (shorter) + 4 random chars
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 6);
		return `${timestamp}-${random}`;
	}
	/**
	 * Get capture statistics
	 */
	getStats() {
		return {
			totalCaptured: this.captureCount,
		};
	}
}
//# sourceMappingURL=capture.js.map
