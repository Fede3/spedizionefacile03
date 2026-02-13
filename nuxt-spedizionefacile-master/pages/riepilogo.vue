<script setup>
const userStore = useUserStore();
const { isAuthenticated } = useSanctumAuth();
const sanctumClient = useSanctumClient();
const { endpoint, refresh: refreshCart } = useCart();
const { session } = useSession();

const isSubmitting = ref(false);
const submitError = ref(null);

const shipment = computed(() => userStore.pendingShipment);

// If no pending shipment, redirect back
if (!shipment.value) {
	navigateTo('/la-tua-spedizione/2');
}

const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00€';
	const euros = Number(cents) / 100;
	return euros.toFixed(2).replace('.', ',') + '€';
};

const totalPrice = computed(() => {
	return session.value?.data?.total_price || '0€';
});

const goToCart = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	submitError.value = null;
	try {
		await sanctumClient(isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart", {
			method: "DELETE",
		});
		await sanctumClient(endpoint.value, {
			method: "POST",
			body: shipment.value,
		});
		clearNuxtData("cart");
		await refreshCart();
		navigateTo('/carrello');
	} catch (error) {
		console.error('Cart save error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio nel carrello. Riprova.";
	} finally {
		isSubmitting.value = false;
	}
};

const goToSavedShipments = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	submitError.value = null;
	try {
		await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: shipment.value,
		});
		navigateTo('/account/spedizioni-configurate');
	} catch (error) {
		console.error('Saved shipments error:', error);
		const errorData = error?.response?._data || error?.data;
		submitError.value = errorData?.message || "Errore durante il salvataggio. Riprova.";
	} finally {
		isSubmitting.value = false;
	}
};

const addAnotherShipment = async () => {
	if (!shipment.value) return;
	isSubmitting.value = true;
	try {
		await sanctumClient("/api/saved-shipments", {
			method: "POST",
			body: shipment.value,
		});
	} catch (e) {
		console.error('Add another error:', e);
	}
	isSubmitting.value = false;
	navigateTo('/preventivo');
};

const goBack = () => {
	navigateTo('/la-tua-spedizione/2?step=ritiro');
};
</script>

<template>
	<section class="min-h-[600px]">
		<div class="my-container mt-[72px] mb-[120px]">
			<Steps :current-step="3" />

			<div v-if="!shipment" class="text-center py-[60px]">
				<p class="text-[1rem] text-[#737373]">Nessuna spedizione da riepilogare. Torna indietro per configurare la tua spedizione.</p>
				<NuxtLink to="/la-tua-spedizione/2" class="inline-block mt-[20px] px-[24px] py-[12px] bg-[#095866] text-white rounded-[10px] font-semibold hover:bg-[#0a7a8c] transition-colors">
					Torna alla configurazione
				</NuxtLink>
			</div>

			<div v-else class="max-w-[900px] mx-auto">
				<h1 class="text-[1.75rem] font-bold text-[#252B42] text-center mb-[32px] font-montserrat">Riepilogo spedizione</h1>

				<!-- Colli -->
				<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px] mb-[16px]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px]">Colli</h2>
					<div class="space-y-[10px]">
						<div v-for="(pkg, idx) in shipment.packages" :key="idx" class="bg-white rounded-[12px] p-[16px] flex items-center justify-between">
							<div class="flex items-center gap-[16px]">
								<div class="w-[44px] h-[44px] rounded-[10px] bg-[#F8F9FB] flex items-center justify-center">
									<NuxtImg src="/img/quote/first-step/pack.png" alt="" width="28" height="28" />
								</div>
								<div>
									<p class="text-[0.9375rem] font-semibold text-[#252B42]">{{ pkg.package_type || 'Pacco' }} #{{ idx + 1 }}</p>
									<p class="text-[0.8125rem] text-[#737373]">{{ pkg.quantity || 1 }}x &ndash; {{ pkg.weight }} kg &ndash; {{ pkg.first_size }}x{{ pkg.second_size }}x{{ pkg.third_size }} cm</p>
								</div>
							</div>
							<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(pkg.single_price) }}</span>
						</div>
					</div>
				</div>

				<!-- Indirizzi -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px] mb-[16px]">
					<!-- Partenza -->
					<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[8px]">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
							Partenza
						</h2>
						<div class="text-[0.875rem] text-[#252B42] space-y-[4px]">
							<p class="font-semibold">{{ shipment.origin_address?.name }}</p>
							<p>{{ shipment.origin_address?.address }} {{ shipment.origin_address?.address_number }}</p>
							<p>{{ shipment.origin_address?.postal_code }} {{ shipment.origin_address?.city }} ({{ shipment.origin_address?.province }})</p>
							<p v-if="shipment.origin_address?.telephone_number && shipment.origin_address.telephone_number !== '0000000000'" class="text-[#737373]">Tel: {{ shipment.origin_address.telephone_number }}</p>
							<p v-if="shipment.origin_address?.email" class="text-[#737373]">{{ shipment.origin_address.email }}</p>
						</div>
					</div>

					<!-- Destinazione -->
					<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px] flex items-center gap-[8px]">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
							Destinazione
						</h2>
						<div class="text-[0.875rem] text-[#252B42] space-y-[4px]">
							<p class="font-semibold">{{ shipment.destination_address?.name }}</p>
							<p>{{ shipment.destination_address?.address }} {{ shipment.destination_address?.address_number }}</p>
							<p>{{ shipment.destination_address?.postal_code }} {{ shipment.destination_address?.city }} ({{ shipment.destination_address?.province }})</p>
							<p v-if="shipment.destination_address?.telephone_number && shipment.destination_address.telephone_number !== '0000000000'" class="text-[#737373]">Tel: {{ shipment.destination_address.telephone_number }}</p>
							<p v-if="shipment.destination_address?.email" class="text-[#737373]">{{ shipment.destination_address.email }}</p>
						</div>
					</div>
				</div>

				<!-- Servizi + Data -->
				<div class="bg-[#E4E4E4] rounded-[20px] p-[28px_32px] mb-[16px]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[12px]">Servizi e data ritiro</h2>
					<div class="flex flex-wrap gap-[24px]">
						<div>
							<p class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Servizi</p>
							<p class="text-[0.9375rem] text-[#252B42] font-semibold">{{ shipment.services?.service_type || 'Nessun servizio aggiuntivo' }}</p>
						</div>
						<div v-if="shipment.services?.date">
							<p class="text-[0.75rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Data ritiro</p>
							<p class="text-[0.9375rem] text-[#252B42] font-semibold">{{ shipment.services.date }}</p>
						</div>
					</div>
				</div>

				<!-- Totale -->
				<div class="bg-[#252B42] rounded-[20px] p-[24px_32px] mb-[24px] flex items-center justify-between">
					<span class="text-white text-[1.125rem] font-semibold">Totale (IVA inclusa)</span>
					<span class="text-white text-[1.75rem] font-bold">{{ totalPrice }}€</span>
				</div>

				<!-- Error -->
				<div v-if="submitError" class="mb-[16px] p-[14px] bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-red-500 shrink-0"><path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/></svg>
					<p class="text-red-600 text-[0.9375rem] font-medium">{{ submitError }}</p>
				</div>

				<!-- Azioni -->
				<div class="flex flex-col gap-[12px]">
					<button
						@click="goToCart"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-[#095866]/10 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-[#095866]"><path fill="currentColor" d="M17 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2M1 2h3.27l.94 2H20a1 1 0 0 1 1 1c0 .17-.05.34-.12.5l-3.58 6.47c-.34.61-1 1.03-1.75 1.03H8.1l-.9 1.63l-.03.12a.25.25 0 0 0 .25.25H19v2H7a2 2 0 0 1-2-2c0-.35.09-.68.24-.96l1.36-2.45L3 4H1zm6 16a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2c0-1.11.89-2 2-2"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi al carrello e procedi al pagamento</p>
							<p class="text-[0.8125rem] text-[#737373]">Aggiungi la spedizione al carrello per procedere al pagamento</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>

					<button
						v-if="isAuthenticated"
						@click="goToSavedShipments"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-blue-50 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-blue-600"><path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18c-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18c.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15L6.04 7.5L12 10.85l5.96-3.35zM5 15.91l6 3.37v-6.73L5 9.18zm14 0V9.18l-6 3.37v6.73z"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Salva nelle spedizioni configurate</p>
							<p class="text-[0.8125rem] text-[#737373]">Salva la spedizione per riutilizzarla in futuro</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>

					<button
						@click="addAnotherShipment"
						:disabled="isSubmitting"
						class="w-full flex items-center gap-[14px] p-[16px] rounded-[12px] border border-[#E9EBEC] bg-white hover:border-[#095866] hover:bg-[#f0fafb] transition-all cursor-pointer group disabled:opacity-60">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-orange-50 flex items-center justify-center shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" class="text-orange-600"><path fill="currentColor" d="M17 13h-4v4h-2v-4H7v-2h4V7h2v4h4m-5-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/></svg>
						</div>
						<div class="text-left flex-1">
							<p class="text-[0.9375rem] font-semibold text-[#252B42] group-hover:text-[#095866]">Aggiungi un'altra spedizione</p>
							<p class="text-[0.8125rem] text-[#737373]">Configura una nuova spedizione</p>
						</div>
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" class="text-[#C8CCD0] shrink-0"><path fill="currentColor" d="M8.59 16.59L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/></svg>
					</button>
				</div>

				<!-- Back button -->
				<div class="mt-[24px] flex justify-start">
					<button @click="goBack" class="inline-flex items-center gap-[8px] px-[24px] h-[48px] rounded-[30px] bg-[#095866] text-white font-semibold hover:bg-[#0a7a8c] transition cursor-pointer">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
						Indietro
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
