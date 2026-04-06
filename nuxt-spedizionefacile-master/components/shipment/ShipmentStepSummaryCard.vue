<script setup>
const props = defineProps({
	canExpandSummaryDimensions: { type: Boolean, default: false },
	canExpandSummaryServices: { type: Boolean, default: false },
	detailPanel: { type: String, default: null },
	expanded: { type: Boolean, default: false },
	routeWarningMessage: { type: String, default: '' },
	showMiniSteps: { type: Boolean, default: false },
	compactMobile: { type: Boolean, default: false },
	summaryDestinationCity: { type: String, default: '—' },
	summaryDimensionsItems: { type: Array, default: () => [] },
	summaryDimensionsLabel: { type: String, default: '—' },
	summaryMiniSteps: { type: Array, default: () => [] },
	summaryOriginCity: { type: String, default: '—' },
	summaryPackageLabel: { type: String, default: '0 colli' },
	summaryPackageTypeInfo: {
		type: Object,
		default: () => ({ icon: '/img/quote/first-step/pack.png', label: 'Pacco' }),
	},
	summaryRouteLabel: { type: String, default: '—' },
	summaryServicesItems: { type: Array, default: () => [] },
	summaryServicesLabel: { type: String, default: 'Nessun servizio' },
	summaryTotalPrice: { type: String, default: '0,00' },
});

const emit = defineEmits(['go-mini-step', 'toggle-detail-panel', 'update:expanded']);

const onAccordionEnter = (el) => { el.style.height = '0'; el.style.overflow = 'hidden'; };
const onAccordionAfterEnter = (el) => { el.style.height = 'auto'; el.style.overflow = 'visible'; };
const onAccordionLeave = (el) => {
	el.style.height = `${el.scrollHeight}px`;
	el.style.overflow = 'hidden';
	requestAnimationFrame(() => { el.style.height = '0'; });
};

const toggleExpanded = () => emit('update:expanded', !props.expanded);
const toggleDetailPanel = (panel) => emit('toggle-detail-panel', panel);
const goToMiniStep = (step) => emit('go-mini-step', step);
</script>

<template>
	<div
		class="z-30 mb-[20px] font-montserrat summary-sticky-shell sticky top-[calc(env(safe-area-inset-top,0px)+8px)]"
		:class="{ 'is-compact-mobile': compactMobile }">
		<div class="summary-sticky-card sf-surface-card bg-white rounded-[14px]">
			<div class="summary-header-main">
				<div v-if="showMiniSteps" class="summary-top-row">
					<div class="summary-mini-steps-row">
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
									<img :src="summaryPackageTypeInfo.icon" :alt="summaryPackageTypeInfo.label" :title="`Tipologia collo: ${summaryPackageTypeInfo.label}`" loading="lazy" decoding="async" class="summary-package-type-icon" />
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
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="summary-chevron-icon flex-shrink-0" :class="{ 'is-open': expanded }">
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
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
							</svg>
							<span class="summary-detail-label">Da</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryOriginCity }} → {{ summaryDestinationCity }}</span>
						</div>
						<div class="summary-detail-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2">
								<path d="M4 20h16M6 20V8m12 12V8M6 8h12M10 8v4m4-4v4"/>
							</svg>
							<span class="summary-detail-label">Misure</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryDimensionsLabel }}</span>
							<button v-if="canExpandSummaryDimensions" type="button" class="summary-detail-more" @click.stop="toggleDetailPanel('dimensions')">
								{{ detailPanel === 'dimensions' ? 'Chiudi' : 'Vedi' }}
							</button>
						</div>
						<div class="summary-detail-item">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2">
								<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>
							</svg>
							<span class="summary-detail-label">Servizi</span>
							<span class="summary-detail-value summary-detail-truncate">{{ summaryServicesLabel }}</span>
							<button v-if="canExpandSummaryServices" type="button" class="summary-detail-more" @click.stop="toggleDetailPanel('services')">
								{{ detailPanel === 'services' ? 'Chiudi' : 'Vedi' }}
							</button>
						</div>
					</div>

					<div v-if="detailPanel" class="summary-detail-expand">
						<div v-if="detailPanel === 'dimensions'" class="summary-detail-expand-block">
							<p class="summary-detail-expand-title">Tutte le misure collo</p>
							<div class="summary-detail-pill-wrap">
								<span v-for="(item, idx) in summaryDimensionsItems" :key="`summary-dim-${idx}`" class="summary-detail-pill">
									<NuxtImg v-if="item.icon" :src="item.icon" :alt="item.type || 'Tipo collo'" width="14" height="14" loading="lazy" decoding="async" class="summary-detail-pill-icon" />
									<span class="summary-detail-pill-text">{{ item.label }}</span>
								</span>
							</div>
						</div>
						<div v-else-if="detailPanel === 'services'" class="summary-detail-expand-block">
							<p class="summary-detail-expand-title">Servizi selezionati</p>
							<div class="summary-detail-pill-wrap">
								<span v-for="(item, idx) in summaryServicesItems" :key="`summary-service-${idx}`" class="summary-detail-pill">
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
