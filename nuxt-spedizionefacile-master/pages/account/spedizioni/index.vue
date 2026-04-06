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

useSeoMeta({
	title: 'Le tue Spedizioni — Il tuo Account | SpedizioneFacile',
	description: 'Consulta lo storico delle tue spedizioni, controlla lo stato degli ordini e gestisci le spedizioni configurate.',
	ogTitle: 'Le tue Spedizioni — Il tuo Account | SpedizioneFacile',
	ogDescription: 'Consulta lo storico delle tue spedizioni, controlla lo stato degli ordini e gestisci le spedizioni configurate.',
});

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
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<!-- Page shell header -->
			<div class="flex flex-col gap-[16px] tablet:gap-[16px] mb-[20px]">
				<NuxtLink to="/account"
					class="flex items-center gap-[6px] text-[var(--color-brand-text-muted)] text-[13px] cursor-pointer hover:text-[var(--color-brand-text-secondary)] transition-colors duration-[350ms] font-[500]">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
					Dashboard
				</NuxtLink>
				<div class="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[12px]">
					<div class="flex items-center gap-[16px]">
						<div class="w-[48px] h-[48px] rounded-[14px] bg-[rgba(228,66,3,0.08)] flex items-center justify-center shrink-0">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="#E44203"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/></svg>
						</div>
						<div>
							<h1 class="text-[var(--color-brand-text)] text-[24px] tablet:text-[28px] tracking-[-0.5px] font-[800]">Le tue spedizioni</h1>
							<p class="text-[var(--color-brand-text-muted)] text-[13px] tablet:text-[14px] mt-[2px]">Storico, tracking e gestione</p>
						</div>
					</div>
					<!-- Stats pills -->
					<div class="flex items-center gap-[8px]">
						<div class="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[12px] font-[700]" style="background: rgba(228,66,3,0.07); color: #E44203;">
							<svg width="13" height="13" viewBox="0 0 24 24" fill="#E44203"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5Z"/></svg>
							{{ orderStats.total }} totali
						</div>
						<div class="flex items-center gap-[6px] px-[12px] py-[6px] rounded-full text-[12px] font-[700]" style="background: rgba(9,88,102,0.07); color: #095866;">
							{{ orderStats.open }} aperte
						</div>
					</div>
				</div>
			</div>

			<!-- Filters (prototype-style tabs) -->
			<div class="mb-[16px] flex gap-[4px] bg-[#F5F6F9] rounded-[16px] p-[4px]"
				style="box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
				<button v-for="(filter, filterIndex) in filters" :key="filterIndex"
					@click="changeFilter(filter, filterIndex)" type="button"
					:class="filterIndex === activeFilter
						? 'bg-white text-[var(--color-brand-text)] shadow-[0_1px_4px_rgba(0,0,0,0.06)] font-[700]'
						: 'text-[var(--color-brand-text-muted)] hover:text-[var(--color-brand-text-secondary)] font-[500]'"
					class="flex-1 h-[42px] rounded-[12px] text-[13px] cursor-pointer transition-all duration-[350ms] capitalize">
					{{ filter }}
				</button>
			</div>

			<!-- Loading -->
			<div v-if="ordersStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[20px] border border-[var(--color-brand-border)] p-[20px_24px] animate-pulse">
					<div class="flex items-center gap-[16px]">
						<div class="w-[44px] h-[44px] rounded-full bg-gray-200"></div>
						<div class="flex-1 space-y-[8px]">
							<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
							<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Orders list -->
			<div v-else-if="filteredOrders.length > 0" class="space-y-[16px]">
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

			<!-- Empty state (prototype-style) -->
			<div v-else class="flex flex-col items-center justify-center py-[40px] text-center">
				<div class="w-[48px] h-[48px] rounded-[14px] bg-[#F5F6F9] flex items-center justify-center mb-[12px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#999"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/></svg>
				</div>
				<p class="text-[var(--color-brand-text-muted)] text-[14px] font-[500] mb-[16px]">Nessuna spedizione trovata</p>
				<NuxtLink to="/preventivo"
					class="h-[44px] px-[20px] rounded-full text-white text-[14px] font-[700] inline-flex items-center gap-[7px] cursor-pointer"
					style="background: #E44203; box-shadow: 0 4px 14px rgba(228,66,3,0.25);">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Nuova spedizione
				</NuxtLink>
			</div>
		</div>

		<!-- Detail popup -->
		<SpedizioniDetailModal v-model:open="showDetail" :detail-item="detailItem" :format-price="formatPrice" />
	</section>
</template>
