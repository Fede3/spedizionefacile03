<!--
  FILE: pages/carrello.vue
  SCOPO: Carrello spedizioni — lista pacchi raggruppati per indirizzo/servizio, modifica quantita', coupon, checkout.

  API: GET/DELETE /api/cart o /api/guest-cart (via useCart), DELETE /api/cart/{id},
       PATCH /api/cart/{id}/quantity, DELETE /api/empty-cart o /api/empty-guest-cart,
       POST /api/calculate-coupon.
  COMPOSABLE: useCart (gestione carrello autenticato/ospite), usePriceBands (promo).
  ROUTE: /carrello (pubblica, funziona sia autenticato che ospite).

  DATI IN INGRESSO: ?updated=timestamp (query param per forzare refresh cache dopo modifica).
  DATI IN USCITA: navigazione a /checkout (procedi ordine) o /riepilogo?edit={id} (modifica pacco).

  VINCOLI: single_price e' in centesimi nel DB. Il merge multi-collo avviene lato server.
  ERRORI TIPICI: dimenticare clearNuxtData("cart") dopo operazioni CRUD sul carrello.
  PUNTI DI MODIFICA SICURI: layout card, filtri, stili, testi UI.
  COLLEGAMENTI: composables/useCart.js, pages/riepilogo.vue, pages/checkout.vue.
-->
<script setup>
useSeoMeta({ title: 'Carrello | SpediamoFacile', ogTitle: 'Carrello | SpediamoFacile' });

const {
  cart, refresh, status, isAuthenticated,
  promoSettings,
  filterProvenienza, filterRiferimento, filteredCartItems, uniqueCities,
  showDeleteConfirm, deleteLoading, askDelete, confirmDelete,
  showEmptyConfirm, emptyCartLoading, emptyCart,
  formatPrice, unitPrice, formatDate, getPackageIcon,
  quantityUpdating, updateQuantity, quantityButtonClass, quantityButtonCompactClass, quantityButtonMobileClass,
  addressGroups, groupColors, expandedGroups, toggleGroup, isGroupExpanded, displayEntries,
  couponCode, couponMessage, couponApplied, couponDiscount, appliedTotal,
  showCouponField, showCouponPanel, applyCoupon, removeCoupon, displayTotal,
  showAuthCheckoutModal, authCheckoutTab, authCheckoutLoading, authCheckoutError,
  authCheckoutSuccess, authCheckoutRedirect, authLoginForm, authRegisterForm,
  openCheckoutWithAuthGate, loginForCheckout, registerForCheckout,
} = useCarrello();
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container">
			<!-- Cart content -->
			<div v-if="cart?.data?.length > 0" class="mx-auto">
				<!-- Promo banner -->
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mb-[16px]">
					<span
						:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
						class="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-[50px] text-white text-[0.9375rem] font-bold tracking-wide shadow-sm">
						<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="20" class="h-[20px] w-auto" />
						{{ promoSettings.label_text }}
					</span>
				</div>

				<!-- Title -->
				<div class="mb-[24px] text-center">
					<h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] mb-[6px] font-montserrat">Carrello</h1>
					<p class="text-[0.9375rem] text-[#6B7280] max-w-[620px] mx-auto leading-[1.6]">
						Rivedi le spedizioni, applica eventuali sconti e completa l'ordine quando tutto è pronto.
					</p>
				</div>

				<!-- Main card -->
				<div class="bg-white rounded-[24px] p-[18px] tablet:p-[28px_32px] border border-[#E5EAEC] shadow-[0_14px_40px_rgba(37,43,66,0.06)]">
					<div class="flex flex-col desktop:flex-row desktop:items-end desktop:justify-between gap-[16px] mb-[20px]">
						<div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#095866] mb-[6px]">Spedizioni pronte</p>
							<h2 class="text-[1.25rem] tablet:text-[1.5rem] font-bold text-[#252B42]">Controlla tutto prima del pagamento</h2>
							<p class="text-[0.875rem] text-[#6B7280] mt-[6px] max-w-[560px]">
								Puoi modificare quantità, rivedere i dettagli di ogni collo e passare al checkout quando il riepilogo è corretto.
							</p>
						</div>
						<button
							type="button"
							@click="openCheckoutWithAuthGate"
							class="inline-flex items-center justify-center gap-[8px] px-[22px] min-h-[48px] rounded-[16px] bg-[#095866] text-white font-semibold text-[0.9375rem] hover:bg-[#074a56] transition-[background-color,box-shadow] duration-200 shadow-sm hover:shadow-[0_8px_18px_rgba(9,88,102,0.22)] cursor-pointer">
							Procedi al checkout
							<Icon name="mdi:arrow-right" class="text-[18px]" />
						</button>
					</div>

					<!-- Filters row -->
					<div class="flex flex-col tablet:flex-row gap-[12px] tablet:gap-[16px] items-stretch tablet:items-center mb-[18px]">
						<div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px]">
							<select v-model="filterProvenienza" class="w-full bg-[#F8FAFB] border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] appearance-none cursor-pointer transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]">
								<option value="">Provenienza</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px] tablet:ml-auto">
							<input type="text" v-model="filterRiferimento" placeholder="Cerca per riferimento, mittente o destinatario" class="w-full bg-[#F8FAFB] border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#8A939C] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
						</div>
					</div>

					<!-- Coupon row -->
					<div class="rounded-[18px] border border-[#E5EAEC] bg-[#F8FAFB] px-[16px] py-[14px] mb-[20px]">
						<button
							type="button"
							@click="showCouponField = !showCouponField"
							class="w-full flex items-center justify-between gap-[12px] text-left cursor-pointer">
							<div>
								<p class="text-[0.9375rem] font-semibold text-[#252B42]">Hai un codice sconto?</p>
								<p class="text-[0.8125rem] text-[#6B7280] mt-[2px]">Applicalo solo se vuoi aggiornare il totale prima del checkout.</p>
							</div>
							<div class="inline-flex items-center gap-[8px] text-[#095866] font-semibold text-[0.8125rem]">
								<span>{{ showCouponPanel ? 'Nascondi' : 'Apri' }}</span>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform" :class="showCouponPanel ? 'rotate-180' : ''"><polyline points="6 9 12 15 18 9"/></svg>
							</div>
						</button>

						<div v-if="showCouponPanel" class="mt-[14px] pt-[14px] border-t border-[#E1E7EA]">
							<div class="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-[12px] tablet:gap-[16px]">
								<div class="w-full tablet:flex-1 tablet:max-w-[340px]">
									<input
										v-if="!couponApplied"
										type="text"
										v-model="couponCode"
										placeholder="PROVA123"
										class="w-full bg-white border border-[#D7E1E4] rounded-[14px] h-[48px] tablet:h-[46px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#8A939C] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
									<div v-else class="flex items-center gap-[10px] bg-emerald-50 border border-emerald-200 rounded-[14px] min-h-[46px] px-[18px]">
										<span class="text-emerald-700 font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
										<button @click="removeCoupon" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer ml-auto">Rimuovi</button>
									</div>
								</div>
								<button
									v-if="!couponApplied"
									type="button"
									@click="applyCoupon"
									class="inline-flex items-center justify-center gap-[6px] bg-[#095866] text-white font-semibold text-[0.9375rem] px-[24px] min-h-[48px] w-full tablet:w-auto rounded-[14px] hover:bg-[#074a56] transition-[background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
									<Icon name="mdi:tag-outline" class="text-[18px]" />
									Applica coupon
								</button>
							</div>
							<div class="min-h-[24px] mt-[10px]">
								<p v-if="couponMessage" class="text-[0.8125rem]" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
									{{ couponMessage.text }}
								</p>
							</div>
						</div>
					</div>

					<!-- Spedizioni section -->
					<div class="flex items-end justify-between gap-[12px] mb-[16px]">
						<div>
							<h2 class="text-[1.25rem] font-bold text-[#252B42]">Spedizioni</h2>
							<p class="text-[0.8125rem] text-[#6B7280] mt-[2px]">I colli identici vengono raggruppati per aiutarti a controllare quantità e tratta più velocemente.</p>
						</div>
						<span class="hidden tablet:inline-flex items-center gap-[6px] rounded-full bg-[#F2F6F7] px-[12px] py-[6px] text-[0.75rem] font-medium text-[#095866]">
							{{ displayEntries.length }} {{ displayEntries.length === 1 ? 'blocco' : 'blocchi' }}
						</span>
					</div>

					<!-- Display entries (grouped or single) -->
					<div class="space-y-[12px]">
						<template v-for="(entry, eIdx) in displayEntries" :key="'e-'+eIdx">

							<!-- ========== GROUPED ENTRY (multi-collo) ========== -->
							<div v-if="entry.type === 'group'"
								class="bg-white rounded-[20px] border border-[#E3E8EA] shadow-[0_10px_24px_rgba(37,43,66,0.06)] overflow-hidden">

								<!-- Group header (clickable to expand/collapse) -->
								<button
									type="button"
									@click="toggleGroup(entry.groupIndex)"
									class="w-full flex items-center gap-[10px] tablet:gap-[16px] p-[16px] tablet:p-[20px] hover:bg-[#f8fafb] transition cursor-pointer text-left">
									<!-- Merge icon -->
									<div class="w-[36px] h-[36px] tablet:w-[44px] tablet:h-[44px] rounded-[50px] tablet:rounded-[50px] flex items-center justify-center shrink-0"
										:style="{ backgroundColor: entry.color + '15' }">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="entry.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tablet:w-[22px] tablet:h-[22px]"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
									</div>

									<!-- Route info -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-[6px] tablet:gap-[8px] flex-wrap">
											<span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
												{{ entry.items[0]?.origin_address?.city || 'Partenza' }}
											</span>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 tablet:w-[18px] tablet:h-[18px]"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
											<span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
												{{ entry.items[0]?.destination_address?.city || 'Destinazione' }}
											</span>
										</div>
											<div class="flex items-center gap-[10px] mt-[6px] flex-wrap">
												<span class="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
													{{ entry.items.length }} colli
												</span>
												<span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full text-[0.6875rem] font-semibold"
													:style="{ backgroundColor: entry.color + '14', color: entry.color }">
													<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
													Spedizione unica
												</span>
												<span class="text-[0.75rem] text-[#6B7280] bg-[#F3F5F6] px-[10px] py-[4px] rounded-full">
													{{ entry.items[0]?.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
												</span>
											</div>
										</div>

									<!-- Total price -->
									<div class="text-right shrink-0">
										<p class="text-[0.9375rem] tablet:text-[1.125rem] font-bold text-[#252B42]">{{ formatPrice(entry.totalCents) }}</p>
										<p class="text-[0.6875rem] tablet:text-[0.75rem] text-[#737373]">totale gruppo</p>
									</div>

									<!-- Expand/collapse chevron -->
									<div class="shrink-0 ml-[4px] transition-transform" :class="{ 'rotate-180': isGroupExpanded(entry.groupIndex) }">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
									</div>
								</button>

								<!-- Group addresses (always visible) -->
									<div class="mx-[16px] tablet:mx-[20px] mb-[4px] rounded-[16px] bg-[#F8FAFB] border border-[#EDF2F3] px-[14px] tablet:px-[16px] py-[12px] flex flex-wrap gap-x-[24px] gap-y-[8px] text-[0.75rem] tablet:text-[0.8125rem] text-[#404040]">
									<div class="flex items-start gap-[6px] min-w-0">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										<span class="break-words">{{ entry.items[0]?.origin_address?.name || '' }} - {{ entry.items[0]?.origin_address?.address || '' }}, {{ entry.items[0]?.origin_address?.city || '' }}</span>
									</div>
									<div class="flex items-start gap-[6px] min-w-0">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
										<span class="break-words">{{ entry.items[0]?.destination_address?.name || '' }} - {{ entry.items[0]?.destination_address?.address || '' }}, {{ entry.items[0]?.destination_address?.city || '' }}</span>
									</div>
								</div>

								<!-- Expanded: individual parcels -->
									<div v-if="isGroupExpanded(entry.groupIndex)" class="px-[12px] tablet:px-[20px] pb-[16px] pt-[8px]">
										<div class="border-t border-[#E8EEF0] pt-[12px]">
										<div
											v-for="(item, pIdx) in entry.items"
											:key="item.id"
											class="flex flex-wrap tablet:flex-nowrap items-center gap-[8px] tablet:gap-[12px] py-[10px] px-[8px] tablet:px-[12px] rounded-[50px] mb-[6px]"
											:class="pIdx % 2 === 0 ? 'bg-[#F8F9FB]' : 'bg-white'">
											<!-- Package icon -->
											<div class="w-[32px] h-[32px] tablet:w-[36px] tablet:h-[36px] rounded-[8px] bg-[#F0F0F0] flex items-center justify-center shrink-0">
												<!-- Ottimizzazione: decoding async -->
												<NuxtImg :src="getPackageIcon(item)" alt="" width="22" height="22" loading="lazy" decoding="async" class="w-[18px] h-[18px] tablet:w-[22px] tablet:h-[22px]" />
											</div>

											<!-- Package info -->
											<div class="flex-1 min-w-0">
												<p class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">
													Collo {{ pIdx + 1 }}
													<span class="font-normal text-[#737373] ml-[4px]">{{ item.package_type || 'Pacco' }}</span>
												</p>
												<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
													{{ item.weight }} kg
													<span class="mx-[4px]">&middot;</span>
													{{ item.first_size }}x{{ item.second_size }}x{{ item.third_size }} cm
												</p>
											</div>

											<!-- Price (on mobile, placed next to package info) -->
											<div class="text-right shrink-0 min-w-[60px] tablet:min-w-[70px]">
												<span v-if="(item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(item)) }}/cad</span>
												<span class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
											</div>

											<!-- Quantity + Actions row (wraps to second line on mobile) -->
											<div class="w-full tablet:w-auto flex items-center justify-between tablet:justify-start gap-[8px] tablet:gap-[4px] pl-[40px] tablet:pl-0">
												<!-- Quantity -->
													<div class="flex items-center gap-[4px] shrink-0">
														<button type="button" @click="updateQuantity(item.id, (item.quantity || 1) - 1)" :disabled="(item.quantity || 1) <= 1" :class="quantityButtonClass">-</button>
														<span class="min-w-[20px] text-center font-semibold text-[0.8125rem] text-[#252B42]">{{ item.quantity || 1 }}</span>
														<button type="button" @click="updateQuantity(item.id, (item.quantity || 1) + 1)" :disabled="(item.quantity || 1) >= 100" :class="quantityButtonClass">+</button>
													</div>

												<!-- Actions -->
												<div class="flex items-center gap-[6px] shrink-0">
													<NuxtLink :to="`/riepilogo?edit=${item.id}`" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica collo">
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
													</NuxtLink>
													<button type="button" @click="askDelete(item.id)" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer" title="Elimina collo">
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
													</button>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Collapsed summary -->
								<div v-else class="px-[14px] tablet:px-[20px] pb-[16px] pt-[4px]">
									<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
										{{ entry.items.map((i, idx) => `Collo ${idx + 1}: ${i.weight}kg`).join(' | ') }}
									</p>
								</div>
							</div>

							<!-- ========== SINGLE ENTRY (collo singolo) ========== -->
							<div v-else
								class="bg-white rounded-[16px] overflow-hidden">

								<!-- Desktop layout -->
								<div class="hidden desktop:flex items-center gap-[16px] p-[16px_20px]">
									<!-- Package icon -->
									<div class="w-[44px] h-[44px] rounded-[50px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
										<!-- Ottimizzazione: decoding async -->
										<NuxtImg :src="getPackageIcon(entry.item)" alt="" width="28" height="28" loading="lazy" decoding="async" />
									</div>

									<!-- Route -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-[8px]">
											<span class="text-[0.9375rem] font-semibold text-[#252B42]">
												{{ entry.item.origin_address?.city || 'Partenza' }}
											</span>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
											<span class="text-[0.9375rem] font-semibold text-[#252B42]">
												{{ entry.item.destination_address?.city || 'Destinazione' }}
											</span>
										</div>
										<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
											{{ entry.item.package_type || 'Pacco' }}
											<span class="mx-[4px]">&middot;</span>
											{{ entry.item.weight }} kg
											<span class="mx-[4px]">&middot;</span>
											{{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm
										</p>
									</div>

									<!-- Service -->
									<span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[3px] rounded-[6px] shrink-0">
										{{ entry.item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
									</span>

									<!-- Addresses -->
									<div class="text-[0.75rem] text-[#404040] shrink-0 max-w-[200px]">
										<div class="flex items-center gap-[4px]">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
											<span class="truncate">{{ entry.item.origin_address?.name?.split(' ')[0] || '' }} - {{ entry.item.origin_address?.city || '' }}</span>
										</div>
										<div class="flex items-center gap-[4px] mt-[2px]">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											<span class="truncate">{{ entry.item.destination_address?.name?.split(' ')[0] || '' }} - {{ entry.item.destination_address?.city || '' }}</span>
										</div>
									</div>

									<!-- Quantity -->
										<div class="flex items-center gap-[4px] shrink-0">
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" :class="quantityButtonCompactClass">-</button>
											<span class="min-w-[20px] text-center font-semibold text-[0.8125rem]">{{ entry.item.quantity || 1 }}</span>
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" :class="quantityButtonCompactClass">+</button>
										</div>

									<!-- Price -->
									<div class="text-right shrink-0 min-w-[80px]">
										<span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
										<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-[8px] shrink-0">
										<NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
										</NuxtLink>
										<button type="button" @click="askDelete(entry.item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
										</button>
									</div>
								</div>

								<!-- Mobile layout -->
								<div class="desktop:hidden p-[14px]">
									<div class="flex items-center justify-between mb-[8px]">
										<div class="min-w-0 flex-1 mr-[10px]">
											<p class="text-[0.875rem] font-semibold text-[#252B42] truncate">{{ entry.item.origin_address?.city || 'Partenza' }} &rarr; {{ entry.item.destination_address?.city || 'Destinazione' }}</p>
											<p class="text-[0.75rem] text-[#737373]">{{ entry.item.weight }} kg &middot; {{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm</p>
										</div>
										<div class="text-right shrink-0">
											<span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
											<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
										</div>
									</div>
									<div class="flex items-center justify-between mt-[6px]">
										<div class="flex items-center gap-[8px]">
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" :class="quantityButtonMobileClass">-</button>
											<span class="min-w-[24px] text-center font-semibold text-[0.875rem] text-[#252B42]">{{ entry.item.quantity || 1 }}x</span>
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) + 1)" :disabled="(entry.item.quantity || 1) >= 100" :class="quantityButtonMobileClass">+</button>
										</div>
										<div class="flex items-center gap-[12px]">
											<NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
												Modifica
											</NuxtLink>
											<button type="button" @click="askDelete(entry.item.id)" class="text-[0.8125rem] text-red-500 font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">Elimina</button>
										</div>
									</div>
								</div>
							</div>

						</template>
					</div>

					<!-- Totals -->
					<div class="mt-[24px] border-t border-[#E8EEF0] pt-[20px] grid gap-[16px] desktop:grid-cols-[minmax(0,1fr)_320px]">
						<div class="rounded-[20px] border border-[#E3E8EA] bg-[#F8FAFB] p-[18px]">
							<div class="flex items-center justify-between py-[8px] border-b border-[#E1E7EA]">
								<span class="text-[0.9375rem] font-medium text-[#4B5563]">Importo spedizioni</span>
								<span class="text-[0.9375rem] font-semibold text-[#252B42]" :class="{ 'line-through text-[#9AA3AA]': couponApplied }">{{ cart.meta?.total }}</span>
							</div>
							<div v-if="couponApplied" class="flex items-center justify-between py-[10px] border-b border-[#E1E7EA]">
								<span class="text-[0.9375rem] font-semibold text-emerald-700">Sconto coupon ({{ couponDiscount }}%)</span>
								<span class="text-[0.9375rem] font-semibold text-emerald-700">{{ appliedTotal }}</span>
							</div>
							<div class="flex items-end justify-between gap-[12px] pt-[14px]">
								<div>
									<p class="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#095866]">Totale finale</p>
									<p class="text-[0.8125rem] text-[#6B7280] mt-[4px]">Importo aggiornato prima del checkout.</p>
								</div>
								<span class="text-[1.375rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
							</div>
						</div>

						<div class="flex flex-col gap-[10px]">
							<button
								type="button"
								@click="openCheckoutWithAuthGate"
								class="inline-flex items-center justify-center gap-[8px] px-[28px] min-h-[56px] rounded-[18px] bg-[#E44203] text-white font-semibold text-[1rem] hover:bg-[#c93800] transition-[background-color,box-shadow,transform] duration-200 shadow-[0_10px_20px_rgba(228,66,3,0.18)] hover:shadow-[0_14px_28px_rgba(228,66,3,0.24)] active:scale-[0.97] cursor-pointer">
								Procedi al checkout
								<Icon name="mdi:arrow-right" class="text-[20px]" />
							</button>
							<p class="text-[0.8125rem] text-[#6B7280] leading-[1.5]">
								Nel checkout potrai scegliere il metodo di pagamento e confermare l'importo finale con più dettaglio.
							</p>
							<button
								type="button"
								@click="showEmptyConfirm = true"
								class="inline-flex items-center justify-center gap-[6px] px-[20px] min-h-[48px] rounded-[16px] border border-[#E3E8EA] bg-white text-[#5B6470] text-[0.875rem] font-medium hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-[border-color,color,background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
								<Icon name="mdi:delete-sweep-outline" class="text-[18px]" />
								Svuota carrello
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty cart -->
			<div v-else-if="status !== 'pending'" class="max-w-[600px] mx-auto py-[80px] text-center">
				<h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
				<div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-[#E44203] rounded-full flex items-center justify-center">
					<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Il carrello è vuoto</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora aggiunto spedizioni al carrello. Configura la tua prima spedizione per iniziare.
				</p>
				<NuxtLink
					to="/preventivo"
					class="inline-flex items-center gap-[6px] px-[24px] py-[14px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-[background-color,transform] duration-200 active:scale-[0.97] min-h-[48px]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>

		<AccountConfirmDialog
			v-model:open="showDeleteConfirm"
			title="Conferma eliminazione"
			description="Sei sicuro di voler rimuovere questa spedizione dal carrello? L'azione non puo' essere annullata."
			confirm-label="Elimina"
			:loading="deleteLoading"
			@confirm="confirmDelete"
		/>

		<AccountConfirmDialog
			v-model:open="showEmptyConfirm"
			title="Svuota carrello"
			description="Sei sicuro di voler svuotare tutto il carrello? Tutte le spedizioni verranno rimosse."
			confirm-label="Svuota tutto"
			:loading="emptyCartLoading"
			@confirm="emptyCart"
		/>

			<!-- Auth inline per proseguire al checkout senza uscire dal carrello -->
			<UModal v-model:open="showAuthCheckoutModal" :dismissible="!authCheckoutLoading" :close="false">
				<template #title>
					<h3 class="text-[1.125rem] font-bold text-[#252B42]">Continua senza perdere il carrello</h3>
				</template>
				<template #body>
					<div class="space-y-[14px]">
						<p class="text-[0.875rem] text-[#737373] leading-[1.5]">
							Accedi o registrati qui. Dopo il successo continui direttamente al pagamento.
						</p>

						<div class="inline-flex rounded-[10px] bg-[#F2F4F5] p-[4px]">
							<button
								type="button"
								@click="authCheckoutTab = 'login'; authCheckoutError = ''; authCheckoutSuccess = '';"
								:class="authCheckoutTab === 'login' ? 'bg-white text-[#252B42] shadow-sm' : 'text-[#737373]'"
								class="px-[14px] py-[8px] rounded-[8px] text-[0.8125rem] font-semibold transition cursor-pointer">
								Accedi
							</button>
							<button
								type="button"
								@click="authCheckoutTab = 'register'; authCheckoutError = ''; authCheckoutSuccess = '';"
								:class="authCheckoutTab === 'register' ? 'bg-white text-[#252B42] shadow-sm' : 'text-[#737373]'"
								class="px-[14px] py-[8px] rounded-[8px] text-[0.8125rem] font-semibold transition cursor-pointer">
								Registrati
							</button>
						</div>

						<div v-if="authCheckoutTab === 'login'" class="space-y-[10px]">
							<div>
								<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Email</label>
								<input
									v-model="authLoginForm.email"
									type="email"
									autocomplete="email"
									class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
							</div>
							<div>
								<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Password</label>
								<input
									v-model="authLoginForm.password"
									type="password"
									autocomplete="current-password"
									class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
							</div>
						</div>

						<div v-else class="space-y-[10px]">
							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Nome</label>
									<input
										v-model="authRegisterForm.name"
										type="text"
										autocomplete="given-name"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Cognome</label>
									<input
										v-model="authRegisterForm.surname"
										type="text"
										autocomplete="family-name"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
							</div>

							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Email</label>
									<input
										v-model="authRegisterForm.email"
										type="email"
										autocomplete="email"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Conferma email</label>
									<input
										v-model="authRegisterForm.email_confirmation"
										type="email"
										autocomplete="email"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
							</div>

							<div class="grid grid-cols-1 tablet:grid-cols-[120px_1fr] gap-[10px]">
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Prefisso</label>
									<input
										v-model="authRegisterForm.prefix"
										type="text"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Telefono</label>
									<input
										v-model="authRegisterForm.telephone_number"
										type="tel"
										autocomplete="tel"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
							</div>

							<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Password</label>
									<input
										v-model="authRegisterForm.password"
										type="password"
										autocomplete="new-password"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
								<div>
									<label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Conferma password</label>
									<input
										v-model="authRegisterForm.password_confirmation"
										type="password"
										autocomplete="new-password"
										class="w-full bg-white rounded-[10px] h-[44px] px-[12px] text-[0.9375rem] border border-[#D0D0D0] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
								</div>
							</div>
						</div>

						<p v-if="authCheckoutError" class="text-[0.8125rem] text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-[10px] py-[8px]">
							{{ authCheckoutError }}
						</p>
						<p v-if="authCheckoutSuccess" class="text-[0.8125rem] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[10px] px-[10px] py-[8px]">
							{{ authCheckoutSuccess }}
						</p>

						<div v-if="authCheckoutError && authCheckoutError.toLowerCase().includes('verific')" class="text-[0.8125rem]">
							<NuxtLink :to="`/autenticazione?redirect=${encodeURIComponent(authCheckoutRedirect)}`" class="text-[#095866] font-semibold hover:underline cursor-pointer">
								Apri verifica account
							</NuxtLink>
						</div>
					</div>
				</template>
				<template #footer>
					<div class="flex flex-col-reverse tablet:flex-row justify-end gap-[10px]">
						<button
							type="button"
							@click="showAuthCheckoutModal = false"
							:disabled="authCheckoutLoading"
							class="inline-flex items-center justify-center gap-[6px] px-[16px] min-h-[42px] rounded-[10px] border border-[#D0D0D0] text-[#737373] hover:bg-[#F7F9FA] transition cursor-pointer disabled:opacity-60">
							Annulla
						</button>
						<button
							v-if="authCheckoutTab === 'login'"
							type="button"
							@click="loginForCheckout"
							:disabled="authCheckoutLoading"
							class="inline-flex items-center justify-center gap-[6px] px-[16px] min-h-[42px] rounded-[10px] bg-[#E44203] text-white font-semibold hover:bg-[#c93800] transition cursor-pointer disabled:opacity-60">
							{{ authCheckoutLoading ? 'Accesso...' : 'Accedi e continua' }}
						</button>
						<button
							v-else
							type="button"
							@click="registerForCheckout"
							:disabled="authCheckoutLoading"
							class="inline-flex items-center justify-center gap-[6px] px-[16px] min-h-[42px] rounded-[10px] bg-[#E44203] text-white font-semibold hover:bg-[#c93800] transition cursor-pointer disabled:opacity-60">
							{{ authCheckoutLoading ? 'Registrazione...' : 'Registrati e continua' }}
						</button>
					</div>
				</template>
			</UModal>
		</section>
</template>
