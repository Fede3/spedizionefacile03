<!-- AdminPagination.vue — Paginazione unificata per liste admin. -->
<script setup>
import { computed } from 'vue';

const props = defineProps({
	currentPage: { type: Number, required: true },
	totalPages: { type: Number, required: true },
	perPage: { type: Number, default: 20 },
	total: { type: Number, default: 0 },
	maxShown: { type: Number, default: 5 },
});

const emit = defineEmits(['page-change']);

/* Calcola range pagine mostrate intorno a currentPage con ellipsis */
const pages = computed(() => {
	const { currentPage, totalPages, maxShown } = props;
	if (totalPages <= maxShown) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}
	const half = Math.floor(maxShown / 2);
	let start = Math.max(1, currentPage - half);
	const end = Math.min(totalPages, start + maxShown - 1);
	start = Math.max(1, end - maxShown + 1);
	const items = [];
	if (start > 1) {
		items.push(1);
		if (start > 2) items.push('...');
	}
	for (let i = start; i <= end; i++) items.push(i);
	if (end < totalPages) {
		if (end < totalPages - 1) items.push('...');
		items.push(totalPages);
	}
	return items;
});

const from = computed(() => (props.total === 0 ? 0 : (props.currentPage - 1) * props.perPage + 1));
const to = computed(() => Math.min(props.currentPage * props.perPage, props.total));

const goTo = (p) => {
	if (p === '...' || p === props.currentPage) return;
	if (p < 1 || p > props.totalPages) return;
	emit('page-change', p);
};
</script>

<template>
	<nav v-if="totalPages > 1" class="admin-pagination" aria-label="Paginazione">
		<p class="admin-pagination__summary" aria-live="polite">
			{{ from }}-{{ to }} di {{ total }}
		</p>

		<div class="admin-pagination__controls">
			<button
				type="button"
				class="admin-pagination__btn"
				:disabled="currentPage === 1"
				aria-label="Pagina precedente"
				@click="goTo(currentPage - 1)">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" /></svg>
				<span class="admin-pagination__btn-label">Precedente</span>
			</button>

			<ul class="admin-pagination__list">
				<li v-for="(p, idx) in pages" :key="`${p}-${idx}`">
					<span v-if="p === '...'" class="admin-pagination__ellipsis" aria-hidden="true">…</span>
					<button
						v-else
						type="button"
						:class="['admin-pagination__num', { 'admin-pagination__num--active': p === currentPage }]"
						:aria-current="p === currentPage ? 'page' : undefined"
						:aria-label="`Pagina ${p}`"
						@click="goTo(p)">
						{{ p }}
					</button>
				</li>
			</ul>

			<button
				type="button"
				class="admin-pagination__btn"
				:disabled="currentPage === totalPages"
				aria-label="Pagina successiva"
				@click="goTo(currentPage + 1)">
				<span class="admin-pagination__btn-label">Successiva</span>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" /></svg>
			</button>
		</div>
	</nav>
</template>

<style scoped>
.admin-pagination {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--admin-gap);
	padding: 12px 0;
}

.admin-pagination__summary {
	font-size: 0.8125rem;
	color: var(--admin-text-secondary);
}

.admin-pagination__controls {
	display: flex;
	align-items: center;
	gap: var(--admin-gap-sm);
}

.admin-pagination__list {
	display: flex;
	align-items: center;
	gap: 4px;
	list-style: none;
	margin: 0;
	padding: 0;
}

.admin-pagination__btn,
.admin-pagination__num {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	min-width: var(--admin-button-height-sm);
	height: var(--admin-button-height-sm);
	padding: 0 10px;
	background: var(--admin-surface);
	color: var(--admin-text-primary);
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
	font-size: 0.8125rem;
	font-weight: 600;
	cursor: pointer;
	transition: var(--admin-transition-fast);
}

.admin-pagination__btn:hover:not(:disabled),
.admin-pagination__num:hover:not(.admin-pagination__num--active) {
	background: var(--admin-surface-hover);
	border-color: var(--admin-border-hover);
}

.admin-pagination__btn:focus-visible,
.admin-pagination__num:focus-visible {
	outline: none;
	box-shadow: var(--admin-focus-ring);
}

.admin-pagination__btn:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}

.admin-pagination__num--active {
	background: var(--admin-status-success);
	color: var(--admin-text-on-brand);
	border-color: var(--admin-status-success);
}

.admin-pagination__ellipsis {
	padding: 0 6px;
	color: var(--admin-text-muted);
	font-weight: 700;
}

@media (max-width: 480px) {
	.admin-pagination__btn-label {
		display: none;
	}
}
</style>
