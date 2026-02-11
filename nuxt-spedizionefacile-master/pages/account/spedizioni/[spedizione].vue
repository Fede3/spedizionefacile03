<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const route = useRoute();

const { data: order, error } = await useSanctumFetch(`/api/orders/${route.params.spedizione}`, {
	method: "GET",
});

const checkError = () => {
	if (error.value && error.value.statusCode === 403) {
		return navigateTo("/account");
	}
};

await checkError();

/* const getPayment = (type) => {
	if (type === "card") {
		return "Carta";
	}
}; */
</script>

<template>
	<section>
		<div class="my-container">
			<h1>Dettaglio ordine ID {{ order?.data?.id }} effettuato in data {{ order?.data?.created_at }}</h1>

			<h2 class="mt-[40px]">Cliente</h2>

			<table class="table-fixed w-full bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>Nome e cognome</th>
						<th>Ruolo</th>
						<th>Email</th>
						<th>Numero di telefono</th>
					</tr>
				</thead>

				<tbody>
					<tr>
						<td>{{ order?.data?.user.name }} {{ order?.data?.user.surname }}</td>
						<td>
							{{ order?.data?.user.role }}
						</td>
						<td>
							{{ order?.data?.user.email }}
						</td>
						<td>
							{{ order?.data?.user.telephone_number }}
						</td>
					</tr>
				</tbody>
			</table>
			<!-- <ul>
				<li>Effettuato da: {{ order?.data?.user.name }} {{ order?.data?.user.surname }}</li>
				<li>Ruolo: {{ order?.data?.user.role }}</li>

				<li>Email: {{ order?.data?.user.email }}</li>
				<li>Numero di telefono: {{ order?.data?.user.telephone_number }}</li>
			</ul> -->

			<h2 class="mt-[40px]">Collo</h2>

			<table class="table-fixed w-full bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>Tipologia</th>
						<th>Misure</th>
						<th>Quantità</th>
						<th>Servizio</th>
					</tr>
				</thead>

				<tbody>
					<tr v-for="pack in order?.data?.packages" :key="pack.id">
						<td>{{ pack.package_type }}</td>
						<td>{{ pack.first_size }}cm x {{ pack.second_size }}cm x {{ pack.third_size }}cm</td>
						<td>
							{{ pack.quantity }}
						</td>

						<td>{{ pack.services?.service_type }}</td>
					</tr>
				</tbody>
			</table>

			<!-- <ul>
				<li v-for="pack in order?.data?.packages" :key="pack.id">
					<div>Tipologia: {{ pack.package_type }}</div>

					<div>Quantità: {{ pack.quantity }}</div>

					<div>Misure: {{ pack.first_size }} x {{ pack.second_size }} x {{ pack.third_size }}</div>
				</li>
			</ul> -->

			<h2 class="mt-[40px]">Indirizzo di partenza</h2>

			<table class="table-fixed w-full bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>Nome</th>
						<th>Luogo</th>
						<th>Indirizzo</th>
						<th>Numero di telefono</th>
						<th>Email</th>
					</tr>
				</thead>

				<tbody>
					<tr>
						<td>
							{{ order?.data?.packages[0].origin_address?.name }}
						</td>
						<td>{{ order?.data?.packages[0].origin_address?.city }} ({{ order?.data?.packages[0].origin_address?.province }}) - {{ order?.data?.packages[0].origin_address?.postal_code }}</td>
						<td>{{ order?.data?.packages[0].origin_address?.address }} {{ order?.data?.packages[0].origin_address?.address_number }}</td>

						<td>
							{{ order?.data?.packages[0].origin_address?.telephone_number }}
						</td>
						<td>
							{{ order?.data?.packages[0].origin_address?.email ?? "Non specificata" }}
						</td>
					</tr>
				</tbody>
			</table>

			<!-- <ul>
				<li>Nome: {{ order?.data?.packages[0].origin_address?.name }}</li>
				<li>Indirizzo: {{ order?.data?.packages[0].origin_address?.address }} {{ order?.data?.packages[0].origin_address?.address_number }}</li>
				<li>Città: {{ order?.data?.packages[0].origin_address?.city }} ({{ order?.data?.packages[0].origin_address?.province }})</li>
				<li>CAP: {{ order?.data?.packages[0].origin_address?.postal_code }}</li>
				<li>Numero di telefono: {{ order?.data?.packages[0].origin_address?.telephone_number }}</li>
				<li>Email: {{ order?.data?.packages[0].origin_address?.email }}</li>
			</ul> -->

			<h2 class="mt-[40px]">Indirizzo di destinazione</h2>

			<table class="table-fixed w-full bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>Nome</th>
						<th>Luogo</th>
						<th>Indirizzo</th>
						<th>Numero di telefono</th>
						<th>Email</th>
					</tr>
				</thead>

				<tbody>
					<tr>
						<td>
							{{ order?.data?.packages[0].destination_address?.name }}
						</td>
						<td>
							{{ order?.data?.packages[0].destination_address?.city }} ({{ order?.data?.packages[0].destination_address?.province }}) - {{ order?.data?.packages[0].destination_address?.postal_code }}
						</td>
						<td>{{ order?.data?.packages[0].destination_address?.address }} {{ order?.data?.packages[0].destination_address?.address_number }}</td>

						<td>
							{{ order?.data?.packages[0].destination_address?.telephone_number }}
						</td>
						<td>
							{{ order?.data?.packages[0].destination_address?.email ?? "Non specificata" }}
						</td>
					</tr>
				</tbody>
			</table>

			<!-- <ul>
				<li>Nome: {{ order?.data?.packages[0].destination_address?.name }}</li>
				<li>Indirizzo: {{ order?.data?.packages[0].destination_address?.address }} {{ order?.data?.packages[0].destination_address?.address_number }}</li>
				<li>Città: {{ order?.data?.packages[0].destination_address?.city }} ({{ order?.data?.packages[0].destination_address?.province }})</li>
				<li>CAP: {{ order?.data?.packages[0].destination_address?.postal_code }}</li>
				<li>Numero di telefono: {{ order?.data?.packages[0].destination_address?.telephone_number }}</li>
				<li>Email: {{ order?.data?.packages[0].destination_address?.email ?? "Non specificata" }}</li>
			</ul> -->

			<h2 class="mt-[40px]">Transazione</h2>

			<table class="w-[50%] table-fixed bg-white text-left text-[#005961] border-separate border-spacing-2 border border-gray-300">
				<thead>
					<tr>
						<th>Totale</th>
						<th>Metodo pagamento</th>
						<th>Stato pagamento</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							{{ order?.data?.transactions[0].total }}
						</td>
						<td>
							{{ order?.data?.transactions[0].type }}
						</td>
						<td>
							{{ order?.data?.transactions[0].status }}
						</td>
					</tr>
				</tbody>
			</table>

			<!-- <ul>
				<li>Pagamento effettuato con: {{ getPayment(order?.data?.transactions[0].type) }}</li>

				<li>Stato: {{ order?.data?.transactions[0].status }}</li>
			</ul> -->
		</div>
	</section>
</template>
