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
	<div class="checkout-stage-card checkout-order-summary-card checkout-motion-card [--checkout-delay:0ms]">
		<!-- Header -->
		<div class="checkout-order-summary__head">
			<div class="checkout-panel-head" style="margin-bottom:0">
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
				class="inline-flex items-center gap-[5px] h-[32px] px-[12px] rounded-full bg-white text-[12px] text-[var(--color-brand-text-secondary)] checkout-order-summary__edit"
				style="font-weight:600; outline: 1.5px solid #DFE2E7; outline-offset: -1.5px">
				<svg
					width="12"
					height="12"
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
			<span v-else class="checkout-order-summary__order-id">Ordine #{{ existingOrderId }}</span>
		</div>

		<!-- Merge info banner -->
		<div
			v-if="!existingOrderId && hasMultipleGroups"
			class="checkout-order-summary__banner checkout-order-summary__banner--split">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-brand-primary)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0 mt-[1px]">
				<path d="M16 3h5v5" />
				<path d="M4 20L21 3" />
				<path d="M21 16v5h-5" />
				<path d="M15 15l6 6" />
				<path d="M4 4l5 5" />
			</svg>
			<p class="text-[13px] text-[var(--color-brand-primary)]" style="font-weight:500">
				Verranno creati
				<span style="font-weight:700">{{ mergeGroupsCount }} ordini separati</span>
				in base agli indirizzi. I pacchi con stessi indirizzi saranno uniti in una singola spedizione.
			</p>
		</div>
		<div
			v-else-if="!existingOrderId && addressGroups.some((g) => g.count > 1)"
			class="checkout-order-summary__banner checkout-order-summary__banner--merged">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="#059669"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="shrink-0 mt-[1px]">
				<polyline points="9 11 12 14 22 4" />
				<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
			</svg>
			<p class="text-[13px] text-[#0a8a7a]" style="font-weight:500">
				Tutti i pacchi hanno gli stessi indirizzi e verranno spediti come un'unica spedizione multi-collo.
			</p>
		</div>

		<!-- Package cards -->
		<div class="space-y-[10px] mb-[18px]">
			<div v-for="(pkg, pkgIdx) in displayPackages" :key="pkg.id || pkgIdx" class="checkout-order-summary__package">
				<!-- Package header row -->
				<div class="flex flex-wrap items-start gap-[8px] mb-[12px]">
					<div class="flex items-center gap-[8px] min-w-0 flex-1">
						<span class="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#F8F9FB] text-[12px] text-[var(--color-brand-text-secondary)] shrink-0"
							style="font-weight:700; outline: 1px solid #DFE2E7; outline-offset:-1px">
							{{ pkgIdx + 1 }}
						</span>
						<span class="text-[15px] text-[var(--color-brand-text)]" style="font-weight:700">{{ pkg.package_type || 'Pacco' }}</span>
						<span
							v-if="pkg.content_description"
							class="text-[12px] text-[var(--color-brand-text-secondary)] bg-[#F8F9FB] px-[8px] py-[2px] rounded-full max-w-[150px] tablet:max-w-[240px] truncate"
							style="outline: 1px solid #DFE2E7; outline-offset:-1px; font-weight:500">
							{{ pkg.content_description }}
						</span>
					</div>
					<span
						class="text-[16px] text-[var(--color-brand-primary)] shrink-0 ml-auto"
						style="font-weight:700"
						:title="
							'Prezzo unitario per questo collo: ' +
							formatPrice(pkg.single_price) +
							(pkg.quantity > 1 ? ' x ' + pkg.quantity + ' = ' + formatPrice(pkg.single_price * pkg.quantity) : '')
						">
						{{ formatPrice(pkg.single_price) }}
					</span>
				</div>

				<!-- Package specs -->
				<div class="flex flex-wrap gap-[6px] mb-[12px]">
					<span
						class="inline-flex items-center gap-[4px] bg-[#F8F9FB] text-[12px] text-[var(--color-brand-text)] px-[10px] py-[5px] rounded-[8px]"
						style="font-weight:500; outline: 1px solid #DFE2E7; outline-offset:-1px"
						:title="'Peso del pacco: ' + pkg.weight + ' chilogrammi'">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#999"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 6v6l4 2" />
						</svg>
						{{ pkg.weight }} kg
					</span>
					<span
						class="inline-flex items-center gap-[4px] bg-[#F8F9FB] text-[12px] text-[var(--color-brand-text)] px-[10px] py-[5px] rounded-[8px]"
						style="font-weight:500; outline: 1px solid #DFE2E7; outline-offset:-1px"
						:title="
							'Dimensioni: larghezza ' + pkg.first_size + ' cm x altezza ' + pkg.second_size + ' cm x profondità ' + pkg.third_size + ' cm'
						">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#999"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="2" y="7" width="20" height="14" rx="2" />
							<path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
						</svg>
						{{ pkg.first_size }}&times;{{ pkg.second_size }}&times;{{ pkg.third_size }} cm
					</span>
					<span
						v-if="(pkg.quantity || 1) > 1"
						class="inline-flex items-center gap-[4px] bg-[#F8F9FB] text-[12px] text-[var(--color-brand-text)] px-[10px] py-[5px] rounded-[8px]"
						style="font-weight:500; outline: 1px solid #DFE2E7; outline-offset:-1px"
						title="Numero di colli identici in questa spedizione">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#999"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="2" y="2" width="8" height="8" rx="1" />
							<rect x="14" y="2" width="8" height="8" rx="1" />
							<rect x="2" y="14" width="8" height="8" rx="1" />
							<rect x="14" y="14" width="8" height="8" rx="1" />
						</svg>
						Qtà: {{ pkg.quantity }}
					</span>
				</div>

				<!-- Addresses -->
				<div v-if="pkg.origin_address || pkg.destination_address" class="border-t border-[#EEF0F3] pt-[12px] mb-[12px]">
					<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[10px]">
						<div v-if="pkg.origin_address" class="flex gap-[8px]">
							<div class="w-[5px] h-[5px] rounded-full bg-[#E44203] mt-[7px] shrink-0" title="Mittente"></div>
							<div class="min-w-0">
								<p class="text-[13px] text-[var(--color-brand-text)] leading-snug" style="font-weight:600">{{ pkg.origin_address.name }}</p>
								<p class="text-[12px] text-[var(--color-brand-text-secondary)] leading-snug" style="font-weight:400">
									{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }},
									{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})
								</p>
							</div>
						</div>
						<div v-if="pkg.destination_address" class="flex gap-[8px]">
							<div class="w-[5px] h-[5px] rounded-full bg-[var(--color-brand-primary)] mt-[7px] shrink-0" title="Destinatario"></div>
							<div class="min-w-0">
								<p class="text-[13px] text-[var(--color-brand-text)] leading-snug" style="font-weight:600">{{ pkg.destination_address.name }}</p>
								<p class="text-[12px] text-[var(--color-brand-text-secondary)] leading-snug" style="font-weight:400">
									{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }},
									{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Services & Pickup date -->
				<div
					v-if="pkg.services && ((pkg.services.service_type && pkg.services.service_type !== 'Nessuno') || pkg.services.date)"
					class="border-t border-[#EEF0F3] pt-[10px] flex flex-wrap items-center gap-[10px]">
					<span
						v-if="pkg.services.service_type && pkg.services.service_type !== 'Nessuno'"
						class="inline-flex items-center gap-[5px] text-[12px] text-[var(--color-brand-text)]"
						style="font-weight:500"
						title="Servizio aggiuntivo selezionato per questa spedizione">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-brand-primary)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<polyline points="9 11 12 14 22 4" />
							<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
						</svg>
						{{ pkg.services.service_type }}
					</span>
					<span
						v-if="pkg.services.date"
						class="inline-flex items-center gap-[5px] text-[12px] text-[var(--color-brand-text)]"
						style="font-weight:500"
						title="Data programmata per il ritiro del pacco">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-brand-primary)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" />
						</svg>
						Ritiro: {{ pkg.services.date }}
					</span>
				</div>
			</div>
		</div>

		<!-- Totals summary -->
		<div class="checkout-order-summary__totals">
			<!-- Subtotal -->
			<div class="flex items-center justify-between py-[8px]">
				<span class="text-[14px] text-[var(--color-brand-text-secondary)]" style="font-weight:400">
					Subtotale ({{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }})
				</span>
				<span class="text-[14px] text-[var(--color-brand-text)]" style="font-weight:500">{{ getTotal }}</span>
			</div>

			<!-- Discount row -->
			<div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-t border-[#EEF0F3]">
				<span
					class="text-[14px] text-[#0a8a7a] flex items-center gap-[5px]"
					style="font-weight:500"
					:title="'Sconto ' + couponApplied.discount_percent + '% applicato con il codice ' + couponApplied.code">
					<svg
						width="14"
						height="14"
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
				<span class="text-[14px] text-[#0a8a7a]" style="font-weight:600">-{{ formatEuro(couponApplied.discount_amount) }}&euro;</span>
			</div>

			<!-- Divider -->
			<div class="border-t border-[#DFE2E7] mt-[4px] mb-[4px]"></div>

			<!-- Final total -->
			<div class="flex items-center justify-between py-[8px]">
				<div class="flex items-center gap-[8px]">
					<span class="text-[16px] text-[var(--color-brand-text)]" style="font-weight:700">Totale da pagare</span>
					<span
						v-if="promoSettings?.active && promoSettings?.label_text"
						:style="{ backgroundColor: promoSettings.label_color || 'var(--color-brand-accent)' }"
						class="inline-flex items-center gap-[3px] px-[8px] py-[2px] rounded-full text-white text-[10px] tracking-wide"
						style="font-weight:700">
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
					class="text-[20px] text-[var(--color-brand-text)] tracking-[-0.5px]"
					style="font-weight:800"
					:title="
						couponApplied
							? `Totale originale: ${getTotal} - Sconto: ${formatEuro(couponApplied.discount_amount)}€ = ${finalTotalFormatted}`
							: 'Totale ordine IVA inclusa'
					">
					{{ finalTotalFormatted }}
				</span>
			</div>

			<!-- Coupon section -->
			<div class="mt-[10px] border-t border-[#EEF0F3] pt-[12px]">
				<div class="flex flex-col tablet:flex-row tablet:items-start tablet:justify-between gap-[8px]">
					<div class="min-w-0">
						<p class="text-[13px] text-[var(--color-brand-text)]" style="font-weight:600">Codice promozionale o referral</p>
						<p class="text-[12px] text-[var(--color-brand-text-muted)] leading-[1.5]" style="font-weight:400">
							Invio o uscita dal campo per verificare il codice.
						</p>
					</div>
					<button
						type="button"
						@click="localCouponPanelOpen = !localCouponPanelOpen"
						class="inline-flex items-center gap-[5px] h-[32px] px-[12px] rounded-full bg-white text-[12px] text-[var(--color-brand-text-secondary)] checkout-coupon-toggle"
						style="font-weight:600; outline: 1.5px solid #DFE2E7; outline-offset: -1.5px">
						<span>{{ couponApplied ? 'Codice attivo' : localCouponPanelOpen ? 'Nascondi' : 'Hai un codice?' }}</span>
						<svg
							:class="localCouponPanelOpen ? 'rotate-180' : ''"
							width="14"
							height="14"
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
					<div v-if="localCouponPanelOpen" class="mt-[10px]">
						<div v-if="couponApplied" class="checkout-coupon-applied">
							<div class="flex items-start gap-[8px] min-w-0 flex-1">
								<svg
									width="16"
									height="16"
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
									<p class="text-[13px] text-[#0a8a7a]" style="font-weight:600">Codice {{ couponApplied.code }} applicato</p>
									<p class="text-[12px] text-[#0a8a7a] leading-[1.5]" style="font-weight:400">
										Sconto del {{ couponApplied.discount_percent }}% già incluso nel totale.
									</p>
								</div>
							</div>
							<button type="button" @click="emit('remove-coupon')"
								class="inline-flex items-center gap-[4px] h-[30px] px-[10px] rounded-full bg-white text-[12px] text-[var(--color-brand-text-secondary)] checkout-coupon-remove"
								style="font-weight:600; outline: 1.5px solid #DFE2E7; outline-offset: -1.5px">
								<svg
									width="12"
									height="12"
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
								class="checkout-coupon-input"
								@keyup.enter.prevent="submitCoupon"
								@blur="submitCoupon" />
						</div>
						<div class="min-h-[18px] mt-[6px]">
							<p v-if="couponLoading" class="checkout-coupon-hint">Verifica del codice in corso...</p>
							<p v-else-if="couponError" class="checkout-coupon-error">{{ couponError }}</p>
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
