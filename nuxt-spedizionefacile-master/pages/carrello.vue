<script setup>
const { cart, refresh, status } = useCart();
const { isAuthenticated } = useSanctumAuth();
const sanctum = useSanctumClient();
const router = useRouter();

const endpoint = computed(() => (isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart"));

// Force fresh cart data every time the page is visited (useSanctumFetch caches)
onMounted(async () => {
	await refresh();
});

// Filters
const filterProvenienza = ref('');
const filterRiferimento = ref('');

const filteredCartItems = computed(() => {
	if (!cart.value?.data) return [];
	let items = [...cart.value.data];
	if (filterProvenienza.value) {
		items = items.filter(item =>
			item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
		);
	}
	if (filterRiferimento.value) {
		items = items.filter(item =>
			String(item.id).includes(filterRiferimento.value) ||
			(item.origin_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
			(item.destination_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase())
		);
	}
	return items;
});

const uniqueCities = computed(() => {
	if (!cart.value?.data) return [];
	const cities = cart.value.data.map(item => item.origin_address?.city).filter(Boolean);
	return [...new Set(cities)];
});

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

// Price helper
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00€';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '€';
};

const formatDate = (item) => {
	if (item.created_at) {
		return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPackageIcon = (item) => {
	const type = item.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png';
	return '/img/quote/first-step/pack.png';
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
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container max-w-[1200px]">
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
			<div v-else-if="cart?.data?.length > 0" class="max-w-[1200px] mx-auto">
				<!-- Title -->
				<h1 class="text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
				<div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>

				<!-- Main card -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[30px_36px] border border-dashed border-[#B0B0B0]">
					<!-- Filters row -->
					<div class="flex flex-wrap gap-[16px] items-center mb-[20px]">
						<div class="flex-1 min-w-[200px] max-w-[400px]">
							<select v-model="filterProvenienza" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040] appearance-none cursor-pointer">
								<option value="">Provenienza</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div class="flex-1 min-w-[200px] max-w-[400px] ml-auto">
							<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040] placeholder:text-[#999]" />
						</div>
					</div>

					<!-- Dotted divider -->
					<div class="border-t border-dashed border-[#B0B0B0] my-[16px]"></div>

					<!-- Coupon row -->
					<div class="flex flex-wrap items-center gap-[16px] mb-[20px]">
						<span class="text-[1rem] font-bold text-[#252B42]">Inserisci Cupon</span>
						<div class="flex-1 max-w-[300px]">
							<input
								v-if="!couponApplied"
								type="text"
								v-model="couponCode"
								placeholder="PROVA123"
								class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[44px] px-[18px] text-[0.875rem] text-[#404040] placeholder:text-[#999]" />
							<div v-else class="flex items-center gap-[8px] bg-emerald-50 border border-emerald-200 rounded-[30px] h-[44px] px-[18px]">
								<span class="text-emerald-700 font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
								<button @click="removeCoupon" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer ml-auto">X</button>
							</div>
						</div>
						<button
							v-if="!couponApplied"
							type="button"
							@click="applyCoupon"
							class="bg-[#252B42] text-white font-semibold text-[0.9375rem] px-[28px] h-[44px] rounded-[30px] hover:opacity-90 transition cursor-pointer">
							Applica Cupon
						</button>
					</div>
					<p v-if="couponMessage" class="text-[0.8125rem] mb-[12px]" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
						{{ couponMessage.text }}
					</p>

					<!-- Dotted divider -->
					<div class="border-t border-dashed border-[#B0B0B0] my-[16px]"></div>

					<!-- Spedizioni table -->
					<h2 class="text-[1.25rem] font-bold text-[#252B42] text-center mb-[16px]">Spedizioni</h2>

					<!-- Table header -->
					<div class="hidden desktop:grid grid-cols-[40px_140px_100px_80px_80px_170px_80px_90px_90px] gap-[8px] px-[12px] py-[10px] text-[0.8125rem] font-bold text-[#252B42] border-b-[2px] border-[#252B42]">
						<span></span>
						<span>Partenza</span>
						<span>Destinazione</span>
						<span>Servizio</span>
						<span>Colli</span>
						<span>Indirizzi</span>
						<span>Accessori</span>
						<span>Importo</span>
						<span>Riferimenti</span>
					</div>

					<!-- Table rows -->
					<div>
						<div
							v-for="(item, idx) in filteredCartItems"
							:key="item.id"
							class="hidden desktop:grid grid-cols-[40px_140px_100px_80px_80px_170px_80px_90px_90px] gap-[8px] items-center px-[12px] py-[12px] border-b border-[#C0C0C0] text-[0.8125rem] text-[#252B42]">
							<!-- # -->
							<span class="font-semibold">{{ idx + 1 }}</span>
							<!-- Partenza -->
							<span class="text-[0.8125rem]">{{ formatDate(item) }} - {{ item.origin_address?.name || '—' }}</span>
							<!-- Destinazione -->
							<span class="text-[0.8125rem]">{{ item.destination_address?.name?.split(' ')[0] || '—' }}</span>
							<!-- Servizio -->
							<span class="text-[0.8125rem]">{{ item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}</span>
							<!-- Colli -->
							<span class="flex items-center gap-[4px] text-[0.8125rem]">
								{{ item.quantity || 1 }} x
								<NuxtImg :src="getPackageIcon(item)" alt="" width="20" height="20" />
							</span>
							<!-- Indirizzi -->
							<span class="text-[0.75rem]">
								<div class="flex items-center gap-[4px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.origin_address?.name?.split(' ')[0] || '' }} - {{ item.origin_address?.city || '' }}</span>
								</div>
								<div class="flex items-center gap-[4px] mt-[4px]">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
									<span class="truncate">{{ item.destination_address?.name?.split(' ')[0] || '' }} - {{ item.destination_address?.city || '' }}</span>
								</div>
							</span>
							<!-- Accessori -->
							<span class="text-[0.8125rem] text-[#737373]">......</span>
							<!-- Importo -->
							<span class="text-[0.8125rem] font-semibold">{{ formatPrice(item.single_price) }}</span>
							<!-- Riferimenti -->
							<span class="text-[0.8125rem] text-[#737373]">......</span>
						</div>

						<!-- Mobile cards -->
						<div v-for="(item, idx) in filteredCartItems" :key="'m-'+item.id" class="desktop:hidden p-[16px] border-b border-[#C0C0C0]">
							<div class="flex items-center justify-between mb-[8px]">
								<div>
									<p class="text-[0.875rem] font-semibold text-[#252B42]">#{{ idx + 1 }} {{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Destinazione' }}</p>
									<p class="text-[0.75rem] text-[#737373]">{{ item.quantity }}x &ndash; {{ item.weight }} kg</p>
								</div>
								<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
							</div>
							<div class="flex gap-[12px] justify-end">
								<button type="button" @click="askDelete(item.id)" class="text-[0.75rem] text-red-500 font-semibold hover:underline cursor-pointer">Elimina</button>
							</div>
						</div>
					</div>

					<!-- Totals -->
					<div class="mt-[16px] border-t border-[#C0C0C0] pt-[12px]">
						<div class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
							<span class="text-[0.9375rem] font-bold text-[#252B42]">Importo spedizioni</span>
							<span class="text-[0.9375rem] font-bold text-[#252B42]" :class="{ 'line-through text-[#A0A5AB]': couponApplied }">{{ cart.meta?.total }}</span>
						</div>
						<div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
							<span class="text-[0.9375rem] font-bold text-emerald-600">Sconto coupon ({{ couponDiscount }}%)</span>
							<span class="text-[0.9375rem] font-bold text-emerald-600">{{ appliedTotal }}</span>
						</div>
						<div class="flex items-center justify-between py-[8px]">
							<span class="text-[1rem] font-bold text-[#252B42]">Importo totale</span>
							<span class="text-[1rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
						</div>
					</div>

					<!-- Action button -->
					<div class="flex justify-center mt-[24px]">
						<NuxtLink
							to="/checkout"
							class="inline-flex items-center justify-center gap-[8px] px-[40px] h-[52px] rounded-[30px] bg-[#252B42] text-white font-semibold text-[1rem] hover:opacity-90 transition">
							Procedi con l'ordine
						</NuxtLink>
					</div>
				</div>
			</div>

			<!-- Empty cart -->
			<div v-else-if="status === 'success'" class="max-w-[600px] mx-auto py-[80px] text-center">
				<h1 class="text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
				<div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>
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
