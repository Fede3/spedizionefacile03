<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const filters = ref(["Tutti", "Aperti", "Chiusi", "In giacenza", "Annullati"]);

const activeFilter = ref(0);
const textFilter = ref("Tutti");

const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", {
	method: "GET",
});

const { cart, refresh: refreshCart, status: cartStatus } = useCart();
const sanctumClient = useSanctumClient();
const router = useRouter();

const changeFilter = (filter, filterIndex) => {
	activeFilter.value = filterIndex;
	textFilter.value = filter;
};

const statusLabel = (status) => {
	const map = {
		pending: 'In attesa',
		processing: 'In lavorazione',
		completed: 'Completato',
		payment_failed: 'Pagamento fallito',
	};
	return map[status] || status;
};

const statusColor = (status) => {
	const map = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-emerald-100 text-emerald-700',
		payment_failed: 'bg-red-100 text-red-700',
	};
	return map[status] || 'bg-gray-100 text-gray-700';
};

/* Expand/collapse per spedizioni configurate */
const expandedCart = ref({});
const toggleCartExpand = (id) => {
	expandedCart.value[id] = !expandedCart.value[id];
};

/* Expand/collapse per ordini */
const expandedOrder = ref({});
const toggleOrderExpand = (id) => {
	expandedOrder.value[id] = !expandedOrder.value[id];
};

/* Elimina dal carrello */
const deletingId = ref(null);
const deleteFromCart = async (id) => {
	deletingId.value = id;
	try {
		await sanctumClient(`/api/cart/${id}`, { method: "DELETE" });
		await refreshCart();
	} catch (e) {
		// silent
	} finally {
		deletingId.value = null;
	}
};

const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '—';
	return (Number(cents) / 100).toFixed(2).replace('.', ',') + '€';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[1000px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni</span>
			</div>

			<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Le tue spedizioni</h1>

			<!-- Filtri -->
			<div class="flex flex-wrap gap-[8px] mb-[32px]">
				<button
					v-for="(filter, filterIndex) in filters"
					:key="filterIndex"
					@click="changeFilter(filter, filterIndex)"
					type="button"
					:class="filterIndex === activeFilter
						? 'bg-[#095866] text-white'
						: 'bg-[#F0F0F0] text-[#737373] hover:bg-[#E0E0E0]'"
					class="px-[18px] py-[10px] rounded-[30px] text-[0.875rem] font-medium cursor-pointer transition-colors">
					{{ filter }}
				</button>
			</div>

			<!-- Spedizioni configurate (nel carrello) -->
			<div v-if="cart?.data?.length > 0" class="mb-[40px]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[10px]">
					<span class="w-[8px] h-[8px] rounded-full bg-[#E44203]"></span>
					Spedizioni configurate
					<span class="text-[0.8125rem] font-normal text-[#737373]">({{ cart.data.length }})</span>
				</h2>

				<div class="space-y-[12px]">
					<div
						v-for="item in cart.data"
						:key="item.id"
						class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden transition-all"
						:class="expandedCart[item.id] ? 'border-[#095866]' : 'hover:border-[#095866]'">
						<!-- Header card -->
						<div class="p-[20px_24px] cursor-pointer" @click="toggleCartExpand(item.id)">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-[16px] flex-1 min-w-0">
									<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
										<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-[#E44203]"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
									</div>
									<div class="min-w-0">
										<p class="text-[0.9375rem] font-semibold text-[#252B42]">
											{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Destinazione' }}
										</p>
										<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
											{{ item.quantity }}x &ndash; {{ item.weight }} kg
											<span v-if="item.services?.service_type"> &middot; {{ item.services.service_type }}</span>
											<span v-if="item.single_price"> &middot; {{ formatPrice(item.single_price) }}</span>
										</p>
									</div>
								</div>
								<div class="flex items-center gap-[10px]">
									<span class="px-[10px] py-[4px] rounded-full text-[0.6875rem] font-medium bg-orange-100 text-orange-700 shrink-0">
										Configurata
									</span>
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] transition-transform shrink-0" :class="expandedCart[item.id] ? 'rotate-180' : ''"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6z"/></svg>
								</div>
							</div>
						</div>

						<!-- Dettagli espansi -->
						<div v-if="expandedCart[item.id]" class="border-t border-[#E9EBEC] p-[20px_24px] bg-[#fafafa]">
							<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] text-[0.8125rem]">
								<div>
									<p class="font-bold text-[#252B42] mb-[6px]">Partenza</p>
									<p class="text-[#737373]">{{ item.origin_address?.name }}</p>
									<p class="text-[#737373]">{{ item.origin_address?.address }} {{ item.origin_address?.address_number }}</p>
									<p class="text-[#737373]">{{ item.origin_address?.postal_code }} {{ item.origin_address?.city }} ({{ item.origin_address?.province }})</p>
								</div>
								<div>
									<p class="font-bold text-[#252B42] mb-[6px]">Destinazione</p>
									<p class="text-[#737373]">{{ item.destination_address?.name }}</p>
									<p class="text-[#737373]">{{ item.destination_address?.address }} {{ item.destination_address?.address_number }}</p>
									<p class="text-[#737373]">{{ item.destination_address?.postal_code }} {{ item.destination_address?.city }} ({{ item.destination_address?.province }})</p>
								</div>
							</div>
							<div class="mt-[12px] text-[0.8125rem]">
								<p class="text-[#737373]">
									<span class="font-semibold text-[#252B42]">Collo:</span>
									{{ item.package_type }} &ndash; {{ item.weight }} kg &ndash; {{ item.first_size }} &times; {{ item.second_size }} &times; {{ item.third_size }} cm
								</p>
							</div>
							<!-- Azioni -->
							<div class="mt-[16px] flex items-center gap-[10px] flex-wrap">
								<NuxtLink
									to="/carrello"
									class="inline-flex items-center gap-[6px] px-[16px] h-[36px] rounded-[10px] bg-[#095866] text-white text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M17 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2M1 2h3.27l.94 2H20a1 1 0 0 1 1 1c0 .17-.05.34-.12.5l-3.58 6.47c-.34.61-1 1.03-1.75 1.03H8.1l-.9 1.63l-.03.12a.25.25 0 0 0 .25.25H19v2H7a2 2 0 0 1-2-2c0-.35.09-.68.24-.96l1.36-2.45L3 4H1zm6 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2"/></svg>
									Vai al carrello
								</NuxtLink>
								<button
									type="button"
									@click.stop="deleteFromCart(item.id)"
									:disabled="deletingId === item.id"
									class="inline-flex items-center gap-[6px] px-[16px] h-[36px] rounded-[10px] border border-red-200 text-red-600 text-[0.8125rem] font-semibold hover:bg-red-50 transition cursor-pointer disabled:opacity-50">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/></svg>
									{{ deletingId === item.id ? 'Eliminando...' : 'Elimina' }}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Ordini -->
			<div>
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[10px]">
					<span class="w-[8px] h-[8px] rounded-full bg-emerald-500"></span>
					Ordini
				</h2>

				<!-- Loading -->
				<div v-if="ordersStatus === 'pending'" class="space-y-[12px]">
					<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] animate-pulse">
						<div class="flex items-center gap-[16px]">
							<div class="w-[44px] h-[44px] rounded-[10px] bg-gray-200"></div>
							<div class="flex-1 space-y-[8px]">
								<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
								<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Ordini lista -->
				<div v-else-if="orders?.data?.length > 0" class="space-y-[12px]">
					<div
						v-for="order in orders.data"
						:key="order.id"
						class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden transition-all"
						:class="expandedOrder[order.id] ? 'border-[#095866]' : 'hover:border-[#095866]'">
						<!-- Header -->
						<div class="p-[20px_24px] cursor-pointer" @click="toggleOrderExpand(order.id)">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-[16px] flex-1 min-w-0">
									<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
										<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5m-11 9a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5z"/></svg>
									</div>
									<div class="min-w-0">
										<div class="flex items-center gap-[8px] flex-wrap">
											<p class="text-[0.9375rem] font-semibold text-[#252B42]">
												Ordine #{{ order.id }}
											</p>
											<span :class="statusColor(order.status)" class="px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium">
												{{ statusLabel(order.status) }}
											</span>
										</div>
										<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
											<template v-if="order.packages?.length > 0">
												{{ order.packages[0].origin_address?.city }}
												&rarr;
												{{ order.packages[0].destination_address?.city }}
											</template>
											<span class="ml-[8px]">{{ order.created_at }}</span>
										</p>
									</div>
								</div>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] transition-transform shrink-0" :class="expandedOrder[order.id] ? 'rotate-180' : ''"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6l-6-6z"/></svg>
							</div>
						</div>

						<!-- Dettagli espansi ordine -->
						<div v-if="expandedOrder[order.id]" class="border-t border-[#E9EBEC] p-[20px_24px] bg-[#fafafa]">
							<div v-if="order.packages?.length > 0">
								<div v-for="(pkg, pIdx) in order.packages" :key="pIdx" class="mb-[16px] last:mb-0">
									<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] text-[0.8125rem]">
										<div>
											<p class="font-bold text-[#252B42] mb-[6px]">Partenza</p>
											<p class="text-[#737373]">{{ pkg.origin_address?.name }}</p>
											<p class="text-[#737373]">{{ pkg.origin_address?.address }} {{ pkg.origin_address?.address_number }}</p>
											<p class="text-[#737373]">{{ pkg.origin_address?.postal_code }} {{ pkg.origin_address?.city }} ({{ pkg.origin_address?.province }})</p>
										</div>
										<div>
											<p class="font-bold text-[#252B42] mb-[6px]">Destinazione</p>
											<p class="text-[#737373]">{{ pkg.destination_address?.name }}</p>
											<p class="text-[#737373]">{{ pkg.destination_address?.address }} {{ pkg.destination_address?.address_number }}</p>
											<p class="text-[#737373]">{{ pkg.destination_address?.postal_code }} {{ pkg.destination_address?.city }} ({{ pkg.destination_address?.province }})</p>
										</div>
									</div>
									<div class="mt-[8px] text-[0.8125rem]">
										<p class="text-[#737373]">
											<span class="font-semibold text-[#252B42]">Collo:</span>
											{{ pkg.package_type }} &ndash; {{ pkg.weight }} kg &ndash; {{ pkg.first_size }} &times; {{ pkg.second_size }} &times; {{ pkg.third_size }} cm
										</p>
										<p v-if="pkg.services" class="text-[#737373] mt-[4px]">
											<span class="font-semibold text-[#252B42]">Servizi:</span> {{ pkg.services.service_type || 'Nessuno' }}
										</p>
									</div>
								</div>
							</div>
							<!-- Azioni ordine -->
							<div class="mt-[16px] flex items-center gap-[10px] flex-wrap">
								<NuxtLink
									:to="`/account/spedizioni/${order.id}`"
									class="inline-flex items-center gap-[6px] px-[16px] h-[36px] rounded-[10px] bg-[#095866] text-white text-[0.8125rem] font-semibold hover:bg-[#0a7a8c] transition">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m0 8a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5a5 5 0 0 1-5 5m0-12.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5"/></svg>
									Vedi dettagli
								</NuxtLink>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty state -->
				<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
					<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-[#C8CCD0]"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
					</div>
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
						Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.
					</p>
					<NuxtLink
						:to="{ path: '/', hash: '#preventivo' }"
						class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
						Crea nuova spedizione
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>
