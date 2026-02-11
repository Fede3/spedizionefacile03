<script setup>
const { cart, refresh, status } = useCart();

const deleteMessage = ref(null);

const { isAuthenticated } = useSanctumAuth();

const sanctum = useSanctumClient();

const endpoint = computed(() => (isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart"));

const emptyCart = async () => {
	deleteMessage.value = "Eliminazione in corso...";

	await useSanctumFetch("/sanctum/csrf-cookie");

	/* const xsrf = useCookie("XSRF-TOKEN"); */

	try {
		/* await $fetch(endpoint.value, {
			method: "DELETE",
			baseURL: useRuntimeConfig().public.apiBase,
			credentials: "include",
			headers: {
				"X-XSRF-TOKEN": decodeURIComponent(xsrf.value),
			},
		}); */

		await sanctum(endpoint.value, {
			method: "DELETE",
		});

		/* await refreshNuxtData(); */

		/* await getCart(); */

		await refresh();

		deleteMessage.value = null;
	} catch (error) {
		console.error(error);
	}
};
</script>

<template>
	<section>
		<!--   -->
		<div class="my-container" :class="{ 'py-[175px]': cart?.data?.length === 0 && status === 'success', 'py-[30px]': cart?.data?.length > 0 || status === 'pending' }">
			<!-- Carrello -->
			<div v-if="status === 'success'">
				<div v-if="cart?.data?.length > 0" class="max-w-[350px] w-full mx-auto">
					<h2 class="font-bold text-center mb-[10px] text-[#095866]">CARRELLO</h2>

					<div v-if="cart?.data">
						<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866]">
							<div class="flex items-center justify-between border-b border-[#292929] text-[#292929] pb-[5px]">
								<div>Partenza</div>
								<div>Destinazione</div>
							</div>

							<div class="flex items-center justify-between text-[#292929] pt-[5px]">
								<div>
									<ul>
										<li v-for="cartSingle in cart.data" :key="cartSingle.id">{{ cartSingle.origin_address?.name }}</li>
									</ul>
								</div>
								<div>
									<ul>
										<li v-for="cartSingle in cart.data" :key="cartSingle.id">{{ cartSingle.destination_address?.name }}</li>
									</ul>
								</div>
							</div>
						</div>

						<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#606060] mt-[20px]">
							<div class="flex items-center justify-between p-[5px]">
								<span>Importo:</span>

								{{ cart.meta?.total }}
							</div>

							<!-- <div class="flex items-center justify-between p-[5px]">
								<span>Importo spedizione:</span>
								6 €
							</div> -->

							<div class="flex items-center justify-between bg-[#F1F1F1] p-[5px] font-bold">
								<span>Importo totale:</span>
								{{ cart.meta?.total }}
							</div>

							<div>
								<button type="button" @click="emptyCart">Svuota carrello</button>
							</div>

							<!-- <input type="submit" value="Procedi con l'ordine" class="bg-[#005961] text-center p-[5px_10px] rounded-[5px] text-white mx-auto block mt-[20px] font-light" /> -->

							<NuxtLink to="/checkout" class="bg-[#005961] text-center p-[5px_10px] rounded-[5px] text-white mx-auto block mt-[20px] font-light">Procedi con l'ordine</NuxtLink>
						</div>
					</div>
				</div>

				<p v-if="cart.data.length === 0" class="text-center">Il carrello è vuoto</p>
			</div>

			<div class="max-w-[350px] w-full mx-auto" v-if="status === 'pending'">
				<div class="w-full max-w-sm rounded-md border border-gray-300 p-4 mb-[10px]" v-for="n in 3">
					<div class="flex animate-pulse space-x-4">
						<div class="flex-1 space-y-3 py-1">
							<div class="h-2 rounded bg-gray-300 w-[30%]"></div>
							<div class="h-2 rounded bg-gray-300 w-[50%]"></div>
							<div class="h-2 rounded bg-gray-300 w-[40%]"></div>
							<div class="h-2 rounded bg-gray-300 w-[30%]"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
