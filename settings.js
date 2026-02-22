/// <reference path="../types/melvor.d.ts" />
// Setting keys as constants for type safety
const SETTINGS_KEYS = {
	// UI
	SHOW_MINIBAR_ICON: 'showMinibarIcon',
	// Storage
	STORAGE_MODE: 'storageMode',
	CHARACTER_SAVE_TYPE: 'characterSaveType',
	CHARACTER_SAVE_PERCENTAGE: 'characterSavePercentage',
	CHARACTER_SAVE_LINE_COUNT: 'characterSaveLineCount',
	LOCAL_STORAGE_LINE_COUNT: 'localStorageLineCount',
	// Capture
	CAPTURE_ENABLED: 'captureEnabled',
	CAPTURE_ERRORS: 'captureErrors',
	CAPTURE_SUCCESS: 'captureSuccess',
	CAPTURE_INFO: 'captureInfo',
	CAPTURE_ITEMS_ADDED: 'captureItemsAdded',
	CAPTURE_ITEMS_REMOVED: 'captureItemsRemoved',
	CAPTURE_GP_ADDED: 'captureGPAdded',
	CAPTURE_GP_REMOVED: 'captureGPRemoved',
	CAPTURE_SLAYER_COINS_ADDED: 'captureSlayerCoinsAdded',
	CAPTURE_SLAYER_COINS_REMOVED: 'captureSlayerCoinsRemoved',
	CAPTURE_CURRENCY_ADDED: 'captureCurrencyAdded',
	CAPTURE_CURRENCY_REMOVED: 'captureCurrencyRemoved',
	CAPTURE_SKILL_XP: 'captureSkillXP',
	CAPTURE_ABYSSAL_XP: 'captureAbyssalXP',
	CAPTURE_MASTERY_LEVEL: 'captureMasteryLevel',
	CAPTURE_SUMMONING_MARKS: 'captureSummoningMarks',
	// Display
	GROUP_SIMILAR_TIME_WINDOW: 'groupSimilarTimeWindow',
	TIMESTAMP_FORMAT: 'timestampFormat',
};
// Module-level variables
let generalSection;
let storageSection;
let captureSection;
let displaySection;
// Map of setting key to its section for O(1) lookup
const settingToSection = new Map();
/**
 * Settings Manager
 */
export class SettingsManager {
	constructor(ctx) {
		this.ctx = ctx;
	}
	/**
	 * Initialize all settings with proper sections
	 */
	initializeSettings() {
		logger.info('Initializing Activity Monitor settings...');
		// Create sections for organization
		generalSection = this.ctx.settings.section('General');
		storageSection = this.ctx.settings.section('Storage & Limits');
		captureSection = this.ctx.settings.section('Notification Capture');
		displaySection = this.ctx.settings.section('Display Options');
		// Initialize each section
		this.initializeGeneralSettings();
		this.initializeStorageSettings();
		this.initializeCaptureSettings();
		this.initializeDisplaySettings();
		// Build setting-to-section map for O(1) lookups
		this.buildSettingMap();
		logger.info('Activity Monitor settings initialized');
	}
	/**
	 * Build a map of setting keys to their sections for O(1) lookup
	 */
	buildSettingMap() {
		// General settings
		settingToSection.set(SETTINGS_KEYS.SHOW_MINIBAR_ICON, generalSection);
		// Storage settings
		settingToSection.set(SETTINGS_KEYS.STORAGE_MODE, storageSection);
		settingToSection.set(SETTINGS_KEYS.CHARACTER_SAVE_TYPE, storageSection);
		settingToSection.set(
			SETTINGS_KEYS.CHARACTER_SAVE_PERCENTAGE,
			storageSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.CHARACTER_SAVE_LINE_COUNT,
			storageSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.LOCAL_STORAGE_LINE_COUNT,
			storageSection,
		);
		// Capture settings
		settingToSection.set(SETTINGS_KEYS.CAPTURE_ENABLED, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_ERRORS, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_SUCCESS, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_INFO, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_ITEMS_ADDED, captureSection);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_ITEMS_REMOVED,
			captureSection,
		);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_GP_ADDED, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_GP_REMOVED, captureSection);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_SLAYER_COINS_ADDED,
			captureSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_SLAYER_COINS_REMOVED,
			captureSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_CURRENCY_ADDED,
			captureSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_CURRENCY_REMOVED,
			captureSection,
		);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_SKILL_XP, captureSection);
		settingToSection.set(SETTINGS_KEYS.CAPTURE_ABYSSAL_XP, captureSection);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_MASTERY_LEVEL,
			captureSection,
		);
		settingToSection.set(
			SETTINGS_KEYS.CAPTURE_SUMMONING_MARKS,
			captureSection,
		);
		// Display settings
		settingToSection.set(
			SETTINGS_KEYS.GROUP_SIMILAR_TIME_WINDOW,
			displaySection,
		);
		settingToSection.set(SETTINGS_KEYS.TIMESTAMP_FORMAT, displaySection);
	}
	/**
	 * Initialize general UI settings
	 */
	initializeGeneralSettings() {
		generalSection.add({
			type: 'switch',
			name: SETTINGS_KEYS.SHOW_MINIBAR_ICON,
			label: 'Show Minibar Icon',
			hint: 'Display an icon in the minibar for quick access (requires page reload)',
			default: true,
			onChange: (value) => {
				logger.debug(`Show Minibar Icon changed to: ${value}`);
			},
		});
	}
	/**
	 * Initialize storage settings - each as custom rendered with conditional visibility
	 */
	initializeStorageSettings() {
		// Storage Mode - always visible
		storageSection.add({
			type: 'dropdown',
			name: SETTINGS_KEYS.STORAGE_MODE,
			label: 'Storage Mode',
			hint: 'Where to store notification history',
			default: 'local-storage',
			options: [
				{ value: 'local-storage', display: 'Browser Local Storage' },
				{
					value: 'character-save',
					display: 'Character Save (Cloud Sync, 8KB limit)',
				},
				{
					value: 'memory-only',
					display: 'Memory Only (Lost on reload)',
				},
			],
			onChange: (value) => {
				logger.debug(`Storage mode changed to: ${value}`);
				// Trigger visibility update via custom event
				document.dispatchEvent(
					new CustomEvent('activity-monitor-storage-mode-changed', {
						detail: { mode: value },
					}),
				);
			},
		});
		// Add to map immediately so getSetting() works for subsequent settings
		settingToSection.set(SETTINGS_KEYS.STORAGE_MODE, storageSection);
		// Character Save Type - only visible when storageMode === 'character-save'
		this.addConditionalStorageSetting(
			SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
			'Character Save Type',
			'How to manage the 8KB character save limit',
			'dropdown',
			'percentage',
			[
				{ value: 'percentage', display: 'Percentage-based (default)' },
				{ value: 'line-count', display: 'Line count limit' },
			],
			(storageMode, characterSaveType) =>
				storageMode === 'character-save',
		);
		// Character Save Percentage - only visible when characterSaveType === 'percentage'
		this.addConditionalStorageSetting(
			SETTINGS_KEYS.CHARACTER_SAVE_PERCENTAGE,
			'Character Save Percentage',
			'Max percentage of 8KB to use',
			'number',
			20,
			{ min: 10, max: 100 },
			(storageMode, characterSaveType) =>
				storageMode === 'character-save' &&
				characterSaveType === 'percentage',
		);
		// Character Save Line Count - only visible when characterSaveType === 'line-count'
		this.addConditionalStorageSetting(
			SETTINGS_KEYS.CHARACTER_SAVE_LINE_COUNT,
			'Character Save Line Count',
			'Maximum number of notification lines to store',
			'dropdown',
			50,
			[
				{ value: 10, display: '10 lines' },
				{ value: 25, display: '25 lines' },
				{ value: 50, display: '50 lines' },
				{ value: 100, display: '100 lines' },
			],
			(storageMode, characterSaveType) =>
				storageMode === 'character-save' &&
				characterSaveType === 'line-count',
		);
		// Local Storage Line Count - only visible when storageMode === 'local-storage'
		this.addConditionalStorageSetting(
			SETTINGS_KEYS.LOCAL_STORAGE_LINE_COUNT,
			'Local Storage Line Count',
			'Maximum number of notification lines to store, large values may slow down your game',
			'dropdown',
			500,
			[
				{ value: 100, display: '100 lines' },
				{ value: 250, display: '250 lines' },
				{ value: 500, display: '500 lines' },
				{ value: 1000, display: '1000 lines' },
				{ value: 2000, display: '2000 lines' },
				{ value: 5000, display: '5000 lines' },
				{ value: 10000, display: '10000 lines' },
			],
			(storageMode, characterSaveType) => storageMode === 'local-storage',
		);
	}
	/**
	 * Add a conditional storage setting with custom rendering for visibility control
	 */
	addConditionalStorageSetting(
		key,
		label,
		hint,
		type,
		defaultValue,
		optionsOrConfig,
		shouldShow,
	) {
		storageSection.add({
			type: 'custom',
			name: key,
			label: label,
			hint: hint,
			default: defaultValue,
			render: (name, onChange, config) => {
				const container = document.createElement('div');
				container.className = 'mb-4';
				// Create label
				const labelEl = document.createElement('label');
				labelEl.className = 'form-label';
				labelEl.textContent = label;
				container.appendChild(labelEl);
				// Create input based on type
				let input;
				if (type === 'dropdown') {
					const select = document.createElement('select');
					select.className = 'form-control';
					// Add options
					const options = optionsOrConfig;
					options.forEach((opt) => {
						const option = document.createElement('option');
						option.value = String(opt.value);
						option.textContent = opt.display;
						select.appendChild(option);
					});
					// Set current value - use section.get() directly to avoid circular lookup
					const section = settingToSection.get(key);
					const currentValue =
						section ? section.get(key) : defaultValue;
					select.value = String(currentValue ?? defaultValue);
					// Handle change
					select.addEventListener('change', () => {
						const newValue =
							isNaN(Number(select.value)) ?
								select.value
							:	Number(select.value);
						onChange(newValue);
						// Trigger visibility update event
						document.dispatchEvent(
							new CustomEvent(
								'activity-monitor-storage-setting-changed',
								{
									detail: { key, value: newValue },
								},
							),
						);
					});
					input = select;
				} else {
					// number input
					const numberInput = document.createElement('input');
					numberInput.type = 'number';
					numberInput.className = 'form-control';
					numberInput.min = String(optionsOrConfig.min || 0);
					numberInput.max = String(optionsOrConfig.max || 100);
					// Set current value - use section.get() directly to avoid circular lookup
					const section = settingToSection.get(key);
					const currentValue =
						section ? section.get(key) : defaultValue;
					numberInput.value = String(currentValue ?? defaultValue);
					// Handle change
					numberInput.addEventListener('input', () => {
						const newValue = Number(numberInput.value);
						onChange(newValue);
					});
					input = numberInput;
				}
				container.appendChild(input);
				// Add hint if provided
				if (hint) {
					const hintEl = document.createElement('div');
					hintEl.className = 'form-text';
					hintEl.textContent = hint;
					container.appendChild(hintEl);
				}

				// Set initial visibility
				const storageModeSection = settingToSection.get(
					SETTINGS_KEYS.STORAGE_MODE,
				);
				const characterSaveTypeSection = settingToSection.get(
					SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
				);
				const initialStorageMode =
					storageModeSection ?
						storageModeSection.get(SETTINGS_KEYS.STORAGE_MODE)
					:	'local-storage';
				const initialCharacterSaveType =
					characterSaveTypeSection ?
						characterSaveTypeSection.get(
							SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
						)
					:	'percentage';
				container.style.display =
					shouldShow(initialStorageMode, initialCharacterSaveType) ?
						''
					:	'none';
				// Listen for visibility change events
				const handleVisibilityUpdate = (event) => {
					const customEvent = event;
					// Extract values from event or fetch from settings
					let storageMode;
					let characterSaveType;
					if (
						customEvent.type ===
						'activity-monitor-storage-mode-changed'
					) {
						// Storage mode changed - use event value for mode, fetch type
						storageMode = customEvent.detail.mode;
						characterSaveType = this.getSetting(
							SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
						);
					} else {
						// Storage setting changed - fetch mode, check if event is for type
						storageMode = this.getSetting(
							SETTINGS_KEYS.STORAGE_MODE,
						);
						if (
							customEvent.detail.key ===
							SETTINGS_KEYS.CHARACTER_SAVE_TYPE
						) {
							characterSaveType = customEvent.detail.value;
						} else {
							characterSaveType = this.getSetting(
								SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
							);
						}
					}
					// Let shouldShow callback determine visibility with the extracted values
					const visible = shouldShow(storageMode, characterSaveType);
					container.style.display = visible ? '' : 'none';
				};
				document.addEventListener(
					'activity-monitor-storage-mode-changed',
					handleVisibilityUpdate,
				);
				document.addEventListener(
					'activity-monitor-storage-setting-changed',
					handleVisibilityUpdate,
				);
				return container;
			},
			get: (root) => {
				if (type === 'dropdown') {
					const select = root.querySelector('select');
					if (select) {
						const value = select.value;
						return isNaN(Number(value)) ? value : Number(value);
					}
				} else {
					const input = root.querySelector('input[type="number"]');
					if (input) {
						return Number(input.value);
					}
				}
				return defaultValue;
			},
			set: (root, value) => {
				if (type === 'dropdown') {
					const select = root.querySelector('select');
					if (select) {
						select.value = String(value);
					}
				} else {
					const input = root.querySelector('input[type="number"]');
					if (input) {
						input.value = String(value);
					}
				}
			},
		});
		// Add to map immediately so this setting's value is available for subsequent settings
		settingToSection.set(key, storageSection);
	}
	/**
	 * Initialize capture settings
	 */
	initializeCaptureSettings() {
		// Master toggle
		captureSection.add({
			type: 'switch',
			name: SETTINGS_KEYS.CAPTURE_ENABLED,
			label: 'Enable Notification Capture',
			hint: 'Master toggle - disables all capture when off',
			default: true,
			onChange: (value) => {
				logger.info(`Capture enabled changed to: ${value}`);
				document.dispatchEvent(
					new CustomEvent(
						'activity-monitor-capture-setting-changed',
						{
							detail: {
								key: SETTINGS_KEYS.CAPTURE_ENABLED,
								value,
							},
						},
					),
				);
			},
		});
		// General notification types
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_ERRORS,
			'Error Notifications',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_SUCCESS,
			'Success Notifications',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_INFO,
			'Info Notifications',
			true,
		);
		// Item notifications
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_ITEMS_ADDED,
			'Items Added',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_ITEMS_REMOVED,
			'Items Removed',
			true,
		);
		// GP notifications
		this.addCaptureToggle(SETTINGS_KEYS.CAPTURE_GP_ADDED, 'GP Added', true);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_GP_REMOVED,
			'GP Removed',
			true,
		);
		// Slayer Coins
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_SLAYER_COINS_ADDED,
			'Slayer Coins Added',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_SLAYER_COINS_REMOVED,
			'Slayer Coins Removed',
			true,
		);
		// Generic currency
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_CURRENCY_ADDED,
			'Currency Added',
			true,
			'Raid Coins, etc.',
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_CURRENCY_REMOVED,
			'Currency Removed',
			true,
		);
		// XP and progression
		this.addCaptureToggle(SETTINGS_KEYS.CAPTURE_SKILL_XP, 'Skill XP', true);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_ABYSSAL_XP,
			'Abyssal XP',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_MASTERY_LEVEL,
			'Mastery Level Ups',
			true,
		);
		this.addCaptureToggle(
			SETTINGS_KEYS.CAPTURE_SUMMONING_MARKS,
			'Summoning Marks',
			true,
		);
	}
	/**
	 * Helper to add a capture toggle setting
	 */
	addCaptureToggle(key, label, defaultValue, hint) {
		captureSection.add({
			type: 'switch',
			name: key,
			label: label,
			hint: hint,
			default: defaultValue,
			onChange: (value) => {
				logger.debug(`${label} changed to: ${value}`);
				document.dispatchEvent(
					new CustomEvent(
						'activity-monitor-capture-setting-changed',
						{
							detail: { key, value },
						},
					),
				);
			},
		});
	}
	/**
	 * Initialize display settings
	 */
	initializeDisplaySettings() {
		displaySection.add({
			type: 'dropdown',
			name: SETTINGS_KEYS.GROUP_SIMILAR_TIME_WINDOW,
			label: 'Notification Grouping Time Window',
			hint: 'Group similar notifications that occur within this time window',
			default: 60,
			options: [
				{ value: 'never', display: 'Never' },
				{ value: 10, display: '10 seconds' },
				{ value: 30, display: '30 seconds' },
				{ value: 60, display: '1 minute' },
				{ value: 120, display: '2 minutes' },
				{ value: 300, display: '5 minutes' },
				{ value: 'always', display: 'Always' },
			],
			onChange: (value) => {
				logger.debug(
					`Notification grouping time window changed to: ${value} seconds`,
				);
				document.dispatchEvent(
					new CustomEvent(
						'activity-monitor-display-setting-changed',
						{
							detail: {
								key: SETTINGS_KEYS.GROUP_SIMILAR_TIME_WINDOW,
								value,
							},
						},
					),
				);
			},
		});
		displaySection.add({
			type: 'dropdown',
			name: SETTINGS_KEYS.TIMESTAMP_FORMAT,
			label: 'Timestamp Format',
			hint: 'How to display notification timestamps',
			default: 'relative',
			options: [
				{ value: 'relative', display: 'Relative (5 minutes ago)' },
				{ value: 'absolute', display: 'Absolute (2:30 PM)' },
			],
			onChange: (value) => {
				logger.debug(`Timestamp format changed to: ${value}`);
				document.dispatchEvent(
					new CustomEvent(
						'activity-monitor-display-setting-changed',
						{
							detail: {
								key: SETTINGS_KEYS.TIMESTAMP_FORMAT,
								value,
							},
						},
					),
				);
			},
		});
	}
	/**
	 * Get a setting value using direct O(1) map lookup
	 */
	getSetting(key) {
		const section = settingToSection.get(key);
		if (section) {
			const value = section.get(key);
			if (value !== undefined) {
				return value;
			}
		}
		// Fallback: log warning and return undefined
		logger.warn(`Setting key not found: ${key}`);
		return undefined;
	}
	/**
	 * Set a setting value using direct O(1) map lookup
	 */
	setSetting(key, value) {
		const section = settingToSection.get(key);
		if (section) {
			section.set(key, value);
		} else {
			logger.warn(`Cannot set setting - key not found: ${key}`);
		}
	}
	/**
	 * Get all settings as an object
	 */
	getAllSettings() {
		return {
			// UI
			showMinibarIcon: this.getSetting(SETTINGS_KEYS.SHOW_MINIBAR_ICON),
			// Storage
			storageMode: this.getSetting(SETTINGS_KEYS.STORAGE_MODE),
			characterSaveType: this.getSetting(
				SETTINGS_KEYS.CHARACTER_SAVE_TYPE,
			),
			characterSavePercentage: this.getSetting(
				SETTINGS_KEYS.CHARACTER_SAVE_PERCENTAGE,
			),
			characterSaveLineCount: this.getSetting(
				SETTINGS_KEYS.CHARACTER_SAVE_LINE_COUNT,
			),
			localStorageLineCount: this.getSetting(
				SETTINGS_KEYS.LOCAL_STORAGE_LINE_COUNT,
			),
			// Capture
			captureEnabled: this.getSetting(SETTINGS_KEYS.CAPTURE_ENABLED),
			captureErrors: this.getSetting(SETTINGS_KEYS.CAPTURE_ERRORS),
			captureSuccess: this.getSetting(SETTINGS_KEYS.CAPTURE_SUCCESS),
			captureInfo: this.getSetting(SETTINGS_KEYS.CAPTURE_INFO),
			captureItemsAdded: this.getSetting(
				SETTINGS_KEYS.CAPTURE_ITEMS_ADDED,
			),
			captureItemsRemoved: this.getSetting(
				SETTINGS_KEYS.CAPTURE_ITEMS_REMOVED,
			),
			captureGPAdded: this.getSetting(SETTINGS_KEYS.CAPTURE_GP_ADDED),
			captureGPRemoved: this.getSetting(SETTINGS_KEYS.CAPTURE_GP_REMOVED),
			captureSlayerCoinsAdded: this.getSetting(
				SETTINGS_KEYS.CAPTURE_SLAYER_COINS_ADDED,
			),
			captureSlayerCoinsRemoved: this.getSetting(
				SETTINGS_KEYS.CAPTURE_SLAYER_COINS_REMOVED,
			),
			captureCurrencyAdded: this.getSetting(
				SETTINGS_KEYS.CAPTURE_CURRENCY_ADDED,
			),
			captureCurrencyRemoved: this.getSetting(
				SETTINGS_KEYS.CAPTURE_CURRENCY_REMOVED,
			),
			captureSkillXP: this.getSetting(SETTINGS_KEYS.CAPTURE_SKILL_XP),
			captureAbyssalXP: this.getSetting(SETTINGS_KEYS.CAPTURE_ABYSSAL_XP),
			captureMasteryLevel: this.getSetting(
				SETTINGS_KEYS.CAPTURE_MASTERY_LEVEL,
			),
			captureSummoningMarks: this.getSetting(
				SETTINGS_KEYS.CAPTURE_SUMMONING_MARKS,
			),
			// Display
			groupSimilarTimeWindow: this.getSetting(
				SETTINGS_KEYS.GROUP_SIMILAR_TIME_WINDOW,
			),
			timestampFormat: this.getSetting(SETTINGS_KEYS.TIMESTAMP_FORMAT),
		};
	}
}
/**
 * Initialize settings system
 */
export function initializeSettings(ctx) {
	const manager = new SettingsManager(ctx);
	manager.initializeSettings();
	return manager;
}
//# sourceMappingURL=settings.js.map
