<script setup>
const { cart, refresh, status } = useCart();
const { isAuthenticated } = useSanctumAuth();
const sanctum = useSanctumClient();
const router = useRouter();

const endpoint = computed(() => (isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart"));

// Delete confirmation
const showDeleteConfirm = ref(false);
const deleteTargetId = ref(null);
const deleteLoading = ref(false);

const askDelete = (id) => {
	deleteTargetId.value = id;
	showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/cart/${deleteTargetId.value}`, { method: "DELETE" });
		await refresh();
	} catch (e) {
		console.error(e);
	} finally {
		deleteLoading.value = false;
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
	}
};

// Empty cart
const emptyCart = async () => {
	try {
		await sanctum(endpoint.value, { method: "DELETE" });
		await refresh();
	} catch (error) {
		console.error(error);
	}
};

// Detail popup
const showDetail = ref(false);
const detailItem = ref(null);

const openDetail = (item) => {
	detailItem.value = item;
	showDetail.value = true;
};

// Price helper: single_price is stored in cents
const formatPrice = (cents) => {
	if (!cents) return '0,00 €';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + ' €';
};

// Coupon
const couponCode = ref('');
const couponMessage = ref(null);
const couponApplied = ref(false);
const couponDiscount = ref(null);
const appliedTotal = ref(null);

const applyCoupon = async () => {
	if (!couponCode.value.trim()) return;
	couponMessage.value = null;

	try {
		const total = cart.value?.meta?.total;
		const numericTotal = Number(String(total).replace('€', '').replace(',', '.').trim());

		const data = await sanctum('/api/calculate-coupon', {
			method: 'POST',
			body: { coupon: couponCode.value, total: numericTotal },
		});

		if (data?.success) {
			couponApplied.value = true;
			couponDiscount.value = data.percentage;
			appliedTotal.value = data.new_total;
			couponMessage.value = { type: 'success', text: `Sconto del ${data.percentage}% applicato!` };
		} else {
			couponMessage.value = { type: 'error', text: 'Coupon non valido.' };
		}
	} catch (e) {
		couponMessage.value = { type: 'error', text: 'Errore nella verifica del coupon.' };
	}
};

const removeCoupon = () => {
	couponCode.value = '';
	couponApplied.value = false;
	couponDiscount.value = null;
	appliedTotal.value = null;
	couponMessage.value = null;
};

const displayTotal = computed(() => {
	return couponApplied.value && appliedTotal.value ? appliedTotal.value : cart.value?.meta?.total;
});
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px]">
		<div class="my-container">
			<!-- Loading -->
			<div v-if="status === 'pending'" class="max-w-[1100px] mx-auto">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[24px] mb-[12px] animate-pulse">
					<div class="flex gap-[16px]">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-gray-200"></div>
						<div class="flex-1 space-y-[8px]">
							<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
							<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Cart content -->
			<div v-else-if="cart?.data?.length > 0" class="max-w-[1100px] mx-auto">
				<div class="flex items-center justify-between mb-[24px]">
					<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] flex items-center gap-[10px]">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#252B42" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
						Carrello
					</h1>
					<NuxtLink
						to="/preventivo"
						class="inline-flex items-center gap-[6px] px-[20px] h-[42px] rounded-[12px] bg-[#E44203] text-white text-[0.875rem] font-semibold hover:opacity-90 transition">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
						Nuova spedizione
					</NuxtLink>
				</div>

				<!-- Table header -->
				<div class="hidden desktop:grid grid-cols-[1fr_1fr_1fr_100px_120px_130px] gap-[12px] px-[24px] pb-[10px] text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider border-b border-[#E9EBEC]">
					<span>Partenza</span>
					<span>Destinazione</span>
					<span>Servizio</span>
					<span class="text-center">Colli</span>
					<span class="text-right">Importo</span>
					<span class="text-center">Azioni</span>
				</div>

				<!-- Cart items -->
				<div class="space-y-[10px] mt-[10px]">
					<div
						v-for="item in cart.data"
						:key="item.id"
						class="bg-white rounded-[14px] border border-[#E9EBEC] hover:border-[#095866] transition-all">

						<!-- Desktop row -->
						<div class="hidden desktop:grid grid-cols-[1fr_1fr_1fr_100px_120px_130px] gap-[12px] items-center p-[16px_24px]">
							<!-- Partenza -->
							<div>
								<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city }}</p>
								<p class="text-[0.75rem] text-[#737373]">{{ item.origin_address?.postal_code }} ({{ item.origin_address?.province }})</p>
							</div>
							<!-- Destinazione -->
							<div>
								<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.destination_address?.city }}</p>
								<p class="text-[0.75rem] text-[#737373]">{{ item.destination_address?.postal_code }} ({{ item.destination_address?.province }})</p>
							</div>
							<!-- Servizio -->
							<div>
								<p class="text-[0.8125rem] text-[#252B42]">{{ item.services?.service_type || 'Standard' }}</p>
								<p v-if="item.services?.date" class="text-[0.75rem] text-[#737373]">{{ item.services.date }}</p>
							</div>
							<!-- Colli -->
							<div class="text-center">
								<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.quantity }}x</span>
								<p class="text-[0.6875rem] text-[#737373]">{{ item.weight }} kg</p>
							</div>
							<!-- Importo -->
							<div class="text-right">
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<!-- Azioni -->
							<div class="flex items-center justify-center gap-[10px] whitespace-nowrap">
								<button type="button" @click="openDetail(item)" title="Dettagli" class="w-[32px] h-[32px] rounded-[8px] bg-[#095866]/10 flex items-center justify-center hover:bg-[#095866]/20 transition cursor-pointer">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
								</button>
								<button type="button" @click="askDelete(item.id)" title="Elimina" class="w-[32px] h-[32px] rounded-[8px] bg-red-50 flex items-center justify-center hover:bg-red-100 transition cursor-pointer">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
								</button>
							</div>
						</div>

						<!-- Mobile card -->
						<div class="desktop:hidden p-[16px]">
							<div class="flex items-center justify-between mb-[12px]">
								<div class="flex items-center gap-[10px]">
									<div class="w-[40px] h-[40px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><rect x="1" y="3" width="22" height="18" rx="2"/><path d="M1 9h22"/></svg>
									</div>
									<div>
										<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ item.origin_address?.city }} &rarr; {{ item.destination_address?.city }}</p>
										<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x &ndash; {{ item.weight }} kg</p>
									</div>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[8px] justify-end">
								<button type="button" @click="openDetail(item)" class="text-[0.75rem] text-[#095866] font-semibold hover:underline cursor-pointer">Dettagli</button>
								<button type="button" @click="askDelete(item.id)" class="text-[0.75rem] text-red-500 font-semibold hover:underline cursor-pointer">Elimina</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Coupon + totals -->
				<div class="mt-[28px] flex flex-col desktop:flex-row gap-[20px] items-start desktop:items-end justify-between">
					<!-- Coupon -->
					<div class="bg-white rounded-[14px] border border-[#E9EBEC] p-[20px] w-full desktop:w-[380px]">
						<h3 class="text-[0.875rem] font-bold text-[#252B42] mb-[10px]">Codice sconto</h3>
						<div v-if="!couponApplied" class="flex gap-[8px]">
							<input
								type="text"
								v-model="couponCode"
								placeholder="Inserisci codice"
								class="flex-1 bg-[#F8F9FB] p-[10px_14px] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none" />
							<button
								type="button"
								@click="applyCoupon"
								class="bg-[#095866] text-white px-[16px] py-[10px] rounded-[8px] text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
								Applica
							</button>
						</div>
						<div v-else class="flex items-center justify-between p-[10px] bg-emerald-50 border border-emerald-200 rounded-[8px]">
							<div>
								<p class="text-emerald-700 font-semibold text-[0.8125rem]">{{ couponCode.toUpperCase() }} &ndash; Sconto {{ couponDiscount }}%</p>
							</div>
							<button @click="removeCoupon" class="text-[0.75rem] text-red-500 hover:underline cursor-pointer">Rimuovi</button>
						</div>
						<p v-if="couponMessage" class="mt-[8px] text-[0.8125rem]" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
							{{ couponMessage.text }}
						</p>
					</div>

					<!-- Totals -->
					<div class="bg-white rounded-[14px] border border-[#E9EBEC] p-[20px] w-full desktop:w-[360px]">
						<div class="flex items-center justify-between mb-[8px]">
							<span class="text-[0.875rem] text-[#737373]">Subtotale ({{ cart.data?.length }} spedizioni)</span>
							<span class="text-[0.9375rem] font-semibold text-[#252B42]" :class="{ 'line-through text-[#A0A5AB]': couponApplied }">{{ cart.meta?.total }}</span>
						</div>
						<div v-if="couponApplied" class="flex items-center justify-between mb-[8px]">
							<span class="text-[0.875rem] text-emerald-600">Sconto {{ couponDiscount }}%</span>
							<span class="text-[0.9375rem] font-semibold text-emerald-600">{{ appliedTotal }}</span>
						</div>
						<div class="flex items-center justify-between pt-[12px] border-t border-[#E9EBEC]">
							<span class="text-[1rem] font-bold text-[#252B42]">Totale</span>
							<span class="text-[1.25rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
						</div>
					</div>
				</div>

				<!-- Action buttons -->
				<div class="mt-[24px] flex flex-col desktop:flex-row gap-[12px] items-center justify-between">
					<div class="flex gap-[12px]">
						<button
							type="button"
							@click="emptyCart"
							class="inline-flex items-center gap-[6px] px-[20px] h-[48px] rounded-[12px] border border-[#E9EBEC] text-[#737373] hover:border-red-300 hover:text-red-500 transition text-[0.875rem] font-medium cursor-pointer">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
							Svuota carrello
						</button>
						<NuxtLink
							to="/preventivo"
							class="inline-flex items-center gap-[6px] px-[20px] h-[48px] rounded-[12px] border border-[#E9EBEC] text-[#095866] hover:border-[#095866] transition text-[0.875rem] font-medium">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
							Aggiungi spedizione
						</NuxtLink>
					</div>
					<NuxtLink
						to="/checkout"
						class="inline-flex items-center justify-center gap-[8px] px-[32px] h-[52px] rounded-[14px] bg-[#E44203] text-white font-semibold text-[1rem] hover:opacity-90 transition">
						Procedi al pagamento
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
					</NuxtLink>
				</div>
			</div>

			<!-- Empty cart -->
			<div v-else-if="status === 'success'" class="max-w-[600px] mx-auto py-[80px] text-center">
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C8CCD0" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Il carrello è vuoto</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora aggiunto spedizioni al carrello. Configura la tua prima spedizione per iniziare.
				</p>
				<NuxtLink
					to="/preventivo"
					class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>

		<!-- Detail popup -->
		<UModal v-model:open="showDetail" :dismissible="true" :close="false">
			<template #title>
				<div class="flex items-center justify-between">
					<h3 class="text-[1.125rem] font-bold text-[#252B42]">Dettagli spedizione</h3>
					<button type="button" @click="showDetail = false" class="text-[#737373] hover:text-[#252B42] cursor-pointer">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
			</template>
			<template #body>
				<div v-if="detailItem" class="space-y-[16px]">
					<!-- Partenza -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Partenza</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.origin_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.address }} {{ detailItem.origin_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.origin_address?.postal_code }} {{ detailItem.origin_address?.city }} ({{ detailItem.origin_address?.province }})</p>
						<p class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.origin_address?.telephone_number }}</p>
					</div>
					<!-- Destinazione -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Destinazione</h4>
						<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ detailItem.destination_address?.name }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.address }} {{ detailItem.destination_address?.address_number }}</p>
						<p class="text-[0.8125rem] text-[#404040]">{{ detailItem.destination_address?.postal_code }} {{ detailItem.destination_address?.city }} ({{ detailItem.destination_address?.province }})</p>
						<p class="text-[0.75rem] text-[#737373] mt-[4px]">Tel: {{ detailItem.destination_address?.telephone_number }}</p>
					</div>
					<!-- Colli -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Collo</h4>
						<div class="grid grid-cols-2 gap-[8px] text-[0.8125rem] text-[#252B42]">
							<p><span class="text-[#737373]">Tipo:</span> {{ detailItem.package_type }}</p>
							<p><span class="text-[#737373]">Quantità:</span> {{ detailItem.quantity }}</p>
							<p><span class="text-[#737373]">Peso:</span> {{ detailItem.weight }} kg</p>
							<p><span class="text-[#737373]">Dimensioni:</span> {{ detailItem.first_size }}&times;{{ detailItem.second_size }}&times;{{ detailItem.third_size }} cm</p>
						</div>
					</div>
					<!-- Servizi -->
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<h4 class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[8px]">Servizi</h4>
						<p class="text-[0.8125rem] text-[#252B42]">{{ detailItem.services?.service_type || 'Standard' }}</p>
						<p v-if="detailItem.services?.date" class="text-[0.75rem] text-[#737373] mt-[4px]">Ritiro: {{ detailItem.services.date }}</p>
					</div>
					<!-- Importo -->
					<div class="bg-[#095866]/5 rounded-[12px] p-[16px] flex items-center justify-between">
						<span class="text-[0.875rem] font-bold text-[#252B42]">Importo</span>
						<span class="text-[1.25rem] font-bold text-[#095866]">{{ formatPrice(detailItem.single_price) }}</span>
					</div>
				</div>
			</template>
		</UModal>

		<!-- Delete confirm popup -->
		<UModal v-model:open="showDeleteConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Conferma eliminazione</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6]">
					Sei sicuro di voler rimuovere questa spedizione dal carrello? L'azione non può essere annullata.
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button
						type="button"
						@click="showDeleteConfirm = false"
						class="px-[20px] py-[10px] rounded-[10px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">
						Annulla
					</button>
					<button
						type="button"
						@click="confirmDelete"
						:disabled="deleteLoading"
						class="px-[20px] py-[10px] rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
