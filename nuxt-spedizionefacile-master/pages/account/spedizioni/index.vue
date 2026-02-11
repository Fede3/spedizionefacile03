<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const filters = ref(["Tutti", "Aperti", "Chiusi", "In giacenza", "Annullati"]);

const filteredPages = ref(null);

const activeFilter = ref(0);

const textFilter = ref("Tutti");

/* const filteredOrders = computed(() => {
	return filters.value.map((filter, index) => {
		if (index == activeFilter.value) {
			return filter.active;
		}
	});
}); */

const { data: orders, refresh } = useSanctumFetch("/api/orders", {
	method: "GET",
	/* params: {
		textFilter: textFilter.value,
	}, */
});

const changeFilter = (filter, filterIndex) => {
	activeFilter.value = filterIndex;
	textFilter.value = filter;
};

/* watch(textFilter, async (newFilter) => {
	await execute();
	console.log(newFilter);
}); */
</script>

<template>
	<section>
		<div class="my-container my-[80px]">
			<ul class="flex justify-center leading-[54px] h-[53px] mb-[71px]">
				<li v-for="(filter, filterIndex) in filters" :key="filterIndex">
					<button
						@click="changeFilter(filter, filterIndex)"
						type="button"
						:class="{ 'bg-[#E44203] rounded-[38px] text-white ': filterIndex === activeFilter }"
						class="h-full cursor-pointer px-[24px] text-[#737373]">
						{{ filter }}
					</button>
				</li>
			</ul>

			<!-- <table class="table-fixed w-full bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>ID Ordine</th>
						<th>Data</th>
						<th>Cliente</th>
						<th>Totale</th>
						<th>Stato</th>
						<th>Conferma ordine</th>
						<th></th>
					</tr>
				</thead>

				<tbody>
					<tr v-for="order in orders.data" :key="order.id">
						<td>
							{{ order.id }}
						</td>
						<td>
							{{ order.created_at }}
						</td>
						<td>{{ order.user.name }} {{ order.user.surname }}</td>

						<td>
							{{ order.subtotal }}
						</td>

						<td>
							{{ order.status }}
						</td>
						<td>Non confermato</td>

						<td>
							<NuxtLink :to="`/account/amministrazione/spedizioni/${order.id}`" class="font-bold">Vedi dettaglio</NuxtLink>
						</td>
					</tr>
				</tbody>
			</table> -->

			<ul v-if="orders">
				<li v-for="order in orders?.data" :key="order.id" class="bg-[#E3E3E3] mt-[64px] first:mt-0 p-[16px_35px] rounded-[20px] text-[#525252]">
					<p>
						{{ order.status }}
					</p>
					<table class="w-full text-left">
						<thead>
							<tr>
								<th class="font-normal">Numero Ordine</th>
								<th class="font-normal">Data</th>
								<th class="font-normal">Indirizzo</th>
								<th class="font-normal">Mittente</th>
								<th class="font-normal">Destinatario</th>
								<th class="font-normal">Servizio</th>
								<th></th>
							</tr>
						</thead>

						<tbody>
							<tr>
								<td>#{{ order.id }}</td>
								<td>
									{{ order.created_at }}
								</td>
								<td>
									{{ order.packages[0].origin_address?.city }} ({{ order.packages[0].origin_address?.province }}) -> {{ order.packages[0].destination_address?.city }} ({{
										order.packages[0].destination_address?.province
									}})
								</td>

								<td>
									{{ order.packages[0].origin_address?.name }}
								</td>

								<td>
									{{ order.packages[0].destination_address?.name }}
								</td>
								<td>{{ order.packages[0].services?.service_type }}</td>

								<td>
									<NuxtLink :to="`/account/spedizioni/${order.id}`" class="font-bold">Vedi dettaglio</NuxtLink>
								</td>
							</tr>
						</tbody>
					</table>
				</li>
			</ul>

			<p v-else class="text-center">Caricamento...</p>

			<p v-if="orders?.data?.length === 0">Nessun risultato</p>
		</div>
	</section>
</template>
