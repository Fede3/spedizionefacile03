<!--
  FILE: pages/account/spedizioni/index.vue
  SCOPO: Lista ordini utente — filtro per stato, pagamento in sospeso, annullamento, salva come configurata.

  API: GET /api/orders (lista ordini), POST /api/orders/{id}/cancel (annulla ordine),
       POST /api/saved-shipments (salva configurazione), GET /api/saved-shipments (lista salvate).
  COMPONENTI: SpedizioniOrderCard, SpedizioniDetailModal.
  ROUTE: /account/spedizioni (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (carica tutti gli ordini dell'utente autenticato).
  DATI IN USCITA: navigazione a /account/spedizioni/{id}, /checkout?order_id={id}.
  COLLEGAMENTI: pages/account/spedizioni/[id].vue, pages/checkout.vue, controllers/OrderController.php.
-->
<script setup>
definePageMeta({ middleware: ["app-auth"] });

const {
	filters, activeFilter, textFilter, changeFilter,
	ordersStatus, filteredOrders,
	statusRaw, statusColor,
	formatPrice, getRouteLabel, getServiceLabel,
	getSenderName, getRecipientName, getOrderSubtotalLabel, getOrderDateLabel, getOrderPackageLabel,
	isPendingPayment, getPendingReason, orderStats,
	showDetail, detailItem,
	saveError, isAlreadySaved, saveToConfigured, savingToConfigured,
} = useOrdersList();
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Spedizioni" title="Le tue spedizioni"
				description="Rivedi gli ordini, controlla gli stati e riapri rapidamente le spedizioni gia' configurate."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Spedizioni' }]"
			>
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span class="inline-flex items-center gap-[6px] rounded-full bg-[#095866]/10 px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">{{ orderStats.total }} spedizioni</span>
						<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">{{ orderStats.open }} aperte</span>
						<span class="inline-flex items-center gap-[6px] rounded-full bg-[#FFF5EB] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#E44203]">{{ orderStats.pending }} da pagare</span>
					</div>
				</template>
			</AccountPageHeader>

			<!-- Filters -->
			<div class="mb-[20px] rounded-[20px] border border-[#E9EBEC] bg-white px-[16px] py-[16px] shadow-sm tablet:px-[20px] tablet:py-[18px]">
				<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="max-w-[540px]">
						<p class="text-[0.8125rem] font-semibold uppercase tracking-[0.8px] text-[#095866]">Filtri rapidi</p>
						<p class="mt-[4px] text-[0.875rem] leading-[1.5] text-[#737373]">Scorri gli stati piu' utili e mantieni il focus sulle spedizioni davvero attive.</p>
					</div>
					<div class="flex w-full flex-col gap-[10px] desktop:w-auto desktop:items-end">
						<div class="flex w-full gap-[8px] overflow-x-auto pb-[2px] -mx-[2px] px-[2px] desktop:w-auto desktop:flex-wrap desktop:overflow-visible desktop:px-0 desktop:mx-0">
							<button v-for="(filter, filterIndex) in filters" :key="filterIndex"
								@click="changeFilter(filter, filterIndex)" type="button"
								:class="filterIndex === activeFilter ? 'bg-[#095866] text-white shadow-[0_6px_18px_rgba(9,88,102,0.18)]' : 'bg-[#F3F5F6] text-[#737373] hover:bg-[#E7ECEE]'"
								class="shrink-0 whitespace-nowrap px-[16px] py-[10px] rounded-[30px] text-[0.875rem] font-medium cursor-pointer transition-colors">
								{{ filter }}
							</button>
						</div>
						<span class="inline-flex items-center rounded-full bg-[#F3F7F9] px-[10px] py-[4px] text-[0.75rem] font-semibold text-[#6B7280]">{{ filteredOrders.length }} risultati</span>
					</div>
				</div>
			</div>

			<!-- Loading -->
			<div v-if="ordersStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] animate-pulse">
					<div class="flex items-center gap-[16px]">
						<div class="w-[44px] h-[44px] rounded-[50px] bg-gray-200"></div>
						<div class="flex-1 space-y-[8px]">
							<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
							<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Orders list -->
			<div v-else-if="filteredOrders.length > 0" class="space-y-[14px]">
				<SpedizioniOrderCard
					v-for="order in filteredOrders" :key="order.id"
					:order="order"
					:status-color="statusColor" :status-raw="statusRaw"
					:get-order-package-label="getOrderPackageLabel" :get-service-label="getServiceLabel"
					:get-order-date-label="getOrderDateLabel" :get-order-subtotal-label="getOrderSubtotalLabel"
					:get-route-label="getRouteLabel" :get-sender-name="getSenderName" :get-recipient-name="getRecipientName"
					:is-pending-payment="isPendingPayment" :get-pending-reason="getPendingReason"
					:is-already-saved="isAlreadySaved" :saving-to-configured="savingToConfigured" :save-error="saveError"
					@save-to-configured="saveToConfigured"
				/>
			</div>

			<!-- Empty state -->
			<div v-else class="bg-white rounded-[20px] p-[48px] border border-[#E9EBEC] shadow-sm text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F0F6F7] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.</p>
				<NuxtLink to="/preventivo" class="btn-primary inline-flex items-center gap-[6px] text-[0.9375rem]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>

		<!-- Detail popup -->
		<SpedizioniDetailModal v-model:open="showDetail" :detail-item="detailItem" :format-price="formatPrice" />
	</section>
</template>
