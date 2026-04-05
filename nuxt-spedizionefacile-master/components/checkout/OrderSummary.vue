<!--
  Order summary: packages list, totals, coupon panel.
  All data comes from the parent via useCheckout() composable bindings.
-->
<script setup>
import { formatEuro } from '~/utils/price.js';

const props = defineProps({
	displayPackages: { type: Array, required: true },
	addressGroups: { type: Array, required: true },
	hasMultipleGroups: { type: Boolean, default: false },
	mergeGroupsCount: { type: Number, default: 0 },
	totalPackages: { type: Number, required: true },
	contentDescription: { type: String, default: '' },
	existingOrderId: { type: [String, Number, null], default: null },
	getTotal: { type: String, required: true },
	finalTotalFormatted: { type: String, required: true },
	formatPrice: { type: Function, required: true },
	promoSettings: { type: Object, default: null },
	/* coupon */
	couponCode: { type: String, default: '' },
	couponLoading: { type: Boolean, default: false },
	couponError: { type: String, default: '' },
	couponApplied: { type: Object, default: null },
	couponPanelOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['update:couponCode', 'update:couponPanelOpen', 'validate-coupon', 'remove-coupon']);

const localCouponCode = computed({
	get: () => props.couponCode,
	set: (v) => emit('update:couponCode', v),
});

const localCouponPanelOpen = computed({
	get: () => props.couponPanelOpen,
	set: (v) => emit('update:couponPanelOpen', v),
});

const submitCoupon = () => {
	if (!localCouponCode.value?.trim() || props.couponLoading) return;
	emit('validate-coupon');
};
</script>

<template>
	<div class="checkout-stage-card checkout-order-summary-card checkout-motion-card [--checkout-delay:0ms] sf-section-block">
		<!-- Header -->
		<div class="checkout-order-summary__head sf-section-block__header">
			<div class="checkout-panel-head">
				<span class="checkout-panel-head__icon">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round">
						<rect x="1" y="3" width="22" height="18" rx="2" />
						<path d="M1 9h22" />
					</svg>
				</span>
				<div class="checkout-panel-head__copy">
					<p class="checkout-panel-head__title">{{ displayPackages.length <= 1 ? 'Riepilogo ordine' : 'Riepilogo ordini' }}</p>
					<p class="checkout-panel-head__text">
						{{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }}
						<span v-if="contentDescription">&middot; {{ contentDescription }}</span>
					</p>
				</div>
			</div>
			<NuxtLink
				v-if="!existingOrderId"
				to="/carrello"
				class="btn-secondary btn-compact inline-flex items-center gap-[6px] checkout-order-summary__edit">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
				</svg>
				Modifica
			</NuxtLink>
			<span v-else class="checkout-order-summary__order-id sf-section-chip">Ordine #{{ existingOrderId }}</span>
		</div>

		<!-- Merge info banner -->
		<div
			v-if="!existingOrderId && hasMultipleGroups"
			class="checkout-order-summary__banner checkout-order-summary__banner--split ux-alert ux-alert--info">
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#095866"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0">
				<path d="M16 3h5v5" />
				<path d="M4 20L21 3" />
				<path d="M21 16v5h-5" />
				<path d="M15 15l6 6" />
				<path d="M4 4l5 5" />
			</svg>
			<p class="text-[0.8125rem] text-[#095866] font-medium">
				Verranno creati
				<span class="font-bold">{{ mergeGroupsCount }} ordini separati</span>
				in base agli indirizzi. I pacchi con stessi indirizzi saranno uniti in una singola spedizione.
			</p>
		</div>
		<div
			v-else-if="!existingOrderId && addressGroups.some((g) => g.count > 1)"
			class="checkout-order-summary__banner checkout-order-summary__banner--merged ux-alert ux-alert--success">
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#059669"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0">
				<polyline points="9 11 12 14 22 4" />
				<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
			</svg>
			<p class="text-[0.8125rem] text-emerald-700 font-medium">
				Tutti i pacchi hanno gli stessi indirizzi e verranno spediti come un'unica spedizione multi-collo.
			</p>
		</div>

		<!-- Package cards -->
		<div class="space-y-[14px] mb-[20px]">
			<div v-for="(pkg, pkgIdx) in displayPackages" :key="pkg.id || pkgIdx" class="checkout-order-summary__package">
				<!-- Package header row -->
				<div class="flex flex-wrap items-start gap-[8px] mb-[14px]">
					<div class="flex items-center gap-[8px] min-w-0 flex-1">
						<span class="sf-section-chip">{{ pkgIdx + 1 }}</span>
						<span class="text-[0.9375rem] font-semibold text-[#252B42]">{{ pkg.package_type || 'Pacco' }}</span>
						<span
							v-if="pkg.content_description"
							class="text-[0.75rem] text-[#737373] bg-[#F5F5F5] px-[8px] py-[2px] rounded-[4px] max-w-[150px] tablet:max-w-[240px] truncate">
							{{ pkg.content_description }}
						</span>
					</div>
					<span
						class="text-[1.0625rem] font-bold text-[#095866] shrink-0 ml-auto"
						:title="
							'Prezzo unitario per questo collo: ' +
							formatPrice(pkg.single_price) +
							(pkg.quantity > 1 ? ' x ' + pkg.quantity + ' = ' + formatPrice(pkg.single_price * pkg.quantity) : '')
						">
						{{ formatPrice(pkg.single_price) }}
					</span>
				</div>

				<!-- Package specs -->
				<div class="flex flex-wrap gap-[8px] mb-[14px]">
					<span
						class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
						:title="'Peso del pacco: ' + pkg.weight + ' chilogrammi'">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#737373"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 6v6l4 2" />
						</svg>
						<span class="font-medium">{{ pkg.weight }} kg</span>
					</span>
					<span
						class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
						:title="
							'Dimensioni: larghezza ' + pkg.first_size + ' cm x altezza ' + pkg.second_size + ' cm x profondità ' + pkg.third_size + ' cm'
						">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#737373"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="2" y="7" width="20" height="14" rx="2" />
							<path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
						</svg>
						<span class="font-medium">{{ pkg.first_size }}&times;{{ pkg.second_size }}&times;{{ pkg.third_size }} cm</span>
					</span>
					<span
						v-if="(pkg.quantity || 1) > 1"
						class="inline-flex items-center gap-[4px] bg-[#F5F5F5] text-[0.8125rem] text-[#252B42] px-[10px] py-[5px] rounded-[6px]"
						title="Numero di colli identici in questa spedizione">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#737373"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="2" y="2" width="8" height="8" rx="1" />
							<rect x="14" y="2" width="8" height="8" rx="1" />
							<rect x="2" y="14" width="8" height="8" rx="1" />
							<rect x="14" y="14" width="8" height="8" rx="1" />
						</svg>
						<span class="font-medium">Qtà: {{ pkg.quantity }}</span>
					</span>
				</div>

				<!-- Addresses -->
				<div v-if="pkg.origin_address || pkg.destination_address" class="border-t border-[#F0F0F0] pt-[14px] mb-[14px]">
					<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[12px]">
						<div v-if="pkg.origin_address" class="flex gap-[10px]">
							<div
								class="w-[32px] h-[32px] bg-[#095866]/10 rounded-[12px] flex items-center justify-center shrink-0 mt-[2px]"
								title="Indirizzo del mittente">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#095866"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<circle cx="12" cy="10" r="3" />
									<path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[0.75rem] font-semibold text-[#095866] uppercase tracking-wider mb-[2px]">Da:</p>
								<p class="text-[0.8125rem] font-medium text-[#252B42] leading-snug">{{ pkg.origin_address.name }}</p>
								<p class="text-[0.8125rem] text-[#737373] leading-snug">
									{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }}
								</p>
								<p class="text-[0.8125rem] text-[#737373] leading-snug">
									{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})
								</p>
							</div>
						</div>
						<div v-if="pkg.destination_address" class="flex gap-[10px]">
							<div
								class="w-[32px] h-[32px] bg-[#E44203]/10 rounded-[12px] flex items-center justify-center shrink-0 mt-[2px]"
								title="Indirizzo del destinatario">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#E44203"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<circle cx="12" cy="10" r="3" />
									<path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[0.75rem] font-semibold text-[#E44203] uppercase tracking-wider mb-[2px]">A:</p>
								<p class="text-[0.8125rem] font-medium text-[#252B42] leading-snug">{{ pkg.destination_address.name }}</p>
								<p class="text-[0.8125rem] text-[#737373] leading-snug">
									{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }}
								</p>
								<p class="text-[0.8125rem] text-[#737373] leading-snug">
									{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Services & Pickup date -->
				<div
					v-if="pkg.services && ((pkg.services.service_type && pkg.services.service_type !== 'Nessuno') || pkg.services.date)"
					class="border-t border-[#F0F0F0] pt-[12px] flex flex-wrap items-center gap-[12px]">
					<span
						v-if="pkg.services.service_type && pkg.services.service_type !== 'Nessuno'"
						class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#252B42]"
						title="Servizio aggiuntivo selezionato per questa spedizione">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#095866"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<polyline points="9 11 12 14 22 4" />
							<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
						</svg>
						<span class="font-medium">{{ pkg.services.service_type }}</span>
					</span>
					<span
						v-if="pkg.services.date"
						class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#252B42]"
						title="Data programmata per il ritiro del pacco">
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#095866"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						<span class="font-medium">Ritiro: {{ pkg.services.date }}</span>
					</span>
				</div>
			</div>
		</div>

		<!-- Totals summary -->
		<div class="checkout-order-summary__totals">
			<!-- Subtotal -->
			<div class="flex items-center justify-between py-[8px]">
				<span class="text-[0.9375rem] text-[#737373]">
					Subtotale ({{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }})
				</span>
				<span class="text-[0.9375rem] font-medium text-[#252B42]">{{ getTotal }}</span>
			</div>

			<!-- Discount row -->
			<div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-t border-[#F0F0F0]">
				<span
					class="text-[0.9375rem] text-emerald-700 flex items-center gap-[6px]"
					:title="'Sconto ' + couponApplied.discount_percent + '% applicato con il codice ' + couponApplied.code">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="#059669"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round">
						<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
						<line x1="7" y1="7" x2="7.01" y2="7" />
					</svg>
					Sconto {{ couponApplied.discount_percent }}% ({{ couponApplied.code }})
				</span>
				<span class="text-[0.9375rem] font-semibold text-emerald-700">-{{ formatEuro(couponApplied.discount_amount) }}&euro;</span>
			</div>

			<!-- Divider -->
			<div class="border-t-2 border-[#E9EBEC] mt-[4px] mb-[4px]"></div>

			<!-- Final total -->
			<div class="flex items-center justify-between py-[8px]">
				<div class="flex items-center gap-[8px]">
					<span class="text-[1.0625rem] font-bold text-[#252B42]">Totale da pagare</span>
					<span
						v-if="promoSettings?.active && promoSettings?.label_text"
						:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
						class="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-[6px] text-white text-[0.6875rem] font-bold tracking-wide sf-section-chip">
						<img
							v-if="promoSettings.label_image"
							:src="promoSettings.label_image"
							alt=""
							loading="lazy"
							decoding="async"
							width="24"
							height="12"
							class="h-[12px] w-auto" />
						{{ promoSettings.label_text }}
					</span>
				</div>
				<span
					class="text-[1.25rem] font-bold text-[#095866]"
					:title="
						couponApplied
							? `Totale originale: ${getTotal} - Sconto: ${formatEuro(couponApplied.discount_amount)}€ = ${finalTotalFormatted}`
							: 'Totale ordine IVA inclusa'
					">
					{{ finalTotalFormatted }}
				</span>
			</div>

			<!-- Coupon section -->
			<div class="mt-[12px] border-t border-[#F0F0F0] pt-[12px]">
				<div class="flex flex-col tablet:flex-row tablet:items-start tablet:justify-between gap-[10px]">
					<div class="min-w-0">
						<p class="text-[0.875rem] font-medium text-[#252B42]">Codice promozionale o referral</p>
						<p class="text-[0.75rem] text-[#6B7280] leading-[1.5]">
							Invio o uscita dal campo per verificare il codice. Nessun pulsante aggiuntivo.
						</p>
					</div>
					<button
						type="button"
						@click="localCouponPanelOpen = !localCouponPanelOpen"
						class="btn-secondary btn-compact inline-flex items-center gap-[6px] checkout-coupon-toggle">
						<span>{{ couponApplied ? 'Codice attivo' : localCouponPanelOpen ? 'Nascondi codice' : 'Hai un codice?' }}</span>
						<svg
							:class="localCouponPanelOpen ? 'rotate-180' : ''"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="transition-transform duration-200 shrink-0">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>
				</div>

				<Transition name="payment-panel">
					<div v-if="localCouponPanelOpen" class="mt-[12px]">
						<div v-if="couponApplied" class="checkout-coupon-applied ux-alert ux-alert--success">
							<div class="flex items-start gap-[10px] min-w-0 flex-1">
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#059669"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mt-[2px] shrink-0">
									<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
									<line x1="7" y1="7" x2="7.01" y2="7" />
								</svg>
								<div class="min-w-0">
									<p class="text-[0.875rem] font-semibold text-emerald-800">Codice {{ couponApplied.code }} applicato</p>
									<p class="text-[0.75rem] text-emerald-700 leading-[1.5]">
										Sconto del {{ couponApplied.discount_percent }}% già incluso nel totale.
									</p>
								</div>
							</div>
							<button type="button" @click="emit('remove-coupon')" class="btn-secondary btn-compact checkout-coupon-remove">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
								Rimuovi
							</button>
						</div>
						<div v-else class="checkout-coupon-row">
							<input
								v-model="localCouponCode"
								type="text"
								placeholder="Inserisci o incolla il codice"
								maxlength="20"
								class="checkout-coupon-input form-input"
								@keyup.enter.prevent="submitCoupon"
								@blur="submitCoupon" />
						</div>
						<div class="min-h-[20px] mt-[8px]">
							<p v-if="couponLoading" class="checkout-coupon-hint ux-alert ux-alert--info">Verifica del codice in corso...</p>
							<p v-else-if="couponError" class="checkout-coupon-error ux-alert ux-alert--critical">{{ couponError }}</p>
						</div>
					</div>
				</Transition>
			</div>
		</div>
	</div>
</template>

<style scoped>
.payment-panel-enter-active,
.payment-panel-leave-active {
	transition:
		opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
		transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.payment-panel-enter-from,
.payment-panel-leave-to {
	opacity: 0;
	transform: translateY(8px);
}
</style>
