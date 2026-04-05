<!--
  Vista lista flat (mobile cards + desktop table) per la pagina admin ordini.
-->
<script setup>
const props = defineProps({
	orders: { type: Array, default: () => [] },
	orderStatusConfig: { type: Object, default: () => ({}) },
	formatCents: { type: Function, required: true },
	formatDate: { type: Function, required: true },
	getAvailableStatuses: { type: Function, required: true },
});

const emit = defineEmits(['show-detail', 'change-status']);
</script>

<template>
	<div class="admin-orders-flat-view space-y-[12px]">
		<!-- Mobile cards -->
		<div class="grid grid-cols-1 gap-[12px] desktop:hidden tablet:grid-cols-2">
			<div v-for="order in orders" :key="order.id" class="admin-orders-card">
				<div class="flex items-start justify-between gap-[12px]">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-[8px] mb-[6px]">
							<span class="text-[0.9375rem] font-bold text-[var(--color-brand-text)]">#{{ order.id }}</span>
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
								{{ orderStatusConfig[order.status]?.label || order.status }}
							</span>
						</div>
						<p class="text-[0.875rem] font-medium text-[var(--color-brand-text)] truncate">{{ order.user?.name }} {{ order.user?.surname }}</p>
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)] truncate">{{ order.user?.email }}</p>
					</div>
					<div class="text-right shrink-0">
						<p class="text-[1rem] font-bold text-[var(--color-brand-text)]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</p>
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ formatDate(order.created_at) }}</p>
					</div>
				</div>
				<div class="admin-orders-card__meta">
					<span class="text-[#404040]">{{ order.packages?.length || 0 }} colli</span>
					<span v-if="order.brt_parcel_id" class="admin-orders-flat-view__brt-chip">{{ order.brt_parcel_id }}</span>
					<span v-if="order.brt_pudo_id" class="admin-orders-flat-view__pudo-chip">PUDO</span>
				</div>
				<div class="admin-orders-card__actions">
					<button @click="emit('show-detail', order)" class="admin-orders-flat-view__detail-button">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17C7,17 2.73,13.89 1,12C2.73,10.11 7,7 12,7C17,7 21.27,10.11 23,12C21.27,13.89 17,17 12,17Z"/></svg>
						Dettagli
					</button>
					<select @change="emit('change-status', order.id, $event.target.value, order.status); $event.target.value = ''" class="admin-orders-flat-view__status-select">
						<option value="" selected disabled>Stato</option>
						<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Desktop table -->
		<div class="hidden desktop:block overflow-x-auto">
			<table class="admin-orders-table">
				<thead>
					<tr class="admin-orders-table__head-row">
						<th class="admin-orders-table__head-cell">ID</th>
						<th class="admin-orders-table__head-cell">Utente</th>
						<th class="admin-orders-table__head-cell">Colli</th>
						<th class="admin-orders-table__head-cell admin-orders-table__head-cell--right">Importo</th>
						<th class="admin-orders-table__head-cell">Stato</th>
						<th class="admin-orders-table__head-cell">BRT</th>
						<th class="admin-orders-table__head-cell">Data</th>
						<th class="admin-orders-table__head-cell admin-orders-table__head-cell--right">Azioni</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(order, idx) in orders" :key="order.id" :class="['admin-orders-table__row', idx % 2 === 1 ? 'admin-orders-table__row--alt' : '']">
						<td class="admin-orders-table__cell admin-orders-table__cell--id">#{{ order.id }}</td>
						<td class="admin-orders-table__cell">
							<div class="admin-orders-table__user">
								<span class="admin-orders-table__user-name">{{ order.user?.name }} {{ order.user?.surname }}</span>
								<span class="admin-orders-table__user-email">{{ order.user?.email }}</span>
							</div>
						</td>
						<td class="admin-orders-table__cell text-[#404040]">{{ order.packages?.length || 0 }}</td>
						<td class="admin-orders-table__cell admin-orders-table__cell--amount">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</td>
						<td class="admin-orders-table__cell">
							<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
								{{ orderStatusConfig[order.status]?.label || order.status }}
							</span>
						</td>
						<td class="admin-orders-table__cell">
							<span v-if="order.brt_parcel_id" class="admin-orders-flat-view__brt-chip">{{ order.brt_parcel_id }}</span>
							<span v-else class="text-[#C8CCD0]">&mdash;</span>
							<span v-if="order.brt_pudo_id" class="admin-orders-flat-view__pudo-chip ml-[4px]" title="Ritiro in Punto BRT">PUDO</span>
						</td>
						<td class="admin-orders-table__cell admin-orders-table__cell--date">{{ formatDate(order.created_at) }}</td>
						<td class="admin-orders-table__cell admin-orders-table__cell--actions">
							<div class="admin-orders-table__actions">
								<button @click="emit('show-detail', order)" class="admin-orders-flat-view__detail-button admin-orders-flat-view__detail-button--compact">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17C7,17 2.73,13.89 1,12C2.73,10.11 7,7 12,7C17,7 21.27,10.11 23,12C21.27,13.89 17,17 12,17Z"/></svg>
									Dettagli
								</button>
								<select @change="emit('change-status', order.id, $event.target.value, order.status); $event.target.value = ''" class="admin-orders-flat-view__status-select admin-orders-flat-view__status-select--compact">
									<option value="" selected disabled>Stato</option>
									<option v-for="s in getAvailableStatuses(order.status)" :key="s.value" :value="s.value">{{ s.label }}</option>
								</select>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<style scoped>
.admin-orders-card {
	position: relative;
	display: grid;
	gap: 12px;
	padding: 16px;
	border-radius: 18px;
	border: 1px solid #dbe7eb;
	background: linear-gradient(180deg, #fbfcfd 0%, #f7fafb 100%);
	box-shadow: 0 10px 18px rgba(20, 37, 48, 0.04);
	overflow: hidden;
}

.admin-orders-card::before {
	content: '';
	position: absolute;
	inset: 0 auto 0 0;
	width: 4px;
	background: linear-gradient(180deg, var(--color-brand-primary-light) 0%, #e45c20 100%);
}

.admin-orders-card__meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
	font-size: 0.75rem;
}

.admin-orders-card__actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.admin-orders-flat-view__detail-button,
.admin-orders-flat-view__status-select {
	width: 100%;
	min-height: 38px;
	border: 1px solid #d5e1e5;
	border-radius: 14px;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	font-size: 0.78rem;
	font-weight: 700;
	color: #233547;
	transition:
		border-color 180ms ease,
		box-shadow 180ms ease,
		color 180ms ease,
		background-color 180ms ease;
}

.admin-orders-flat-view__detail-button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	padding: 0 12px;
}

.admin-orders-flat-view__detail-button:hover,
.admin-orders-flat-view__detail-button:focus-visible,
.admin-orders-flat-view__status-select:hover,
.admin-orders-flat-view__status-select:focus-visible {
	outline: none;
	border-color: #bfd2d8;
	box-shadow: 0 0 0 3px rgba(11, 89, 101, 0.08);
	color: var(--color-brand-primary-light);
}

.admin-orders-flat-view__status-select {
	padding: 0 10px;
	cursor: pointer;
}

.admin-orders-flat-view__detail-button--compact,
.admin-orders-flat-view__status-select--compact {
	min-height: 34px;
}

.admin-orders-flat-view__brt-chip {
	display: inline-flex;
	align-items: center;
	padding: 2px 8px;
	border-radius: 999px;
	background: #eef2ff;
	font-size: 0.72rem;
	font-weight: 700;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
	color: #4c57b7;
}

.admin-orders-flat-view__pudo-chip {
	display: inline-flex;
	align-items: center;
	padding: 2px 8px;
	border-radius: 999px;
	background: rgba(11, 89, 101, 0.08);
	font-size: 0.68rem;
	font-weight: 800;
	color: var(--color-brand-primary-light);
}

.admin-orders-table {
	width: 100%;
	min-width: 980px;
	border-collapse: separate;
	border-spacing: 0;
	font-size: 0.875rem;
}

.admin-orders-table__head-row {
	text-align: left;
}

.admin-orders-table__head-cell {
	padding: 0 12px 12px;
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #6e7d8d;
	border-bottom: 1px solid #e6edf1;
}

.admin-orders-table__head-cell--right {
	text-align: right;
}

.admin-orders-table__row {
	transition: background-color 180ms ease;
}

.admin-orders-table__row--alt {
	background: #fbfcfd;
}

.admin-orders-table__row:hover {
	background: #f7fbfc;
}

.admin-orders-table__cell {
	padding: 16px 12px;
	border-bottom: 1px solid #eef3f5;
	vertical-align: top;
}

.admin-orders-table__row:last-child .admin-orders-table__cell {
	border-bottom: 0;
}

.admin-orders-table__cell--id {
	font-weight: 800;
	color: #1f2a3c;
}

.admin-orders-table__user {
	display: grid;
	gap: 2px;
}

.admin-orders-table__user-name {
	font-weight: 700;
	color: #1f2a3c;
}

.admin-orders-table__user-email {
	font-size: 0.75rem;
	line-height: 1.45;
	color: #738394;
}

.admin-orders-table__cell--amount {
	text-align: right;
	font-weight: 800;
	color: #1f2a3c;
}

.admin-orders-table__cell--date {
	font-size: 0.8125rem;
	color: #738394;
}

.admin-orders-table__cell--actions {
	text-align: right;
}

.admin-orders-table__actions {
	display: inline-flex;
	gap: 8px;
	justify-content: flex-end;
}
</style>
