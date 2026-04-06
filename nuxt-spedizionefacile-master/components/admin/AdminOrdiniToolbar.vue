<!--
  Toolbar ricerca, filtri e toggle vista per la pagina admin ordini.
  Props: stato filtri, contatori, formattazione.
  Emits: aggiorna, toggle-group, reset, search.
-->
<script setup>
const props = defineProps({
	ordersSearch: { type: String, default: '' },
	ordersStatusFilter: { type: String, default: '' },
	orderStatusOptions: { type: Array, default: () => [] },
	visibleOrdersCount: { type: Number, default: 0 },
	groupedUsersCount: { type: Number, default: 0 },
	visibleOrdersTotal: { type: Number, default: 0 },
	groupByUser: { type: Boolean, default: false },
	hasActiveFilters: { type: Boolean, default: false },
	activeStatusLabel: { type: String, default: 'Tutti gli stati' },
	formatCents: { type: Function, required: true },
});

const emit = defineEmits([
	'update:ordersSearch',
	'update:ordersStatusFilter',
	'refresh',
	'toggle-group',
	'reset',
	'search',
	'filter-change',
]);
</script>

<template>
	<div class="sf-account-panel admin-orders-toolbar rounded-[20px] p-[16px] tablet:p-[20px] desktop:p-[24px]">
		<div class="admin-orders-toolbar__top">
			<div class="admin-orders-toolbar__copy">
				<p class="admin-orders-toolbar__eyebrow">Vista ordini</p>
				<h2 class="admin-orders-toolbar__title">Controllo rapido di volumi, stato medio e valore totale</h2>
				<p class="admin-orders-toolbar__text">
					Cerca, filtra e cambia prospettiva senza perdere il contesto operativo della lista.
				</p>
			</div>
			<div class="admin-orders-toolbar__actions">
				<button
					type="button"
					@click="emit('refresh')"
					class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
						<path
							d="M12,6V9L16,5L12,1V4C7.58,4 4,7.58 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.96 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.75,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20C16.42,20 20,16.42 20,12C20,10.43 19.54,8.97 18.76,7.74Z" />
					</svg>
					Aggiorna
				</button>
				<button
					type="button"
					@click="emit('toggle-group')"
					:class="['btn-compact inline-flex items-center justify-center gap-[6px]', groupByUser ? 'btn-cta' : 'btn-secondary']">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
						<path
							d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z" />
					</svg>
					{{ groupByUser ? 'Vista lista' : 'Per utente' }}
				</button>
				<button
					type="button"
					@click="emit('reset')"
					:disabled="!hasActiveFilters"
					class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px] disabled:cursor-not-allowed disabled:opacity-45">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
						<path
							d="M13.39,8.23L15.5,10.34L20.43,5.41L19,4L15.5,7.5L14.8,6.8C13.76,5.76 12.33,5.11 10.76,5.02C7.06,4.8 4,7.84 4,11.54C4,13.37 4.73,15.03 5.91,16.22L4.5,17.63C2.95,16.08 2,13.93 2,11.54C2,6.56 6.11,2.5 11.09,2.54C13.42,2.56 15.53,3.5 17.06,5L20.41,1.65L21.82,3.06L16.89,7.99L19,10.1H13.39V8.23M10.61,15.77L8.5,13.66L3.57,18.59L5,20L8.5,16.5L9.2,17.2C10.24,18.24 11.67,18.89 13.24,18.98C16.94,19.2 20,16.16 20,12.46C20,10.63 19.27,8.97 18.09,7.78L19.5,6.37C21.05,7.92 22,10.07 22,12.46C22,17.44 17.89,21.5 12.91,21.46C10.58,21.44 8.47,20.5 6.94,19L3.59,22.35L2.18,20.94L7.11,16.01L5,13.9H10.61V15.77Z" />
					</svg>
					Reset
				</button>
			</div>
		</div>

		<div class="admin-orders-toolbar__stats">
			<article class="admin-orders-toolbar__stat admin-orders-toolbar__stat--teal">
				<span class="admin-orders-toolbar__stat-label">Ordini visibili</span>
				<strong class="admin-orders-toolbar__stat-value">{{ visibleOrdersCount }}</strong>
				<span class="admin-orders-toolbar__stat-meta">Elementi attualmente in elenco</span>
			</article>
			<article class="admin-orders-toolbar__stat admin-orders-toolbar__stat--slate">
				<span class="admin-orders-toolbar__stat-label">{{ groupByUser ? 'Utenti attivi' : 'Filtro corrente' }}</span>
				<strong class="admin-orders-toolbar__stat-value admin-orders-toolbar__stat-value--sm">
					{{ groupByUser ? `${groupedUsersCount}` : activeStatusLabel }}
				</strong>
				<span class="admin-orders-toolbar__stat-meta">
					{{ groupByUser ? 'Raggruppamento per cliente' : 'Stato applicato alla lista' }}
				</span>
			</article>
			<article class="admin-orders-toolbar__stat admin-orders-toolbar__stat--orange">
				<span class="admin-orders-toolbar__stat-label">Valore visibile</span>
				<strong class="admin-orders-toolbar__stat-value">{{ formatCents(visibleOrdersTotal) }} €</strong>
				<span class="admin-orders-toolbar__stat-meta">Totale ordini nella vista corrente</span>
			</article>
		</div>

		<div class="admin-orders-toolbar__filters">
			<label class="admin-orders-toolbar__field">
				<span class="admin-orders-toolbar__field-label">Ricerca</span>
				<div class="admin-orders-toolbar__input-shell">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="admin-orders-toolbar__field-icon"
						fill="currentColor">
						<path
							d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
					</svg>
					<input
						:value="ordersSearch"
						@input="
							emit('update:ordersSearch', $event.target.value);
							emit('search');
						"
						@keyup.enter="emit('search')"
						type="text"
						placeholder="Cerca per ID, nome, email..."
						class="admin-orders-toolbar__input" />
				</div>
			</label>
			<label class="admin-orders-toolbar__field">
				<span class="admin-orders-toolbar__field-label">Stato</span>
				<select
					:value="ordersStatusFilter"
					@change="
						emit('update:ordersStatusFilter', $event.target.value);
						emit('filter-change');
					"
					class="admin-orders-toolbar__select">
					<option v-for="option in orderStatusOptions" :key="option.value || 'all'" :value="option.value">{{ option.label }}</option>
				</select>
			</label>
		</div>
	</div>
</template>

<style scoped>
.admin-orders-toolbar {
	display: grid;
	gap: 18px;
}

.admin-orders-toolbar__top {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 16px;
	align-items: start;
}

.admin-orders-toolbar__copy {
	display: grid;
	gap: 6px;
	max-width: 44rem;
}

.admin-orders-toolbar__eyebrow {
	margin: 0;
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: #6b7a89;
}

.admin-orders-toolbar__title {
	margin: 0;
	font-size: clamp(1.12rem, 1rem + 0.35vw, 1.4rem);
	line-height: 1.12;
	font-weight: 800;
	letter-spacing: -0.025em;
	color: #1f2a3c;
}

.admin-orders-toolbar__text {
	margin: 0;
	font-size: 0.88rem;
	line-height: 1.5;
	color: #5c6d7f;
}

.admin-orders-toolbar__actions {
	display: grid;
	grid-template-columns: repeat(3, auto);
	gap: 8px;
}

.admin-orders-toolbar__stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.admin-orders-toolbar__stat {
	position: relative;
	display: grid;
	gap: 4px;
	padding: 14px 16px;
	border-radius: 18px;
	border: 1px solid #d8e5e9;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	box-shadow: 0 8px 18px rgba(20, 37, 48, 0.04);
	overflow: hidden;
}

.admin-orders-toolbar__stat::before {
	content: '';
	position: absolute;
	inset: 0 auto 0 0;
	width: 4px;
	background: linear-gradient(180deg, #dfe8ec 0%, #eef4f6 100%);
}

.admin-orders-toolbar__stat--teal::before {
	background: linear-gradient(180deg, var(--color-brand-primary-light) 0%, #2b8392 100%);
}

.admin-orders-toolbar__stat--slate::before {
	background: linear-gradient(180deg, #1f2a3c 0%, #506172 100%);
}

.admin-orders-toolbar__stat--orange::before {
	background: linear-gradient(180deg, #e45c20 0%, #f19352 100%);
}

.admin-orders-toolbar__stat-label {
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #6f7f8f;
}

.admin-orders-toolbar__stat-value {
	font-size: 1.18rem;
	line-height: 1.08;
	font-weight: 800;
	color: #1f2a3c;
}

.admin-orders-toolbar__stat-value--sm {
	font-size: 1rem;
}

.admin-orders-toolbar__stat-meta {
	font-size: 0.8rem;
	line-height: 1.45;
	color: #5c6d7f;
}

.admin-orders-toolbar__filters {
	display: grid;
	grid-template-columns: minmax(0, 1.45fr) minmax(220px, 0.72fr);
	gap: 12px;
}

.admin-orders-toolbar__field {
	display: grid;
	gap: 7px;
	min-width: 0;
}

.admin-orders-toolbar__field-label {
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #607181;
}

.admin-orders-toolbar__input-shell {
	position: relative;
}

.admin-orders-toolbar__field-icon {
	position: absolute;
	left: 14px;
	top: 50%;
	width: 18px;
	height: 18px;
	color: #7a8998;
	transform: translateY(-50%);
}

.admin-orders-toolbar__input,
.admin-orders-toolbar__select {
	width: 100%;
	min-height: 46px;
	border: 1px solid #d8e4e8;
	border-radius: 16px;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	font-size: 0.9rem;
	color: #233547;
	box-shadow: inset 0 1px 2px rgba(20, 37, 48, 0.03);
	transition:
		border-color 180ms ease,
		box-shadow 180ms ease;
}

.admin-orders-toolbar__input {
	padding: 0 14px 0 42px;
}

.admin-orders-toolbar__select {
	padding: 0 14px;
	cursor: pointer;
}

.admin-orders-toolbar__input:focus,
.admin-orders-toolbar__select:focus {
	outline: none;
	border-color: var(--color-brand-primary-light);
	box-shadow: 0 0 0 3px rgba(11, 89, 101, 0.1);
}

@media (max-width: 1023.98px) {
	.admin-orders-toolbar__top,
	.admin-orders-toolbar__filters {
		grid-template-columns: minmax(0, 1fr);
	}

	.admin-orders-toolbar__actions,
	.admin-orders-toolbar__stats {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 767.98px) {
	.admin-orders-toolbar__actions {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
