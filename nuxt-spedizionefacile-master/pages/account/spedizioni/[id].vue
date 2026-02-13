<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const route = useRoute();
const orderId = route.params.id;

const { data: order, status: orderStatus } = useSanctumFetch(`/api/orders/${orderId}`);

const formatDate = (dateStr) => {
	if (!dateStr) return '—';
	try {
		return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	} catch (e) {
		return dateStr;
	}
};

const statusColor = (status) => {
	const map = {
		'In attesa': 'bg-yellow-100 text-yellow-700',
		'In lavorazione': 'bg-blue-100 text-blue-700',
		'Completato': 'bg-emerald-100 text-emerald-700',
		'Fallito': 'bg-red-100 text-red-700',
		'Pagato': 'bg-emerald-100 text-emerald-700',
		'Annullato': 'bg-gray-100 text-gray-700',
		'In transito': 'bg-blue-100 text-blue-700',
		'Consegnato': 'bg-emerald-100 text-emerald-700',
		'In giacenza': 'bg-orange-100 text-orange-700',
	};
	return map[status] || 'bg-gray-100 text-gray-700';
};

const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00€';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '€';
};

const orderData = computed(() => order.value?.data || order.value || null);
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[900px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<NuxtLink to="/account/spedizioni" class="hover:underline text-[#095866]">Spedizioni</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Ordine #{{ orderId }}</span>
			</div>

			<!-- Loading -->
			<div v-if="orderStatus === 'pending'" class="space-y-[16px]">
				<div class="bg-white rounded-[16px] p-[32px] border border-[#E9EBEC] animate-pulse">
					<div class="h-[24px] bg-gray-200 rounded w-[40%] mb-[16px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[60%] mb-[8px]"></div>
					<div class="h-[16px] bg-gray-200 rounded w-[50%]"></div>
				</div>
			</div>

			<template v-else-if="orderData">
				<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Ordine #{{ orderData.id }}</h1>

				<!-- Status & Date -->
				<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] mb-[16px]">
					<div class="flex items-center justify-between mb-[16px]">
						<span :class="statusColor(orderData.status)" class="px-[16px] py-[6px] rounded-full text-[0.875rem] font-semibold">
							{{ orderData.status }}
						</span>
						<span class="text-[0.875rem] text-[#737373]">{{ formatDate(orderData.created_at) }}</span>
					</div>
					<div class="grid grid-cols-2 gap-[16px]">
						<div>
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Numero Ordine</p>
							<p class="text-[0.9375rem] font-semibold text-[#252B42]">#{{ orderData.id }}</p>
						</div>
						<div>
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[4px]">Totale</p>
							<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ formatPrice(orderData.subtotal) }}</p>
						</div>
					</div>
				</div>

				<!-- Packages -->
				<div v-if="orderData.packages?.length" class="space-y-[12px]">
					<div v-for="(pkg, pkgIdx) in orderData.packages" :key="pkg.id || pkgIdx" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC]">
						<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Collo #{{ pkgIdx + 1 }}</h3>

						<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[14px] mb-[16px]">
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Tipo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.package_type || 'Pacco' }}</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Peso</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.weight }} kg</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Dimensioni</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ pkg.first_size }} x {{ pkg.second_size }} x {{ pkg.third_size }} cm</p>
							</div>
							<div>
								<p class="text-[0.6875rem] text-[#737373] uppercase font-medium mb-[2px]">Prezzo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ formatPrice(pkg.single_price) }}</p>
							</div>
						</div>

						<!-- Origin Address -->
						<div v-if="pkg.origin_address" class="bg-[#F8F9FB] rounded-[10px] p-[16px] mb-[10px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Mittente</p>
							<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.origin_address.name }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.address }} {{ pkg.origin_address.address_number }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.origin_address.postal_code }} {{ pkg.origin_address.city }} ({{ pkg.origin_address.province }})</p>
							<p v-if="pkg.origin_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.origin_address.telephone_number }}</p>
						</div>

						<!-- Destination Address -->
						<div v-if="pkg.destination_address" class="bg-[#F8F9FB] rounded-[10px] p-[16px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Destinatario</p>
							<p class="text-[0.875rem] font-semibold text-[#252B42]">{{ pkg.destination_address.name }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.address }} {{ pkg.destination_address.address_number }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ pkg.destination_address.postal_code }} {{ pkg.destination_address.city }} ({{ pkg.destination_address.province }})</p>
							<p v-if="pkg.destination_address.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ pkg.destination_address.telephone_number }}</p>
						</div>

						<!-- Service -->
						<div v-if="pkg.services" class="mt-[10px] bg-[#F8F9FB] rounded-[10px] p-[16px]">
							<p class="text-[0.75rem] text-[#737373] uppercase font-medium mb-[6px]">Servizio</p>
							<p class="text-[0.875rem] text-[#252B42]">{{ pkg.services.service_type || 'Standard' }}</p>
							<p v-if="pkg.services.date" class="text-[0.8125rem] text-[#737373]">Data: {{ pkg.services.date }}</p>
						</div>
					</div>
				</div>

				<!-- Back -->
				<div class="mt-[24px]">
					<NuxtLink to="/account/spedizioni" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.875rem] hover:bg-[#0a7a8c] transition">
						&larr; Torna alle spedizioni
					</NuxtLink>
				</div>
			</template>

			<!-- Not found -->
			<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<p class="text-[1rem] text-[#737373]">Ordine non trovato.</p>
				<NuxtLink to="/account/spedizioni" class="inline-block mt-[16px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[10px] font-semibold text-[0.875rem] hover:bg-[#0a7a8c] transition">
					Torna alle spedizioni
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
