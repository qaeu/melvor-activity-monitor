'use strict';
/// <reference path="../../../types/melvor.d.ts" />
/// <reference path="../globals.d.ts" />
const getTimestampAge = (timestamp) => {
	const diff = Date.now() - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	return { seconds, minutes, hours, days };
};
// Returns how many 1-second ticks must pass before this timestamp's
// display string can possibly change. Used to skip redundant updates.
const getTimestampUpdateCycle = (timestamp) => {
	const { minutes, hours, days } = getTimestampAge(timestamp);
	if (minutes < 1) return 1;
	if (hours < 1) return 60;
	if (days < 1) return 3600;
	return 86400;
};
// Notifications are sorted newest-first so update cycles are non-decreasing.
// The cycle values (1, 60, 3600, 86400) form a divisibility chain, so once
// an item is not due, all subsequent (older) items are also not due.
// Returns the number of leading items that are due for a refresh this tick.
const countDueItems = (items, cycleCount) => {
	let count = 0;
	while (
		count < items.length &&
		cycleCount % getTimestampUpdateCycle(items[count].timestamp) === 0
	) {
		count++;
	}
	return count;
};
// Refreshes the timestampStr on the first `count` items.
// Returns { next, changed } where changed is true if any string actually changed.
const refreshDueItems = (items, count) => {
	let changed = false;
	const next = [];
	for (let i = 0; i < count; i++) {
		const newStr = formatTimestamp(items[i].timestamp);
		if (newStr !== items[i].timestampStr) {
			changed = true;
			next.push({ ...items[i], timestampStr: newStr });
		} else {
			next.push(items[i]);
		}
	}
	return { next, changed };
};
// Produces the next display-items state for one timer tick.
// Returns prev unchanged (same reference) if nothing needed updating.
const tickTimestamps = (prev, cycleCount) => {
	const dueCount = countDueItems(prev, cycleCount);
	if (dueCount === 0) return prev;
	const { next, changed } = refreshDueItems(prev, dueCount);
	if (!changed) return prev;
	return [...next, ...prev.slice(dueCount)];
};
const formatTimestamp = (timestamp) => {
	const settings = globalThis.ActivityMonitorMod?.settings;
	const format = settings?.getSetting('timestampFormat') || 'relative';
	if (format === 'relative') {
		const { seconds, minutes, hours, days } = getTimestampAge(timestamp);
		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return seconds <= 3 ? 'just now' : `${seconds}s ago`;
	} else {
		const date = new Date(timestamp);
		return date.toLocaleString();
	}
};
function NotificationPanel() {
	const [notificationDisplayItems, setNotificationDisplayItems] = useState(
		[],
	);
	const [filter, setFilter] = useState('all');
	const [searchTerm, setSearchTerm] = useState('');
	const [notificationTypes, setNotificationTypes] = useState([]);
	// Load initial notifications
	useEffect(() => {
		const storage = globalThis.ActivityMonitorMod?.storage;
		if (storage) {
			const all = storage.getNotifications();
			setNotificationDisplayItems(
				all.map((n) => ({
					...n,
					timestampStr: formatTimestamp(n.timestamp),
				})),
			);
		}
	}, []);
	// Listen for notification events (added, updated, refresh)
	// Debounce rapid-fire events so multiple notifications arriving
	// in the same tick only trigger a single re-render.
	useEffect(() => {
		let debounceTimer = null;
		const refreshNotifications = () => {
			if (debounceTimer !== null) {
				clearTimeout(debounceTimer);
			}
			debounceTimer = setTimeout(() => {
				debounceTimer = null;
				const storage = globalThis.ActivityMonitorMod?.storage;
				if (storage) {
					const all = storage.getNotifications();
					setNotificationDisplayItems(
						all.map((n) => ({
							...n,
							timestampStr: formatTimestamp(n.timestamp),
						})),
					);
				}
			}, 100);
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
			if (debounceTimer !== null) {
				clearTimeout(debounceTimer);
			}
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
			new Set(notificationDisplayItems.map((item) => item.type)),
		).sort();
		const typesChanged =
			newTypes.length !== notificationTypes.length ||
			newTypes.some((type, i) => type !== notificationTypes[i]);
		if (typesChanged) {
			setNotificationTypes(newTypes);
		}
	}, [notificationDisplayItems]);
	// Each tick refreshes only the newest items whose display string may have
	// changed; older items are skipped entirely via early exit.
	useEffect(() => {
		let cycleCount = 0;
		const timer = setInterval(() => {
			cycleCount++;
			setNotificationDisplayItems((prev) =>
				tickTimestamps(prev, cycleCount),
			);
		}, 1000);
		return () => clearInterval(timer);
	}, []);
	// Filter display items (grouping happens at storage time)
	const filteredItems = notificationDisplayItems.filter((item) => {
		// Filter by type
		if (filter !== 'all' && item.type !== filter) return false;
		// Filter by search term
		if (
			searchTerm &&
			!item.message.toLowerCase().includes(searchTerm.toLowerCase())
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
				setNotificationDisplayItems([]);
			}
		}
	};
	// Generate header title with counts
	const headerTitle =
		notificationDisplayItems.length === filteredItems.length ?
			`Activity Monitor (${notificationDisplayItems.length})`
		:	`Activity Monitor (${filteredItems.length}/${notificationDisplayItems.length})`;
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
					${filteredItems.length === 0 ?
						html`
							<div class="activity-monitor-empty">
								<i class="fa fa-inbox"></i>
								<p>No notifications to display</p>
							</div>
						`
					:	filteredItems.map(
							(item) => html`
								<activity-monitor-card
									key=${item.id}
									.id=${item.id}
									.type=${item.type}
									.quantity=${item.quantity}
									.count=${item.count}
									.media=${item.media}
									.message=${item.message}
									.timestampDisplay=${item.timestampStr}
								></activity-monitor-card>
							`,
						)}
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
