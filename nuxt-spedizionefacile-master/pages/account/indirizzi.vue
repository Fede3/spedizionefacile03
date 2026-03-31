<!--
  FILE: pages/account/indirizzi.vue
  SCOPO: Versione alternativa della rubrica indirizzi (layout diverso da indirizzi/index.vue).
         CRUD indirizzi con form modale, skeleton loading.
  API: GET /api/user-addresses, POST /api/user-addresses,
       PATCH /api/user-addresses/{id}, DELETE /api/user-addresses/{id}.
  ROUTE: /account/indirizzi (middleware sanctum:auth).

  NOTA: Potrebbe essere una versione precedente. La versione principale e' indirizzi/index.vue.

  COLLEGAMENTI:
    - pages/account/indirizzi/index.vue → versione principale rubrica indirizzi.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const sanctum = useSanctumClient();
// lazy: true — la rubrica indirizzi si carica dopo il render iniziale della pagina
const { data: addresses, refresh: refreshAddresses, status: addressesStatus } = useSanctumFetch("/api/user-addresses", { lazy: true });

const showForm = ref(false);
const editingId = ref(null);
const formError = ref(null);
const formLoading = ref(false);

const emptyForm = {
	name: '',
	address: '',
	address_number: '',
	city: '',
	postal_code: '',
	province: '',
	country: 'Italia',
	telephone_number: '',
	email: '',
	additional_information: '',
	intercom_code: '',
	type: 'shipping',
};

const form = ref({ ...emptyForm });

const openNewForm = () => {
	form.value = { ...emptyForm };
	editingId.value = null;
	formError.value = null;
	showForm.value = true;
};

const openEditForm = (addr) => {
	form.value = {
		name: addr.name || '',
		address: addr.address || '',
		address_number: addr.address_number || '',
		city: addr.city || '',
		postal_code: addr.postal_code || '',
		province: addr.province || '',
		country: addr.country || 'Italia',
		telephone_number: addr.telephone_number || '',
		email: addr.email || '',
		additional_information: addr.additional_information || '',
		intercom_code: addr.intercom_code || '',
		type: addr.type || 'shipping',
	};
	editingId.value = addr.id;
	formError.value = null;
	showForm.value = true;
};

const closeForm = () => {
	showForm.value = false;
	editingId.value = null;
	formError.value = null;
};

const saveAddress = async () => {
	formError.value = null;
	formLoading.value = true;
	try {
		if (editingId.value) {
			await sanctum(`/api/user-addresses/${editingId.value}`, {
				method: "PUT",
				body: {
					...form.value,
					number_type: 'civico',
				},
			});
		} else {
			await sanctum("/api/user-addresses", {
				method: "POST",
				body: {
					...form.value,
					number_type: 'civico',
				},
			});
		}
		closeForm();
		await refreshAddresses();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			formError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			formError.value = data?.message || "Errore durante il salvataggio. Riprova.";
		}
	} finally {
		formLoading.value = false;
	}
};

const deleteAddress = async (id) => {
	try {
		await sanctum(`/api/user-addresses/${id}`, { method: "DELETE" });
		await refreshAddresses();
	} catch (e) {
		// TODO: replace with error reporting service
	}
};

const addressList = computed(() => addresses.value?.data || []);
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Indirizzi</span>
			</div>

			<div class="flex items-center justify-between mb-[24px]">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">Indirizzi salvati</h1>
				<button
					v-if="!showForm"
					@click="openNewForm"
					class="px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
					+ Nuovo indirizzo
				</button>
			</div>

			<!-- Form -->
			<div v-if="showForm" class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[20px]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">{{ editingId ? 'Modifica indirizzo' : 'Nuovo indirizzo' }}</h2>
				<form @submit.prevent="saveAddress" class="space-y-[14px]">
					<div class="grid grid-cols-2 gap-[12px]">
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome e Cognome *</label>
							<input v-model="form.name" type="text" placeholder="Mario Rossi" required class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Telefono</label>
							<input v-model="form.telephone_number" type="tel" placeholder="333 1234567" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
					</div>
					<div class="grid grid-cols-3 gap-[12px]">
						<div class="col-span-2">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
							<input v-model="form.address" type="text" placeholder="Via Roma" required class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">N. civico</label>
							<input v-model="form.address_number" type="text" placeholder="10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
					</div>
					<div class="grid grid-cols-3 gap-[12px]">
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città *</label>
							<input v-model="form.city" type="text" placeholder="Roma" required class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
							<input v-model="form.postal_code" type="text" placeholder="00100" required class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia</label>
							<input v-model="form.province" type="text" placeholder="RM" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Email</label>
						<input v-model="form.email" type="email" placeholder="email@esempio.it" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Info aggiuntive</label>
						<input v-model="form.additional_information" type="text" placeholder="Scala B, interno 5" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
					</div>

					<p v-if="formError" class="text-red-500 text-[0.8125rem] bg-red-50 p-[10px] rounded-[6px]">{{ formError }}</p>

					<div class="flex gap-[12px] pt-[8px]">
						<button type="button" @click="closeForm" class="flex-1 py-[12px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.875rem] transition-colors cursor-pointer">
							Annulla
						</button>
						<button type="submit" :disabled="formLoading" class="flex-1 py-[12px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.875rem] transition-colors cursor-pointer disabled:opacity-60">
							{{ formLoading ? 'Salvataggio...' : (editingId ? 'Salva modifiche' : 'Aggiungi indirizzo') }}
						</button>
					</div>
				</form>
			</div>

			<!-- Loading -->
			<div v-if="addressesStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 2" :key="n" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] animate-pulse">
					<div class="h-[16px] bg-gray-200 rounded w-[40%] mb-[8px]"></div>
					<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
				</div>
			</div>

			<!-- Address list -->
			<div v-else-if="addressList.length > 0" class="space-y-[12px]">
				<div v-for="addr in addressList" :key="addr.id" class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC]">
					<div class="flex items-start justify-between">
						<div>
							<p class="text-[0.9375rem] font-bold text-[#252B42]">{{ addr.name }}</p>
							<p class="text-[0.8125rem] text-[#737373] mt-[4px]">{{ addr.address }} {{ addr.address_number }}</p>
							<p class="text-[0.8125rem] text-[#737373]">{{ addr.postal_code }} {{ addr.city }} ({{ addr.province }})</p>
							<p v-if="addr.telephone_number" class="text-[0.8125rem] text-[#737373]">Tel: {{ addr.telephone_number }}</p>
							<p v-if="addr.email" class="text-[0.8125rem] text-[#737373]">{{ addr.email }}</p>
						</div>
						<div class="flex gap-[8px] shrink-0">
							<button @click="openEditForm(addr)" class="p-[8px] rounded-[8px] hover:bg-[#F0F0F0] transition cursor-pointer" title="Modifica">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-[#737373]"><path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83l3.75 3.75M3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" /></svg>
							</button>
							<button @click="deleteAddress(addr.id)" class="p-[8px] rounded-[8px] hover:bg-red-50 transition cursor-pointer" title="Elimina">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-red-500"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12l1.41 1.41L13.41 14l2.12 2.12l-1.41 1.41L12 15.41l-2.12 2.12l-1.41-1.41L10.59 14zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" /></svg>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Empty -->
			<div v-else-if="!showForm" class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" class="text-[#C8CCD0]"><path d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7" /></svg>
				</div>
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">Nessun indirizzo salvato</h2>
				<p class="text-[0.875rem] text-[#737373] mb-[20px]">Aggiungi il tuo primo indirizzo per velocizzare le spedizioni.</p>
				<button @click="openNewForm" class="px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.875rem] transition-colors cursor-pointer">
					+ Aggiungi indirizzo
				</button>
			</div>
		</div>
	</section>
</template>
