/// <reference path="../../types/melvor.d.ts" />
let uiState = {
	panelVisible: false,
};
/**
 * Initialize UI system
 */
export async function initializeUI(ctx) {
	logger.info('Initializing Activity Monitor UI...');
	// Load CSS styles first
	try {
		await ctx.loadStylesheet('ui/styles.css');
		logger.info('CSS styles loaded');
	} catch (error) {
		logger.error('Failed to load CSS:', error);
	}
	// Load StorageSettings component
	try {
		await ctx.loadModule('ui/components/StorageSettings.js');
		logger.info('StorageSettings component loaded');
	} catch (error) {
		logger.error('Failed to load StorageSettings component:', error);
	}
	// Patch minibar to add icon
	patchMinibar(ctx);
	// Add proper sidebar integration
	addSidebarIntegration(ctx);
	// Create notification panel (initially hidden)
	ctx.onInterfaceReady(() => {
		try {
			createNotificationPanel();
			logger.info('Notification panel created');
			// Listen for notification updates to update unread count
			setupNotificationListeners();
			logger.info('Notification listeners registered');
		} catch (error) {
			logger.error('Failed to initialize UI:', error);
		}
	});
}
/**
 * Patch the minibar to add Activity Monitor icon
 */
function patchMinibar(ctx) {
	ctx.patch(Minibar, 'initialize').replace(function (originalFunction) {
		const result = originalFunction.call(this);
		const iconUrl = ctx.getResourceUrl('assets/icon.png');
		const minibarItem = game.minibar.createMinibarItem(
			'minibar-ActivityMonitor',
			iconUrl,
			'Activity Monitor - Click to toggle panel',
			{
				onClick: () => {
					togglePanel();
				},
			},
		);
		game.minibar.minibarElement.prepend(minibarItem.element);
		logger.info('Minibar icon added');
		return result;
	});
}
/**
 * Add Activity Monitor entry to sidebar Modding category
 */
function addSidebarIntegration(ctx) {
	ctx.onInterfaceReady(() => {
		if (sidebar) {
			// Get the existing Modding category
			const modsCategory = sidebar.category('Modding');
			// Add sidebar item
			modsCategory.item('notifications', {
				name: 'Activity Monitor',
				icon: ctx.getResourceUrl('assets/icon.png'),
				onClick: () => {
					togglePanel();
				},
			});
			logger.info('Sidebar integration added');
		}
	});
}
/**
 * Create notification panel (initially hidden)
 */
function createNotificationPanel() {
	const panel = document.createElement('activity-monitor-panel');
	panel.id = 'activity-monitor-panel';
	panel.style.display = 'none';
	document.body.appendChild(panel);
}
/**
 * Toggle panel visibility
 */
export function togglePanel() {
	const panel = document.getElementById('activity-monitor-panel');
	if (!panel) return;
	uiState.panelVisible = !uiState.panelVisible;
	panel.style.display = uiState.panelVisible ? 'block' : 'none';
	logger.debug(`Panel ${uiState.panelVisible ? 'opened' : 'closed'}`);
}
/**
 * Close panel
 */
export function closePanel() {
	const panel = document.getElementById('activity-monitor-panel');
	if (!panel) return;
	uiState.panelVisible = false;
	panel.style.display = 'none';
	logger.debug('Panel closed');
}
/**
 * Setup notification listeners
 */
function setupNotificationListeners() {
	// Listen for new notifications to refresh panel if open
	document.addEventListener(
		'activity-monitor-notification-added',
		(event) => {
			// Dispatch event to update panel if it's open
			if (uiState.panelVisible) {
				document.dispatchEvent(
					new CustomEvent('activity-monitor-refresh-panel'),
				);
			}
		},
	);
}
/**
 * Get current UI state
 */
export function getUIState() {
	return { ...uiState };
}
//# sourceMappingURL=index.js.map
