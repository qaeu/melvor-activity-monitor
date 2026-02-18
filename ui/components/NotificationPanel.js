'use strict';
/// <reference path="../../../types/melvor.d.ts" />
/// <reference path="../globals.d.ts" />
function NotificationPanel() {
	const [notifications, setNotifications] = useState([]);
	const [filter, setFilter] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [notificationTypes, setNotificationTypes] = useState([]);
	// Load initial notifications
	useEffect(() => {
		const storage = globalThis.ActivityMonitorMod?.storage;
		if (storage) {
			const allNotifications = storage.getNotifications();
			setNotifications(allNotifications);
		}
	}, []);
	// Listen for notification events (added, updated, refresh)
	useEffect(() => {
		const refreshNotifications = () => {
			const storage = globalThis.ActivityMonitorMod?.storage;
			if (storage) {
				const allNotifications = storage.getNotifications();
				setNotifications(allNotifications);
			}
		};
		// Listen for all notification events
		document.addEventListener(
			'activity-monitor-notification-added',
			refreshNotifications,
		);
		document.addEventListener(
			'activity-monitor-notification-updated',
			refreshNotifications,
		);
		document.addEventListener(
			'activity-monitor-refresh-panel',
			refreshNotifications,
		);
		return () => {
			document.removeEventListener(
				'activity-monitor-notification-added',
				refreshNotifications,
			);
			document.removeEventListener(
				'activity-monitor-notification-updated',
				refreshNotifications,
			);
			document.removeEventListener(
				'activity-monitor-refresh-panel',
				refreshNotifications,
			);
		};
	}, []);
	// Handle ESC key to close modal
	useEffect(() => {
		const handleEsc = (e) => {
			if (e.key === 'Escape') {
				handleClose();
			}
		};
		document.addEventListener('keydown', handleEsc);
		return () => document.removeEventListener('keydown', handleEsc);
	}, []);
	// Update notification types only when they actually change
	useEffect(() => {
		const newTypes = Array.from(
			new Set(notifications.map((n) => n.type)),
		).sort();
		const typesChanged =
			newTypes.length !== notificationTypes.length ||
			newTypes.some((type, i) => type !== notificationTypes[i]);
		if (typesChanged) {
			setNotificationTypes(newTypes);
		}
	}, [notifications]);
	// Filter notifications (grouping now happens at storage time)
	const filteredNotifications = notifications.filter((n) => {
		// Filter by type
		if (filter !== 'all' && n.type !== filter) return false;
		// Filter by search term
		if (
			searchTerm &&
			!n.message.toLowerCase().includes(searchTerm.toLowerCase())
		) {
			return false;
		}
		return true;
	});
	// Handle close
	const handleClose = () => {
		const ui = globalThis.ActivityMonitorMod?.ui;
		if (ui) {
			ui.closePanel();
		}
	};
	// Handle click on overlay (outside modal content)
	const handleOverlayClick = (e) => {
		// Only close if clicking directly on the overlay (not on content)
		if (e.target === e.currentTarget) {
			handleClose();
		}
	};
	// Handle clear all
	const handleClearAll = () => {
		const storage = globalThis.ActivityMonitorMod?.storage;
		if (storage) {
			if (confirm('Are you sure you want to clear all notifications?')) {
				storage.clearAll();
				setNotifications([]);
			}
		}
	};
	// Generate header title with counts
	const headerTitle =
		notifications.length === filteredNotifications.length ?
			`Activity Monitor (${notifications.length})`
		:	`Activity Monitor (${filteredNotifications.length}/${notifications.length})`;
	return html`
		<div
			class="activity-monitor-panel-overlay"
			@click=${handleOverlayClick}
		>
			<div class="activity-monitor-panel-content">
				<!-- Header -->
				<div class="activity-monitor-header">
					<h3>${headerTitle}</h3>
					<div class="activity-monitor-header-actions">
						<button
							class="btn btn-sm btn-danger"
							@click=${handleClearAll}
							title="Clear all notifications"
						>
							<i class="fa fa-trash"></i>
						</button>
						<button
							class="btn btn-sm btn-secondary"
							@click=${handleClose}
							title="Close panel"
						>
							<i class="fa fa-times"></i>
						</button>
					</div>
				</div>

				<!-- Filters -->
				<div class="activity-monitor-filters">
					<div class="filter-group">
						<label>Type:</label>
						<select
							class="form-control form-control-sm"
							.value=${filter}
							@change=${(e) => setFilter(e.target.value)}
						>
							<option value="all">All Types</option>
							${notificationTypes.map(
								(type) => html`
									<option value=${type}>${type}</option>
								`,
							)}
						</select>
					</div>

					<div class="filter-group">
						<label>Search:</label>
						<input
							type="text"
							class="form-control form-control-sm"
							placeholder="Search notifications..."
							.value=${searchTerm}
							@input=${(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				<!-- Notification List -->
				<div class="activity-monitor-list">
					${filteredNotifications.length === 0 ?
						html`
							<div class="activity-monitor-empty">
								<i class="fa fa-inbox"></i>
								<p>No notifications to display</p>
							</div>
						`
					:	filteredNotifications.map((notification) => {
							const key = notification.id;
							return html`
								<activity-monitor-card
									key=${key}
									.notification=${notification}
								></activity-monitor-card>
							`;
						})}
				</div>
			</div>
		</div>
	`;
}
// Define custom element (disable shadow DOM to allow global CSS)
customElements.define(
	'activity-monitor-panel',
	component(NotificationPanel, { useShadowDOM: false }),
);
//# sourceMappingURL=NotificationPanel.js.map
