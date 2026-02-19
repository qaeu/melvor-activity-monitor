'use strict';
/// <reference path="../../../types/melvor.d.ts" />
/// <reference path="../globals.d.ts" />
function NotificationCard(props) {
	const {
		id,
		type,
		quantity: rawQuantity,
		count: rawCount,
		media,
		message,
		timestampDisplay,
	} = props;
	if (!id) {
		return html``;
	}
	// Handle delete
	const handleDelete = () => {
		const storage = globalThis.ActivityMonitorMod?.storage;
		if (!storage) return;
		storage.removeNotification(id);
		// Dispatch refresh event
		document.dispatchEvent(
			new CustomEvent('activity-monitor-refresh-panel'),
		);
	};
	// Get notification type class
	const getTypeClass = () => {
		const t = type.toLowerCase();
		if (t.includes('error')) return 'notification-error';
		if (t.includes('success')) return 'notification-success';
		if (t.includes('info')) return 'notification-info';
		if (t.includes('item')) return 'notification-item';
		if (t.includes('xp') || t.includes('level')) return 'notification-xp';
		if (t.includes('currency') || t.includes('gp') || t.includes('coin'))
			return 'notification-currency';
		return 'notification-default';
	};
	// Format quantity
	const formatQuantity = () => {
		if (rawQuantity === undefined || rawQuantity === null) {
			return '';
		}
		if (rawQuantity >= 1000000) {
			return `${(rawQuantity / 1000000).toFixed(1)}M`;
		}
		if (rawQuantity >= 1000) {
			return `${(rawQuantity / 1000).toFixed(1)}K`;
		}
		return parseFloat(rawQuantity.toFixed(3));
	};
	const quantity = formatQuantity();
	const typeClass = getTypeClass();
	const timestamp = timestampDisplay;
	const count = rawCount || 1;
	return html`
		<div class="activity-monitor-card ${typeClass}">
			<div class="card-content">
				<!-- Icon -->
				${media ?
					html`
						<div class="card-icon">
							<img src="${media}" alt="" />
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
					<div class="card-message">${message}</div>
					<div class="card-meta">
						<span class="card-type">${type}</span>
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
