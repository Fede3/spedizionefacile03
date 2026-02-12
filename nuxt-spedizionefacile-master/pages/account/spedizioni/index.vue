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

const { cart, status: cartStatus } = useCart();

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

			<!-- Spedizioni configurate (nel carrello, non ancora ordinate) -->
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
						class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] hover:border-[#095866] transition-all">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-[16px] flex-1 min-w-0">
								<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
									<Icon name="mdi:package-variant-closed" class="text-[22px] text-[#E44203]" />
								</div>
								<div class="min-w-0">
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">
										{{ item.origin_address?.city || 'Partenza' }} &rarr; {{ item.destination_address?.city || 'Destinazione' }}
									</p>
									<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
										{{ item.quantity }}x &ndash; {{ item.weight }} kg
										<span v-if="item.services?.service_type"> &middot; {{ item.services.service_type }}</span>
									</p>
								</div>
							</div>
							<span class="px-[10px] py-[4px] rounded-full text-[0.6875rem] font-medium bg-orange-100 text-orange-700 shrink-0">
								Configurata
							</span>
						</div>
					</div>
				</div>

				<div class="mt-[16px]">
					<NuxtLink
						to="/carrello"
						class="inline-flex items-center gap-[6px] text-[#095866] hover:text-[#0a7a8c] text-[0.875rem] font-semibold transition">
						Vai al carrello per procedere al pagamento
						<Icon name="mdi:arrow-right" class="text-[16px]" />
					</NuxtLink>
				</div>
			</div>

			<!-- Ordini / Spedizioni completate -->
			<div>
				<h2 v-if="cart?.data?.length > 0" class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[10px]">
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
					<NuxtLink
						v-for="order in orders.data"
						:key="order.id"
						:to="`/account/spedizioni/${order.id}`"
						class="block bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] hover:border-[#095866] hover:shadow-sm transition-all">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-[16px] flex-1 min-w-0">
								<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
									<Icon name="mdi:truck-delivery-outline" class="text-[22px] text-[#095866]" />
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-[8px]">
										<p class="text-[0.9375rem] font-semibold text-[#252B42]">
											Ordine #{{ order.id }}
										</p>
										<span :class="statusColor(order.status)" class="px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium">
											{{ statusLabel(order.status) }}
										</span>
									</div>
									<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
										<template v-if="order.packages?.length > 0">
											{{ order.packages[0].origin_address?.city }} ({{ order.packages[0].origin_address?.province }})
											&rarr;
											{{ order.packages[0].destination_address?.city }} ({{ order.packages[0].destination_address?.province }})
										</template>
										<span class="ml-[8px]">{{ order.created_at }}</span>
									</p>
								</div>
							</div>
							<Icon name="mdi:chevron-right" class="text-[20px] text-[#C8CCD0] shrink-0" />
						</div>
					</NuxtLink>
				</div>

				<!-- Empty state -->
				<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
					<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<Icon name="mdi:package-variant" class="text-[32px] text-[#C8CCD0]" />
					</div>
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
						Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.
					</p>
					<NuxtLink
						to="/"
						class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
						Crea spedizione
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>
