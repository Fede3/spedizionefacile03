<script setup>
const props = defineProps({
	canExpandSummaryDimensions: {
		type: Boolean,
		default: false,
	},
	canExpandSummaryServices: {
		type: Boolean,
		default: false,
	},
	detailPanel: {
		type: String,
		default: null,
	},
	expanded: {
		type: Boolean,
		default: false,
	},
	routeWarningMessage: {
		type: String,
		default: '',
	},
	showMiniSteps: {
		type: Boolean,
		default: false,
	},
	compactMobile: {
		type: Boolean,
		default: false,
	},
	summaryDestinationCity: {
		type: String,
		default: '—',
	},
	summaryDimensionsItems: {
		type: Array,
		default: () => [],
	},
	summaryDimensionsLabel: {
		type: String,
		default: '—',
	},
	summaryMiniSteps: {
		type: Array,
		default: () => [],
	},
	summaryOriginCity: {
		type: String,
		default: '—',
	},
	summaryPackageLabel: {
		type: String,
		default: '0 colli',
	},
	summaryPackageTypeInfo: {
		type: Object,
		default: () => ({
			icon: '/img/quote/first-step/pack.png',
			label: 'Pacco',
		}),
	},
	summaryRouteLabel: {
		type: String,
		default: '—',
	},
	summaryServicesItems: {
		type: Array,
		default: () => [],
	},
	summaryServicesLabel: {
		type: String,
		default: 'Nessun servizio',
	},
	summaryTotalPrice: {
		type: String,
		default: '0,00',
	},
});

const emit = defineEmits(['go-mini-step', 'toggle-detail-panel', 'update:expanded']);

const onAccordionEnter = (el) => {
	el.style.height = '0';
	el.style.overflow = 'hidden';
};

const onAccordionAfterEnter = (el) => {
	el.style.height = 'auto';
	el.style.overflow = 'visible';
};

const onAccordionLeave = (el) => {
	el.style.height = `${el.scrollHeight}px`;
	el.style.overflow = 'hidden';
	requestAnimationFrame(() => {
		el.style.height = '0';
	});
};

const toggleExpanded = () => {
	emit('update:expanded', !props.expanded);
};

const toggleDetailPanel = (panel) => {
	emit('toggle-detail-panel', panel);
};

const goToMiniStep = (step) => {
	emit('go-mini-step', step);
};
</script>

<template>
	<div
		class="z-30 mb-[20px] font-montserrat summary-sticky-shell sticky"
		:class="{ 'is-compact-mobile': compactMobile }"
		style="top: calc(env(safe-area-inset-top, 0px) + 8px);">
		<div class="summary-sticky-card bg-white rounded-[16px] shadow-lg overflow-hidden border border-[#D0D0D0]">
			<div class="summary-header-main">
				<div class="summary-top-row">
					<span class="summary-top-label">Riepilogo</span>
					<div v-if="showMiniSteps" class="summary-mini-steps-row">
						<button
							v-for="stepItem in summaryMiniSteps"
							:key="stepItem.id"
							type="button"
							class="summary-mini-step"
							:class="{
								'is-active': stepItem.isActive,
								'is-completed': stepItem.isCompleted && !stepItem.isActive,
								'is-disabled': !stepItem.isClickable && !stepItem.isActive
							}"
							:disabled="!stepItem.isClickable && !stepItem.isActive"
							:aria-disabled="(!stepItem.isClickable && !stepItem.isActive) ? 'true' : 'false'"
							:aria-current="stepItem.isActive ? 'step' : undefined"
							@click.stop="goToMiniStep(stepItem)">
							<span
								v-if="stepItem.isCompleted && !stepItem.isActive"
								class="summary-mini-step__check"
								aria-hidden="true">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							</span>
							<span>{{ stepItem.id }}. {{ stepItem.label }}</span>
						</button>
					</div>
				</div>

				<button
					type="button"
					class="summary-toggle-button w-full cursor-pointer"
					:aria-expanded="expanded ? 'true' : 'false'"
					@click="toggleExpanded">
					<div class="summary-overview-grid">
						<div class="summary-overview-item summary-overview-item--packages">
							<span class="summary-overview-label">Colli</span>
							<span class="summary-overview-value summary-overview-packages-value">
								<span class="summary-package-type-icon-wrap" aria-hidden="true">
									<img
										:src="summaryPackageTypeInfo.icon"
										:alt="summaryPackageTypeInfo.label"
										:title="`Tipologia collo: ${summaryPackageTypeInfo.label}`"
										loading="lazy"
										decoding="async"
										class="summary-package-type-icon" />
								</span>
								<span class="summary-overview-packages-text">{{ summaryPackageLabel }}</span>
								<span class="summary-overview-packages-separator">·</span>
								<span class="summary-overview-packages-type">{{ summaryPackageTypeInfo.label }}</span>
							</span>
						</div>

						<div class="summary-overview-item summary-overview-item--dimensions">
							<span class="summary-overview-label">Misure</span>
							<span class="summary-overview-value summary-overview-truncate">{{ summaryDimensionsLabel }}</span>
						</div>

						<div class="summary-overview-route summary-overview-item--route">
							<span class="summary-overview-label">Tratta</span>
							<span class="summary-overview-value summary-overview-truncate">{{ summaryRouteLabel }}</span>
						</div>

						<div class="summary-overview-total">
							<span class="summary-overview-total-label">Totale</span>
							<span class="summary-overview-total-value">{{ summaryTotalPrice }}€</span>
						</div>
					</div>

					<span class="summary-chevron-wrap">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#095866"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="summary-chevron-icon flex-shrink-0"
							:class="{ 'is-open': expanded }">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</span>
				</button>

				<div v-if="routeWarningMessage" class="summary-route-warning ux-alert ux-alert--soft">
					<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon" viewBox="0 0 24 24"><path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/></svg>
					<span>{{ routeWarningMessage }}</span>
				</div>
			</div>

			<Transition
				name="accordion"
				@enter="onAccordionEnter"
				@after-enter="onAccordionAfterEnter"
				@leave="onAccordionLeave">
				<div v-show="expanded" class="accordion-content">
					<div class="summary-details-row">
						<div class="summary-detail-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
								<circle cx="12" cy="10" r="3"/>
							</svg>
							<span class="summary-detail-label">Da</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryOriginCity }} → {{ summaryDestinationCity }}</span>
						</div>

						<div class="summary-detail-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
								<path d="M4 20h16M6 20V8m12 12V8M6 8h12M10 8v4m4-4v4"/>
							</svg>
							<span class="summary-detail-label">Misure</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryDimensionsLabel }}</span>
							<button
								v-if="canExpandSummaryDimensions"
								type="button"
								class="summary-detail-more"
								@click.stop="toggleDetailPanel('dimensions')">
								{{ detailPanel === 'dimensions' ? 'Chiudi' : 'Vedi' }}
							</button>
						</div>

						<div class="summary-detail-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2">
								<path d="M8 6h12M8 12h12M8 18h12"/>
								<circle cx="4" cy="6" r="1"/>
								<circle cx="4" cy="12" r="1"/>
								<circle cx="4" cy="18" r="1"/>
							</svg>
							<span class="summary-detail-label">Servizi</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryServicesLabel }}</span>
							<button
								v-if="canExpandSummaryServices"
								type="button"
								class="summary-detail-more"
								@click.stop="toggleDetailPanel('services')">
								{{ detailPanel === 'services' ? 'Chiudi' : 'Vedi' }}
							</button>
						</div>
					</div>

					<div v-if="detailPanel" class="summary-detail-expand">
						<div v-if="detailPanel === 'dimensions'" class="summary-detail-expand-block">
							<p class="summary-detail-expand-title">Tutte le misure collo</p>
							<div class="summary-detail-pill-wrap">
								<span
									v-for="(item, idx) in summaryDimensionsItems"
									:key="`summary-dim-${idx}`"
									class="summary-detail-pill">
									<NuxtImg
										v-if="item.icon"
										:src="item.icon"
										:alt="item.type || 'Tipo collo'"
										width="14"
										height="14"
										loading="lazy"
										decoding="async"
										class="summary-detail-pill-icon" />
									<span class="summary-detail-pill-text">{{ item.label }}</span>
								</span>
							</div>
						</div>

						<div v-else-if="detailPanel === 'services'" class="summary-detail-expand-block">
							<p class="summary-detail-expand-title">Servizi selezionati</p>
							<div class="summary-detail-pill-wrap">
								<span
									v-for="(item, idx) in summaryServicesItems"
									:key="`summary-service-${idx}`"
									class="summary-detail-pill">
									{{ item }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</Transition>
		</div>
	</div>
</template>

<style scoped>
.summary-sticky-card {
	border-radius: 16px;
}

.summary-sticky-shell {
	scroll-margin-top: calc(env(safe-area-inset-top, 0px) + 12px);
}

.summary-toggle-button {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 14px;
	padding: 10px 22px 14px;
	border-top: none;
	border: 0;
	background: #ffffff;
	text-align: left;
	transform: none !important;
	will-change: auto !important;
	transition-property: background-color, border-color, color;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.summary-toggle-button:hover {
	background: #f8fbfc;
}

.summary-header-main {
	display: flex;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.summary-top-row {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
	min-height: 28px;
	padding: 12px 22px 0;
}

.summary-top-label {
	font-size: 0.9375rem;
	line-height: 1;
	font-weight: 700;
	color: #252b42;
	flex-shrink: 0;
}

.summary-mini-steps-row {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: nowrap;
	overflow-x: auto;
	padding-bottom: 2px;
	scrollbar-width: none;
	scroll-snap-type: x proximity;
}

.summary-mini-steps-row::-webkit-scrollbar {
	display: none;
}

.summary-mini-step {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 0.875rem;
	line-height: 1;
	color: #737373;
	padding: 8px 14px;
	border-radius: 999px;
	border: 1px solid transparent;
	background: transparent;
	font-weight: 600;
	white-space: nowrap;
	flex: 0 0 auto;
	scroll-snap-align: start;
	transform: none !important;
	will-change: auto !important;
	transition-property: background-color, color, border-color;
	transition-duration: 0.2s;
	transition-timing-function: ease;
}

.summary-mini-step.is-active {
	background: #e44203;
	color: #ffffff;
	font-weight: 700;
	padding-inline: 14px;
	border-color: transparent;
}

.summary-mini-step.is-completed {
	background: #eef7f8;
	border-color: #d6e7ea;
	color: #095866;
	cursor: pointer;
	font-weight: 700;
}

.summary-mini-step.is-completed:hover {
	background: #eaf4f6;
	border-color: #c8dde1;
	color: #095866;
}

.summary-mini-step.is-disabled {
	opacity: 0.45;
	cursor: default;
}

.summary-mini-step__check {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	line-height: 0;
	color: inherit;
	transform: translateY(-0.5px);
}

.summary-overview-grid {
	display: grid;
	grid-template-columns: max-content max-content minmax(0, 1fr) max-content;
	gap: 10px;
	align-items: stretch;
	min-width: 0;
	width: 100%;
}

.summary-overview-item,
.summary-overview-route {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 2px;
	min-height: 44px;
	padding: 8px 12px;
	border-radius: 12px;
	background: #f6f9fb;
	border: 1px solid #dce8ee;
	min-width: 0;
}

.summary-overview-route {
	background: #f7fafc;
}

.summary-overview-label {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: #546275;
	line-height: 1.1;
}

.summary-overview-value {
	font-size: 0.9375rem;
	font-weight: 700;
	line-height: 1.2;
	color: #1f2a3c;
}

.summary-overview-packages-value {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
}

.summary-package-type-icon-wrap {
	width: 28px;
	height: 28px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	overflow: hidden;
	padding: 2px;
	line-height: 0;
}

.summary-package-type-icon {
	display: block;
	width: auto;
	height: 20px;
	max-width: 20px;
	max-height: 20px;
	flex-shrink: 0;
	object-fit: contain;
	object-position: center;
}

.summary-overview-packages-text {
	white-space: nowrap;
}

.summary-overview-packages-separator {
	color: #7c8ba0;
}

.summary-overview-packages-type {
	color: #3b4c62;
	white-space: nowrap;
}

.summary-overview-total {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-end;
	gap: 1px;
	padding: 8px 12px;
	border-radius: 12px;
	background: #eef7f8;
	border: 1px solid #b5d3d8;
	min-width: 128px;
}

.summary-overview-total-label {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: #486a74;
}

.summary-overview-total-value {
	font-size: 1.25rem;
	font-weight: 800;
	line-height: 1;
	color: #095866;
	white-space: nowrap;
}

.summary-overview-truncate {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary-chevron-wrap {
	flex-shrink: 0;
	width: 38px;
	height: 38px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 12px;
	border: 1px solid #bdd5da;
	background: #f2f8f9;
}

.summary-chevron-icon {
	transition: transform 0.2s ease;
	transform-origin: center;
}

.summary-chevron-icon.is-open {
	transform: rotate(180deg);
}

.summary-toggle-button:hover,
.summary-toggle-button:focus-visible,
.summary-mini-step:hover,
.summary-mini-step:focus-visible {
	transform: none !important;
}

.summary-route-warning {
	margin: 0 22px 10px;
	font-size: 0.75rem;
}

.summary-details-row {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;
	padding: 10px 22px 14px;
	border-top: 1px solid #e8eef2;
	background: #fbfdfe;
}

.summary-detail-item {
	display: flex;
	align-items: center;
	gap: 6px;
	min-width: 0;
	padding: 8px 10px;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #e3ebef;
}

.summary-detail-label {
	font-size: 0.75rem;
	font-weight: 600;
	color: #596879;
}

.summary-detail-value {
	font-size: 0.875rem;
	font-weight: 700;
	color: #253247;
	min-width: 0;
}

.summary-detail-more {
	margin-left: auto;
	height: 24px;
	padding: 0 9px;
	border-radius: 999px;
	border: 1px solid #c9d8df;
	background: #f4f9fb;
	color: #095866;
	font-size: 0.6875rem;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
	cursor: pointer;
	transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.summary-detail-more:hover {
	background: #eaf6f8;
	border-color: #95c4cc;
}

.summary-detail-expand {
	padding: 0 22px 14px;
	border-top: 1px solid #eef3f6;
	background: #fbfdfe;
}

.summary-detail-expand-block {
	padding-top: 10px;
}

.summary-detail-expand-title {
	font-size: 0.75rem;
	font-weight: 700;
	color: #667589;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	margin-bottom: 8px;
}

.summary-detail-pill-wrap {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.summary-detail-pill {
	display: inline-flex;
	align-items: center;
	min-height: 28px;
	padding: 5px 10px;
	border-radius: 10px;
	background: #ffffff;
	border: 1px solid #d9e4ea;
	color: #253247;
	font-size: 0.8125rem;
	font-weight: 600;
	max-width: 100%;
}

.summary-detail-pill-icon {
	width: 14px;
	height: 14px;
	flex-shrink: 0;
	object-fit: contain;
	margin-right: 6px;
}

.summary-detail-pill-text {
	display: inline-block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.summary-detail-truncate {
	display: inline-block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.accordion-content {
	transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	overflow: hidden;
}

@media (max-width: 1024px) {
	.summary-toggle-button {
		padding: 10px 14px 12px;
	}

	.summary-top-row {
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		padding: 8px 14px 0;
	}

	.summary-mini-steps-row {
		display: none;
	}

	.summary-overview-grid {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"packages total"
			"route route";
		gap: 8px;
	}

	.summary-overview-item--packages {
		grid-area: packages;
	}

	.summary-overview-item--dimensions {
		display: none;
	}

	.summary-overview-item--route {
		grid-area: route;
	}

	.summary-overview-total {
		grid-area: total;
		align-items: flex-end;
		justify-content: center;
	}

	.summary-overview-total {
		min-width: 0;
	}

	.summary-details-row {
		grid-template-columns: 1fr;
		padding-inline: 16px;
	}

	.summary-route-warning {
		margin-inline: 16px;
	}

	.summary-detail-expand {
		padding-inline: 16px;
	}
}

@media (max-width: 720px) {
	.summary-sticky-shell {
		position: sticky !important;
		top: calc(env(safe-area-inset-top, 0px) + 6px) !important;
		z-index: 34;
		margin-bottom: 10px;
	}

	.summary-toggle-button {
		padding: 5px 7px 7px;
		grid-template-columns: minmax(0, 1fr) 34px;
		gap: 8px;
	}

	.summary-top-row {
		align-items: center;
		justify-content: space-between;
		gap: 4px;
		min-height: 0;
		padding: 4px 6px 0;
	}

	.summary-top-label {
		font-size: 0.75rem;
	}

	.summary-mini-steps-row {
		display: none;
	}

	.summary-mini-steps-row::-webkit-scrollbar {
		display: none;
	}

	.summary-mini-step {
		flex: 0 0 auto;
		font-size: 0.65625rem;
		padding: 4px 7px;
		scroll-snap-align: start;
	}

	.summary-overview-grid {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"packages total"
			"route route";
		gap: 6px;
	}

	.summary-overview-item,
	.summary-overview-route,
	.summary-overview-total {
		min-height: 24px;
		padding: 4px 6px;
		border-radius: 10px;
	}

	.summary-overview-item--packages {
		grid-area: packages;
	}

	.summary-overview-item--dimensions {
		display: none;
	}

	.summary-overview-item--route {
		grid-area: route;
		display: flex;
	}

	.summary-overview-total {
		grid-area: total;
	}

	.summary-overview-total {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		min-width: 96px;
	}

	.summary-overview-label {
		font-size: 0.5625rem;
	}

	.summary-overview-value {
		font-size: 0.71875rem;
	}

	.summary-overview-total-value {
		font-size: 0.85rem;
	}

	.summary-overview-packages-text,
	.summary-overview-packages-separator,
	.summary-overview-packages-type {
		font-size: 0.75rem;
	}

	.summary-overview-packages-separator,
	.summary-overview-packages-type {
		display: none;
	}

	.summary-package-type-icon-wrap {
		width: 22px;
		height: 22px;
		padding: 1px;
	}

	.summary-package-type-icon {
		height: 15px;
		max-width: 15px;
		max-height: 15px;
	}

	.summary-chevron-wrap {
		width: 34px;
		height: 34px;
		border-radius: 10px;
	}

	.summary-details-row {
		padding: 5px 7px 7px;
		gap: 5px;
	}

	.summary-route-warning {
		margin: 0 8px 6px;
	}

	.summary-detail-expand {
		padding: 0 8px 7px;
	}

	.summary-detail-pill {
		width: 100%;
		min-height: 24px;
		padding: 3px 7px;
		font-size: 0.71875rem;
	}

	.summary-sticky-shell.is-compact-mobile .summary-top-row {
		padding: 4px 8px 0;
	}

	.summary-sticky-shell.is-compact-mobile .summary-top-label {
		font-size: 0.6875rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #5c6b7c;
	}

	.summary-sticky-shell.is-compact-mobile .summary-toggle-button {
		padding: 6px 8px 8px;
		grid-template-columns: minmax(0, 1fr) 32px;
		gap: 6px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-grid {
		gap: 5px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-item,
	.summary-sticky-shell.is-compact-mobile .summary-overview-route,
	.summary-sticky-shell.is-compact-mobile .summary-overview-total {
		min-height: 0;
		padding: 5px 7px;
		border-radius: 9px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-label,
	.summary-sticky-shell.is-compact-mobile .summary-overview-total-label {
		font-size: 0.53125rem;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-value {
		font-size: 0.78125rem;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-total {
		min-width: 86px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-overview-total-value {
		font-size: 0.95rem;
	}

	.summary-sticky-shell.is-compact-mobile .summary-package-type-icon-wrap {
		width: 18px;
		height: 18px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-package-type-icon {
		height: 13px;
		max-width: 13px;
		max-height: 13px;
	}

	.summary-sticky-shell.is-compact-mobile .summary-chevron-wrap {
		width: 32px;
		height: 32px;
		border-radius: 9px;
	}
}
</style>
