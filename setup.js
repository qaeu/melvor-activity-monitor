/// <reference path="../types/melvor.d.ts" />
/**
 * Activity Monitor - Main entry point
 * Monitors and tracks player activity in Melvor Idle
 */
/**
 * Load Haunted libraries from local files using ctx.loadModule
 * Loads lit-html first (dependency), then haunted
 */
async function loadHauntedLibraries(ctx, logger) {
	logger.info('Loading Haunted libraries...');
	try {
		// Check if already loaded
		if (window.litHtml && window.haunted) {
			logger.info('Haunted libraries already loaded');
			return true;
		}
		// Load lit-html first (Haunted dependency) using loadModule
		if (!window.litHtml) {
			logger.info('Loading lit-html...');
			const litHtmlModule = await ctx.loadModule('libs/lit-html.min.js');
			// Expose to global scope for Haunted to use
			window.litHtml = litHtmlModule;
		}
		// Load haunted using loadModule
		if (!window.haunted) {
			logger.info('Loading haunted...');
			const hauntedModule = await ctx.loadModule('libs/haunted.min.js');
			// Expose to global scope
			window.haunted = hauntedModule;
		}
		// Verify both libraries loaded successfully
		if (window.litHtml && window.haunted) {
			logger.info('Haunted libraries loaded successfully');
			return true;
		} else {
			logger.error(
				'Failed to load Haunted libraries - missing global objects',
			);
			return false;
		}
	} catch (error) {
		logger.error('Error loading Haunted libraries:', error);
		return false;
	}
}
export async function setup(ctx) {
	// Load config and logger first
	const configModule = await ctx.loadModule('config.js');
	const loggerModule = await ctx.loadModule('logger.js');
	const config = configModule.config;
	const logger = loggerModule.logger;
	// Set config on logger so debug() respects config.debug
	logger.setConfig(config);
	// Expose logger globally for other modules to use
	globalThis.logger = logger;
	logger.info('Activity Monitor loading...');
	logger.info(`Version: ${ctx.version}`);
	logger.info(`Debug mode: ${config.debug}`);
	// Load modules
	const compressionModule = await ctx.loadModule('compression.js');
	const settingsModule = await ctx.loadModule('settings.js');
	const captureModule = await ctx.loadModule('capture.js');
	const storageModule = await ctx.loadModule('storage.js');
	const uiModule = await ctx.loadModule('ui/index.js');
	// Expose CompressionUtil globally for storage module
	globalThis.CompressionUtil = compressionModule.CompressionUtil;
	logger.info('Core modules loaded');
	// Initialize settings system
	const settingsManager = settingsModule.initializeSettings(ctx);
	logger.info('Settings system initialized');
	// Get settings for initialization
	const allSettings = settingsManager.getAllSettings();
	const captureSettings = {
		captureEnabled: allSettings.captureEnabled,
		captureErrors: allSettings.captureErrors,
		captureSuccess: allSettings.captureSuccess,
		captureInfo: allSettings.captureInfo,
		captureItemsAdded: allSettings.captureItemsAdded,
		captureItemsRemoved: allSettings.captureItemsRemoved,
		captureGPAdded: allSettings.captureGPAdded,
		captureGPRemoved: allSettings.captureGPRemoved,
		captureSlayerCoinsAdded: allSettings.captureSlayerCoinsAdded,
		captureSlayerCoinsRemoved: allSettings.captureSlayerCoinsRemoved,
		captureCurrencyAdded: allSettings.captureCurrencyAdded,
		captureCurrencyRemoved: allSettings.captureCurrencyRemoved,
		captureSkillXP: allSettings.captureSkillXP,
		captureAbyssalXP: allSettings.captureAbyssalXP,
		captureMasteryLevel: allSettings.captureMasteryLevel,
		captureSummoningMarks: allSettings.captureSummoningMarks,
	};
	// Create instances
	const capture = new captureModule.NotificationCapture(captureSettings);
	const storage = new storageModule.StorageManager(ctx);
	logger.info('Module instances created');
	// Setup settings listeners for real-time updates
	capture.setupSettingsListeners();
	storage.setupSettingsListeners();
	logger.info('Settings listeners registered');
	// Wire up capture -> storage
	capture.onCapture((notification) => {
		storage.addNotification(notification);
		logger.debug('Notification added to storage:', notification.type);
	});
	logger.info('Capture callback registered');
	// Load saved notifications when character loads
	ctx.onCharacterLoaded(async () => {
		try {
			// Invalidate settings cache to ensure we read fresh values after character load
			storage._invalidateSettingsCache();

			await storage.load();
			const stats = await storage.getStats();
			logger.info(
				`Loaded notifications - Count: ${stats.count}, Unread: ${stats.unreadCount}`,
			);
			logger.info(
				`Storage stats - Compressed: ${(stats.compressedSize / 1024).toFixed(2)}KB, Ratio: ${stats.compressionRatio.toFixed(1)}%`,
			);
			logger.info(`Estimated max count: ${stats.estimatedMaxCount}`);
			// Notify the panel so it refreshes with the loaded notifications.
			// The panel is created by onInterfaceReady (which fires before
			// onCharacterLoaded), so its initial render reads empty storage.
			// Without this dispatch it would stay blank until the first
			// in-session notification event arrives.
			document.dispatchEvent(
				new CustomEvent('activity-monitor-refresh-panel'),
			);
		} catch (error) {
			logger.error('Failed to load notifications:', error);
		}
	});
	logger.info('Character load handler registered');
	// Set up notification capture patches immediately (game classes are available)
	try {
		capture.setupPatches(ctx);
		logger.info('Notification capture patches installed');
		// Test notification to verify it's working (after interface is ready)
		if (config.debug) {
			ctx.onInterfaceReady(() => {
				setTimeout(() => {
					logger.info('Triggering test notification...');
					globalThis.game.notifications.createSuccessNotification(
						'Activity Monitor is now capturing notifications!',
					);
				}, 2000);
			});
		}
	} catch (error) {
		logger.error('Failed to setup patches:', error);
	}
	// Expose global API BEFORE initializing UI (UI needs access to storage/settings)
	globalThis.ActivityMonitorMod = {
		capture,
		storage,
		settings: settingsManager,
		ui: uiModule,
		getStats: async () => await storage.getStats(),
		getNotifications: () => storage.getNotifications(),
		clearAll: () => storage.clearAll(),
		version: ctx.version,
	};
	logger.info('Global API exposed');
	// Load Haunted libraries FIRST (required for UI components)
	const hauntedAvailable = await loadHauntedLibraries(ctx, logger);
	if (!hauntedAvailable) {
		logger.error(
			'Haunted is required for this mod. Please ensure Haunted libraries are available.',
		);
		return; // Cannot continue without Haunted
	}
	// Load UI components AFTER Haunted (so custom elements are registered)
	try {
		await ctx.loadModule('ui/components/NotificationPanel.js');
		await ctx.loadModule('ui/components/NotificationCard.js');
		logger.info('UI components loaded');
	} catch (error) {
		logger.error('Failed to load UI components:', error);
	}
	// Initialize UI system AFTER components are loaded
	try {
		await uiModule.initializeUI(ctx);
		logger.info('UI system initialized');
	} catch (error) {
		logger.error('Failed to initialize UI:', error);
	}
	logger.info('Activity Monitor initialized successfully');
	logger.info(
		'Global API: ActivityMonitorMod.getStats(), ActivityMonitorMod.getNotifications()',
	);
}
//# sourceMappingURL=setup.js.map
