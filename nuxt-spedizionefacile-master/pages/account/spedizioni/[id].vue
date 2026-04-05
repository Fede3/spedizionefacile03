<!--
  FILE: pages/account/spedizioni/[id].vue
  SCOPO: Dettaglio ordine — stato, colli, indirizzi, etichetta BRT, link tracking, annullamento e rimborso.

  API: GET /api/orders/{id} (dettaglio ordine), GET /api/brt/label/{orderId} (download PDF etichetta),
       POST /api/brt/create-shipment (rigenera etichetta), POST /api/orders/{id}/cancel (annulla),
       GET /api/orders/{id}/refund-eligibility (verifica idoneita' rimborso),
       POST /api/orders/{id}/add-package (aggiungi collo a ordine in attesa).
  COMPONENTI: SpedizioniOrderPackageCard, SpedizioniAddPackageForm, SpedizioniBrtSection, SpedizioniCancelModal.
  ROUTE: /account/spedizioni/:id (middleware sanctum:auth).

  DATI IN INGRESSO: route.params.id (ID ordine dalla URL).
  DATI IN USCITA: download PDF etichetta, navigazione a /traccia-spedizione?code=XXX.

  VINCOLI: l'etichetta BRT si scarica come blob PDF. La rigenerazione chiama l'API BRT.
           Il rimborso ha una commissione di 2 EUR per ordini gia' in lavorazione.
           Ordini in_transit NON sono rimborsabili.
  COLLEGAMENTI: pages/account/spedizioni/index.vue, pages/traccia-spedizione.vue,
                controllers/OrderController.php, controllers/BrtController.php.
-->
<script setup>
definePageMeta({ middleware: ['app-auth'] });

const route = useRoute();
const orderId = route.params.id;

const {
	order,
	orderStatus,
	orderData,
	orderSubtotalLabel,
	orderRouteLabel,
	orderPackageCountLabel,
	isPendingPayment,
	isCancellable,
	isCancelledOrRefunded,
	formatDate,
	formatPrice,
	paymentMethodLabel,
	showAddPackageForm,
	addingPackage,
	addPackageError,
	addPackageSuccess,
	newPackage,
	submitAddPackage,
	regenerating,
	regenerateError,
	regenerateSuccess,
	downloadLabel,
	regenerateLabel,
	showCancelModal,
	refundEligibility,
	loadingEligibility,
	cancelling,
	cancelError,
	cancelSuccess,
	cancelReason,
	openCancelModal,
	confirmCancellation,
	executionData,
	pickupBusy,
	borderoBusy,
	documentsBusy,
	downloadBorderoBusy,
	executionError,
	executionSuccess,
	requestPickup,
	createBordero,
	sendDocuments,
	downloadBordero,
	openBordero,
} = useOrderDetail(orderId);

useSeoMeta({
	title: () => (orderData.value?.id ? `Ordine #${orderData.value.id} | SpediamoFacile` : 'Dettaglio spedizione | SpediamoFacile'),
	ogTitle: () => (orderData.value?.id ? `Ordine #${orderData.value.id} | SpediamoFacile` : 'Dettaglio spedizione | SpediamoFacile'),
	description: 'Consulta stato, colli, tracking e documenti della tua spedizione su SpediamoFacile.',
	ogDescription: 'Dettaglio ordine con stato, colli, tracking e documenti su SpediamoFacile.',
});

const orderMetaPillStyle = (kind, status = '') => {
	const palette = {
		status: {
			'In attesa': { backgroundColor: '#FFFBEB', color: '#B45309' },
			'In lavorazione': { backgroundColor: '#EFF6FF', color: '#1D4ED8' },
			Completato: { backgroundColor: '#ECFDF3', color: '#047857' },
			Fallito: { backgroundColor: '#FEF2F2', color: '#B91C1C' },
			Pagato: { backgroundColor: '#ECFDF3', color: '#047857' },
			Annullato: { backgroundColor: '#F3F4F6', color: '#4B5563' },
			Rimborsato: { backgroundColor: '#FFF7ED', color: '#C2410C' },
			'In transito': { backgroundColor: '#EEF2FF', color: '#4338CA' },
			Consegnato: { backgroundColor: '#ECFDF3', color: '#047857' },
			'In giacenza': { backgroundColor: '#FFF7ED', color: '#C2410C' },
		},
		packages: { backgroundColor: '#F0F6F7', color: 'var(--color-brand-primary)' },
		total: { backgroundColor: '#FFF5EB', color: 'var(--color-brand-accent)' },
	};

	return palette[kind]?.[status] || palette[kind] || {};
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Loading -->
			<div v-if="orderStatus === 'pending'" class="space-y-[16px]">
				<div class="bg-white rounded-[12px] p-[32px] border border-[var(--color-brand-border)] animate-pulse">
					<div class="h-[24px] bg-gray-200 rounded w-[40%] mb-[16px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[50%]"></div>
				</div>
			</div>

			<template v-else-if="orderData">
				<AccountPageHeader
					eyebrow="Dettaglio spedizione"
					:title="`Ordine #${orderData.id}`"
					:description="'Controlla stato, colli, tracking BRT ed eventuali azioni ancora disponibili per questa spedizione.'"
					:crumbs="[
						{ label: 'Account', to: '/account' },
						{ label: 'Spedizioni', to: '/account/spedizioni' },
						{ label: `Ordine #${orderData.id}` },
					]"
					back-to="/account/spedizioni"
					back-label="Torna alle spedizioni">
					<template #meta>
						<div class="flex flex-wrap gap-[8px]">
							<span class="sf-account-meta-pill" :style="orderMetaPillStyle('status', orderData.status)">{{ orderData.status }}</span>
							<span class="sf-account-meta-pill sf-account-meta-pill--muted" :style="orderMetaPillStyle('packages')">
								{{ orderPackageCountLabel }}
							</span>
							<span class="sf-account-meta-pill" :style="orderMetaPillStyle('total')">{{ orderSubtotalLabel }}</span>
						</div>
					</template>
				</AccountPageHeader>

				<!-- Cancel success/error messages -->
				<div
					v-if="cancelSuccess"
					class="bg-emerald-50 border border-emerald-200 rounded-[12px] px-[16px] py-[14px] flex items-start gap-[12px] mb-[16px]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#059669"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="shrink-0 mt-[1px]">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
					<p class="text-[0.875rem] text-emerald-700 flex-1">{{ cancelSuccess }}</p>
				</div>
				<div
					v-if="cancelError && !showCancelModal"
					class="bg-red-50 border border-red-200 rounded-[12px] px-[16px] py-[14px] flex items-start gap-[12px] mb-[16px]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#EF4444"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="shrink-0 mt-[1px]">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<p class="text-[0.875rem] text-red-700 flex-1">{{ cancelError }}</p>
				</div>

				<!-- Refund info banner -->
				<div
					v-if="isCancelledOrRefunded && orderData.refund_status === 'completed'"
					class="bg-orange-50 border border-orange-200 rounded-[12px] px-[16px] py-[14px] mb-[16px]">
					<div class="flex items-start gap-[12px]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#EA580C"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="shrink-0 mt-[1px]">
							<polyline points="23 4 23 10 17 10" />
							<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
						</svg>
						<div class="flex-1">
							<p class="text-[0.875rem] font-semibold text-orange-800 mb-[6px]">Ordine rimborsato</p>
							<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem] text-orange-700">
								<div>
									<span class="font-medium">Importo rimborsato:</span>
									{{ orderData.refund_amount }}
								</div>
								<div v-if="orderData.cancellation_fee">
									<span class="font-medium">Commissione:</span>
									{{ orderData.cancellation_fee }}
								</div>
								<div>
									<span class="font-medium">Metodo rimborso:</span>
									{{ paymentMethodLabel(orderData.refund_method) }}
								</div>
								<div v-if="orderData.refunded_at">
									<span class="font-medium">Data rimborso:</span>
									{{ orderData.refunded_at }}
								</div>
							</div>
							<p v-if="orderData.refund_reason" class="mt-[6px] text-[0.8125rem] text-orange-600">
								<span class="font-medium">Motivo:</span>
								{{ orderData.refund_reason }}
							</p>
						</div>
					</div>
				</div>

				<!-- Status & Summary -->
				<div class="mb-[16px] rounded-[12px] border border-[var(--color-brand-border)] bg-white p-[18px] tablet:p-[22px]">
					<div class="grid grid-cols-1 gap-[12px] tablet:grid-cols-2 desktop:grid-cols-4">
						<div class="rounded-[12px] border border-[#E9EEF2] bg-[#FBFCFD] px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Tratta</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">{{ orderRouteLabel }}</p>
						</div>
						<div class="rounded-[12px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Creato il</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">{{ formatDate(orderData.created_at) }}</p>
						</div>
						<div class="rounded-[12px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Totale</p>
							<p class="text-[1rem] font-bold leading-[1.2] text-[var(--color-brand-primary)]">{{ orderSubtotalLabel }}</p>
						</div>
						<div class="rounded-[12px] border border-[#E9EEF2] bg-white px-[14px] py-[12px]">
							<p class="mb-[4px] text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#7A8695]">Pagamento</p>
							<p class="text-[0.9375rem] font-semibold leading-[1.35] text-[var(--color-brand-text)]">{{ paymentMethodLabel(orderData.payment_method) }}</p>
						</div>
					</div>
					<div
						v-if="isCancellable && !isCancelledOrRefunded"
						class="mt-[16px] flex flex-col gap-[10px] border-t border-[var(--color-brand-border)] pt-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
						<p class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">
							Per richiedere un rimborso, contatta l'
							<NuxtLink to="/account/assistenza" class="text-[var(--color-brand-primary)] font-semibold underline">assistenza</NuxtLink>
							.
						</p>
						<button type="button" @click="openCancelModal" class="btn-secondary btn-compact inline-flex items-center gap-[6px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor">
								<path
									d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M7,10L12,15L17,10H7Z" />
							</svg>
							Blocca il pacco
						</button>
					</div>
				</div>

				<!-- Packages -->
				<div v-if="orderData.packages?.length" class="space-y-[12px]">
					<SpedizioniOrderPackageCard
						v-for="(pkg, pkgIdx) in orderData.packages"
						:key="pkg.id || pkgIdx"
						:pkg="pkg"
						:index="pkgIdx"
						:has-pudo="!!order?.data?.brt_pudo_id"
						:format-price="formatPrice" />
				</div>

				<!-- Aggiungi collo -->
				<SpedizioniAddPackageForm
					v-if="isPendingPayment"
					:show-form="showAddPackageForm"
					:adding-package="addingPackage"
					:add-package-error="addPackageError"
					:add-package-success="addPackageSuccess"
					:new-package="newPackage"
					@update:show-form="
						showAddPackageForm = $event;
						if ($event) addPackageSuccess = false;
					"
					@submit="submitAddPackage" />

				<!-- BRT Section -->
				<SpedizioniBrtSection
					v-if="!isCancelledOrRefunded"
					:order-data="orderData"
					:regenerating="regenerating"
					:regenerate-error="regenerateError"
					:regenerate-success="regenerateSuccess"
					@download-label="downloadLabel"
					@regenerate-label="regenerateLabel" />

				<SpedizioniExecutionSection
					v-if="!isCancelledOrRefunded"
					:order-data="orderData"
					:execution-data="executionData"
					:pickup-busy="pickupBusy"
					:bordero-busy="borderoBusy"
					:documents-busy="documentsBusy"
					:download-bordero-busy="downloadBorderoBusy"
					:execution-error="executionError"
					:execution-success="executionSuccess"
					:format-date="formatDate"
					@request-pickup="requestPickup"
					@create-bordero="createBordero"
					@send-documents="sendDocuments"
					@download-bordero="downloadBordero"
					@open-bordero="openBordero" />

				<!-- Back -->
				<div class="mt-[24px]">
					<NuxtLink to="/account/spedizioni" class="btn-secondary btn-compact inline-flex items-center gap-[6px]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<line x1="19" y1="12" x2="5" y2="12" />
							<polyline points="12 19 5 12 12 5" />
						</svg>
						Torna alle spedizioni
					</NuxtLink>
				</div>
			</template>

			<!-- Not found -->
			<div v-else class="bg-white rounded-[12px] p-[48px] border border-[var(--color-brand-border)] text-center">
				<p class="text-[1rem] text-[var(--color-brand-text-secondary)]">Ordine non trovato.</p>
				<NuxtLink to="/account/spedizioni" class="btn-secondary btn-compact mt-[16px] inline-flex items-center gap-[6px]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round">
						<line x1="19" y1="12" x2="5" y2="12" />
						<polyline points="12 19 5 12 12 5" />
					</svg>
					Torna alle spedizioni
				</NuxtLink>
			</div>

			<!-- Cancel Modal -->
			<SpedizioniCancelModal
				:show="showCancelModal"
				:loading-eligibility="loadingEligibility"
				:refund-eligibility="refundEligibility"
				:cancelling="cancelling"
				:cancel-error="cancelError"
				:cancel-reason="cancelReason"
				:order-subtotal="orderData?.subtotal || ''"
				:payment-method-label="paymentMethodLabel"
				@update:show="showCancelModal = $event"
				@update:cancel-reason="cancelReason = $event"
				@confirm="confirmCancellation" />
		</div>
	</section>
</template>
