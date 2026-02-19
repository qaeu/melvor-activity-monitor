'use strict';
/// <reference path="../../../types/melvor.d.ts" />
/// <reference path="../globals.d.ts" />
function NotificationCard(props) {
	const { notification } = props;
	if (!notification) {
		return html``;
	}
	// Format timestamp
	const formatTimestamp = (timestamp) => {
		const settings = globalThis.ActivityMonitorMod?.settings;
		const format = settings?.getSetting('timestampFormat') || 'relative';
		if (format === 'relative') {
			const now = Date.now();
			const diff = now - timestamp;
			const seconds = Math.floor(diff / 1000);
			const minutes = Math.floor(seconds / 60);
			const hours = Math.floor(minutes / 60);
			const days = Math.floor(hours / 24);
			if (days > 0) return `${days}d ago`;
			if (hours > 0) return `${hours}h ago`;
			if (minutes > 0) return `${minutes}m ago`;
			return seconds <= 3 ? 'just now' : `${seconds}s ago`;
		} else {
			const date = new Date(timestamp);
			return date.toLocaleString();
		}
	};
	// Handle delete
	const handleDelete = () => {
		const storage = globalThis.ActivityMonitorMod?.storage;
		if (!storage) return;
		storage.removeNotification(notification.id);
		// Dispatch refresh event
		document.dispatchEvent(
			new CustomEvent('activity-monitor-refresh-panel'),
		);
	};
	// Get notification type class
	const getTypeClass = () => {
		const type = notification.type.toLowerCase();
		if (type.includes('error')) return 'notification-error';
		if (type.includes('success')) return 'notification-success';
		if (type.includes('info')) return 'notification-info';
		if (type.includes('item')) return 'notification-item';
		if (type.includes('xp') || type.includes('level'))
			return 'notification-xp';
		if (
			type.includes('currency') ||
			type.includes('gp') ||
			type.includes('coin')
		)
			return 'notification-currency';
		return 'notification-default';
	};
	// Format quantity
	const formatQuantity = () => {
		if (
			notification.quantity === undefined ||
			notification.quantity === null
		) {
			return '';
		}
		if (notification.quantity >= 1000000) {
			return `${(notification.quantity / 1000000).toFixed(1)}M`;
		}
		if (notification.quantity >= 1000) {
			return `${(notification.quantity / 1000).toFixed(1)}K`;
		}
		return parseFloat(notification.quantity.toFixed(3));
	};
	const quantity = formatQuantity();
	const typeClass = getTypeClass();
	const timestamp = formatTimestamp(notification.timestamp);
	const count = notification.count || 1;
	return html`
		<div class="activity-monitor-card ${typeClass}">
			<div class="card-content">
				<!-- Icon -->
				${notification.media ?
					html`
						<div class="card-icon">
							<img src="${notification.media}" alt="" />
							${count > 1 ?
								html`<span class="card-count-badge"
									>×${count}</span
								>`
							:	''}
						</div>
					`
				:	''}

				<!-- Content -->
				<div class="card-body">
					<div class="card-message">${notification.message}</div>
					<div class="card-meta">
						<span class="card-type">${notification.type}</span>
						${quantity ?
							html`<span class="card-quantity"
								>${quantity}${count > 1 ? ' total' : ''}</span
							>`
						:	''}
						<span class="card-timestamp">${timestamp}</span>
					</div>
				</div>

				<!-- Actions -->
				<div class="card-actions">
					<button
						class="card-action-btn delete-btn"
						@click=${handleDelete}
						title="Delete notification"
					>
						<i class="fa fa-trash"></i>
					</button>
				</div>
			</div>
		</div>
	`;
}
// Define custom element (disable shadow DOM to allow global CSS)
customElements.define(
	'activity-monitor-card',
	component(NotificationCard, { useShadowDOM: false }),
);
//# sourceMappingURL=NotificationCard.js.map
