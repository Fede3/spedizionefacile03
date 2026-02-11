<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const items = ref([
	{
		label: "Homepage",
		icon: "",
		to: "/",
	},
	{
		label: "Il tuo account",
		icon: "",
		to: "/account",
	},
	{
		label: "Indirizzi",
		icon: "",
		to: "/account/indirizzi",
		disabled: true,
	},
	/* {
		label: "Breadcrumb",
		icon: "",
		to: "/docs/components/breadcrumb",
		disabled: true,
	}, */
]);

/* const bodyClass = ref(false); */

/* useHead(() => ({
	bodyAttrs: {
		class: bodyClass.value ? "relative overflow-y-hidden after:content-[''] after:bg-black/50 after:top-0 after:left-0 after:w-full after:h-full after:absolute after:z-[100]" : "",
	},
})); */

const route = useRoute();

const router = useRouter();

const provinceList = ref([
	"AG - Agrigento",
	"AL - Alessandria",
	"AN - Ancona",
	"AO - Aosta",
	"AP - Ascoli Piceno",
	"AQ - L'Aquila",
	"AR - Arezzo",
	"AT - Asti",
	"AV - Avellino",
	"BA - Bari",
	"BG - Bergamo",
	"BI - Biella",
	"BL - Belluno",
	"BN - Benevento",
	"BO - Bologna",
	"BR - Brindisi",
	"BS - Brescia",
	"BT - Barletta-Andria-Trani",
	"BZ - Bolzano/Bozen",
	"CA - Cagliari",
	"CB - Campobasso",
	"CE - Caserta",
	"CH - Chieti",
	"CI - Sulcis Iglesiente",
	"CL - Caltanissetta",
	"CN - Cuneo",
	"CO - Como",
	"CR - Cremona",
	"CS - Cosenza",
	"CT - Catania",
	"CZ - Catanzaro",
	"EN - Enna",
	"FC - Forlì-Cesena",
	"FE - Ferrara",
	"FG - Foggia",
	"FI - Firenze",
	"FM - Fermo",
	"FR - Frosinone",
	"GE - Genova",
	"GO - Gorizia",
	"GR - Grosseto",
	"IM - Imperia",
	"IS - Isernia",
	"KR - Crotone",
	"LC - Lecco",
	"LE - Lecce",
	"LI - Livorno",
	"LO - Lodi",
	"LT - Latina",
	"LU - Lucca",
	"MB - Monza e Brianza",
	"MC - Macerata",
	"ME - Messina",
	"MI - Milano",
	"MN - Mantova",
	"MO - Modena",
	"MS - Massa-Carrara",
	"MT - Matera",
	"NA - Napoli",
	"NO - Novara",
	"NU - Nuoro",
	"OR - Oristano",
	"PA - Palermo",
	"PC - Piacenza",
	"PD - Padova",
	"PE - Pescara",
	"PG - Perugia",
	"PI - Pisa",
	"PN - Pordenone",
	"PO - Prato",
	"PR - Parma",
	"PT - Pistoia",
	"PU - Pesaro e Urbino",
	"PV - Pavia",
	"PZ - Potenza",
	"RA - Ravenna",
	"RC - Reggio Calabria",
	"RE - Reggio Emilia",
	"RG - Ragusa",
	"RI - Rieti",
	"RM - Roma",
	"RN - Rimini",
	"RO - Rovigo",
	"SA - Salerno",
	"SI - Siena",
	"SO - Sondrio",
	"SP - La Spezia",
	"SR - Siracusa",
	"SS - Sassari",
	"SV - Savona",
	"TA - Taranto",
	"TE - Teramo",
	"TN - Trento",
	"TO - Torino",
	"TP - Trapani",
	"TR - Terni",
	"TS - Trieste",
	"TV - Treviso",
	"UD - Udine",
	"VA - Varese",
	"VB - Verbano-Cusio-Ossola",
	"VC - Vercelli",
	"VE - Venezia",
	"VI - Vicenza",
	"VR - Verona",
	"VT - Viterbo",
	"VV - Vibo Valentia",
	"VS - Medio Campidano",
]);

const newAddress = ref({
	name: "",
	address: "",
	city: "",
	postal_code: "",
	province_name: "",
	default: false,
});

const messageError = ref(null);

const messageSuccess = ref(null);

const messageLoading = ref(null);

const showEditForm = ref(false);

const showCreateForm = ref(false);

const editedAddress = ref(null);

const deletedAddress = ref(null);

const {
	data: addresses,
	error,
	status,
	refresh: refreshAddress,
} = useSanctumFetch(`/api/user-addresses`, {
	method: "GET",
	headers: {
		"ngrok-skip-browser-warning": "skip-browser-warning",
	},
});

const edit = (address) => {
	editedAddress.value = { ...address };
	showEditForm.value = true;

	/* router.replace({ path: route.fullPath, query: { id: id } }); */

	/* navigateTo({
		path: "/dashboard/indirizzi",
		query: { id: address.identifier },
	}); */

	//navigateTo(`/dashboard/indirizzi/modifica?id=${id}`);
};

const cancelEdit = () => {
	editedAddress.value = null;
	showEditForm.value = false;
	messageError.value = null;

	/* navigateTo({

		query: {},
	}); */
};

const cancelAdd = () => {
	newAddress.value.name = "";
	newAddress.value.address = "";
	newAddress.value.city = "";
	newAddress.value.postal_code = "";
	newAddress.value.province_name = "";
	newAddress.value.default = false;
	showCreateForm.value = false;
	messageError.value = null;
};

const sanctum = useSanctumClient();

const createAddress = async () => {
	messageError.value = null;

	messageLoading.value = "Aggiunta in corso...";

	try {
		await sanctum(`/api/user-addresses`, {
			method: "POST",
			/* headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			}, */
			body: newAddress.value,
		});

		await refreshAddress();

		newAddress.value.name = "";
		newAddress.value.address = "";
		newAddress.value.city = "";
		newAddress.value.postal_code = "";
		newAddress.value.province_name = "";
		newAddress.value.default = false;

		showCreateForm.value = false;
		messageLoading.value = null;
		/* messageError.value = null; */

		/* messageError.value = error.value?.data?.errors;

		messageSuccess.value = response.value?.message; */
	} catch (error) {
		messageError.value = error.data.message;
		messageLoading.value = null;
	}
};

const editAddress = async () => {
	messageError.value = null;

	messageLoading.value = "Modifiche in corso...";

	try {
		await sanctum(`/api/user-addresses/${editedAddress.value.id}`, {
			method: "PATCH",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: {
				name: editedAddress.value.name,
				address: editedAddress.value.address,
				city: editedAddress.value.city,
				province_name: editedAddress.value.province_name,
				postal_code: editedAddress.value.postal_code,
			},
		});

		await refreshAddress();

		/* messageError.value = error.value?.data?.errors;

		messageSuccess.value = response.value?.message; */
	} finally {
		showEditForm.value = false;
		messageLoading.value = null;
		/* setTimeout(() => { */
		/* messageSuccess.value = null; */
		/* }, 2000); */
	}
};

const editDefaultAddress = async (address) => {
	messageError.value = null;

	messageLoading.value = "Modifiche in corso...";

	try {
		await sanctum(`/api/user-addresses/${address.id}`, {
			method: "PATCH",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: {
				default: address.default,
			},
		});

		await refreshAddress();

		/* messageError.value = error.value?.data?.errors; */

		/* messageSuccess.value = response.value?.message; */
	} finally {
		messageLoading.value = null;
		showEditForm.value = false;

		/* setTimeout(() => {
			messageSuccess.value = null;
		}, 2000); */
	}
};

const open = ref(false);

const deleteAddress = async (id) => {
	/* messageError.value = null;

	messageLoading.value = "Modifiche in corso..."; */

	try {
		await sanctum(`/api/user-addresses/${id}`, {
			method: "DELETE",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
		});

		await refreshAddress();

		open.value = false;

		/* messageError.value = error.value?.data?.errors;

		messageSuccess.value = response.value?.message; */
	} finally {
		/* messageLoading.value = null; */
		/* popup.value = false;
		bodyClass.value = false; */
		/* setTimeout(() => {
			messageSuccess.value = null;
			showEditForm.value = false;
		}, 2000); */
	}
};

/* const showPopup = (address) => {
	deletedAddress.value = { ...address };
	popup.value = true;
	bodyClass.value = true;
}; */

const getTitle = computed(() => {
	if (showEditForm.value && !showCreateForm.value) {
		return "Modifica indirizzo";
	} else if (!showEditForm.value && showCreateForm.value) {
		return "Aggiungi indirizzo";
	} else {
		return null;
	}
});

const filteredProvinces = (address) => {
	return provinceList.value.filter((province) => province !== address.province_name);
};
</script>

<template>
	<!-- <div
		class="fixed top-1/2 left-1/2 flex justify-center items-center flex-wrap bg-white w-[400px] h-[250px] px-10 py-5 rounded-md shadow-md z-[200] text-black animate-fade opacity-100 transform -translate-x-1/2 -translate-y-1/2"
		v-if="popup">
		<p>Sei sicuro di voler eliminare l'indirizzo?</p>

		<button
			class="bg-[#005961] text-white p-[4px] cursor-pointer mr-[10px] font-normal text-[0.9rem]"
			@click="
				popup = false;
				bodyClass = false;
			">
			Annulla
		</button>

		<button class="bg-[#005961] text-white p-[4px] cursor-pointer mr-[10px] font-normal text-[0.9rem]" @click="deleteAddress(deletedAddress)">Conferma</button>
	</div> -->

	<section class="min-h-[400px] py-[80px]">
		<div class="my-container">
			<!-- <div class="mb-[20px]">
				<NuxtLink to="/dashboard" class="hover:underline">Dashboard</NuxtLink>
				›
				<span :class="{ 'font-bold': !showEditForm && !showCreateForm }">I tuoi indirizzi</span>
				<span v-if="getTitle">
					›
					<span class="font-bold">{{ getTitle }}</span>
				</span>
			</div> -->

			<Breadcrumb :items="items" />

			<h1 class="font-bold text-[2rem]">{{ getTitle ?? "I tuoi indirizzi" }}</h1>

			<!-- Elenco indirizzi -->
			<p v-if="addresses?.data?.length === 0">Non hai ancora nessun indirizzo</p>

			<div
				v-else-if="addresses?.data?.length > 0 && !showEditForm && !showCreateForm"
				v-for="(address, index) in addresses?.data"
				:key="address.id"
				class="border border-gray-300 p-4 mt-[20px] flex items-center justify-between w-[500px]">
				<div>
					<div v-if="address.default" class="font-bold">Predefinito</div>

					<div>{{ index + 1 }}) {{ address.id }} {{ address.name }}</div>
					<div>
						{{ address.address }}
					</div>
					<div>{{ address.city }} ({{ address.province_name.slice(0, 2) }})</div>
					<div>
						{{ address.postal_code }}
					</div>
				</div>
				<div>
					<div class="mb-[10px]">
						<button @click="editDefaultAddress(address)" v-if="!address.default" class="bg-[#005961] text-white p-[4px] cursor-pointer mr-[10px] font-normal text-[0.9rem]">
							Imposta come predefinito
						</button>
					</div>
					<div>
						<!-- <NuxtLink class="bg-[#E44203] text-white p-[4px] cursor-pointer mr-[10px] font-normal text-[0.9rem] w-[86px] inline-block text-center" :to="`/dashboard/indirizzi/${address.id}`">
							Modifica
						</NuxtLink> -->
						<!-- <NuxtLink :to="`${route.fullPath}/modifica/${address.identifier}`" class="bg-[#E44203] text-white p-[4px] cursor-pointer font-normal text-[0.9rem] inline-block mr-[10px]">
							Modifica dati
						</NuxtLink> -->

						<button @click="edit(address)" class="bg-[#005961] text-white p-[4px] cursor-pointer font-normal text-[0.9rem] mr-[10px] active:bg-[#005961]">Modifica dati</button>

						<!--  :ui="{ body: 'justify-center text-center' }" -->
						<UModal :dismissible="false" v-model:open="open" title="Sei sicuro di voler eliminare l'indirizzo?" :close="false">
							<UButton label="Elimina" class="active:bg-[#005961] bg-[#005961] text-white p-[4px] cursor-pointer font-normal text-[0.9rem] rounded-none hover:bg-[#005961]" />

							<template #body="{ close }">
								<div>
									<button class="bg-[#005961] text-white p-[10px] cursor-pointer mr-[10px] font-normal text-[0.9rem] rounded" @click="deleteAddress(address.id)">Conferma</button>
									<UButton label="Annulla" class="active:bg-[#005961] bg-[#005961] text-white p-[10px] cursor-pointer font-normal text-[0.9rem] rounded hover:bg-[#005961]" @click="close" />
								</div>
							</template>
						</UModal>
						<!-- <button @click="showPopup(address)" class="bg-[#005961] text-white p-[4px] cursor-pointer font-normal text-[0.9rem]">Elimina</button> -->
					</div>
				</div>
			</div>

			<div v-if="!addresses">
				<div class="w-full max-w-sm rounded-md border border-gray-300 p-4 mb-[20px]" v-for="n in 2">
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

			<button v-if="!showCreateForm && !showEditForm" @click="showCreateForm = true" class="cursor-pointer text-center text-white bg-[#005961] p-[10px] mt-[40px] rounded-[5px]">
				Aggiungi nuovo indirizzo
			</button>

			<!-- Form modifica indirizzo -->
			<form @submit.prevent="editAddress" v-if="showEditForm" class="mx-auto w-[380px]">
				<label for="name">Nome</label>
				<input type="text" id="name" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]" v-model="editedAddress.name" placeholder="Nome" required />

				<label for="address">Indirizzo</label>
				<input
					type="text"
					id="address"
					class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]"
					v-model="editedAddress.address"
					placeholder="Indirizzo"
					required />

				<label for="city">Città</label>
				<input type="text" id="city" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]" v-model="editedAddress.city" placeholder="Città" required />

				<label for="province_name">Provincia:</label>
				<select v-model="editedAddress.province_name" id="province_name" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] text-black w-full mb-[20px]">
					<option disabled :value="editedAddress.province_name" class="text-gray-400">{{ editedAddress.province_name }}</option>
					<option v-for="(province, index) in filteredProvinces(editedAddress)" :key="index" :value="province">
						{{ province }}
					</option>
				</select>

				<label for="postal_code">Codice postale</label>
				<input
					type="text"
					id="postal_code"
					class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]"
					v-model="editedAddress.postal_code"
					placeholder="Codice postale"
					required />

				<!-- <div class="flex items-center gap-x-[5px]">
					<input type="checkbox" id="default" v-model="editedAddress.default" :true-value="1" :false-value="0" />
					<label for="default">Predefinito</label>
				</div>-->

				<div class="text-center">
					<button type="button" @click.prevent="cancelEdit" class="cursor-pointer text-center text-white bg-[#005961] inline-block p-[10px] mt-[20px] rounded-[5px] mr-[20px]">Annulla</button>

					<button type="submit" class="cursor-pointer text-center text-white bg-[#005961] inline-block p-[10px] mt-[20px] rounded-[5px]">Aggiorna dati</button>
				</div>
			</form>

			<!-- Form crea indirizzo -->
			<form @submit.prevent="createAddress" v-if="showCreateForm" class="mx-auto w-[380px]">
				<label for="name">Nome</label>
				<input type="text" id="name" v-model="newAddress.name" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]" placeholder="Nome" required />

				<label for="address">Indirizzo</label>
				<input type="text" id="address" v-model="newAddress.address" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] w-full mb-[20px]" placeholder="Indirizzo" required />

				<label for="city">Città</label>
				<input type="text" id="city" v-model="newAddress.city" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]" placeholder="Città" required />

				<label for="province_name">Provincia</label>
				<select v-model="newAddress.province_name" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] w-full mb-[20px] text-gray-400" id="province_name" required>
					<option disabled value="">Scegli la provincia</option>
					<option v-for="(province, index) in provinceList" :key="index" :value="province" class="text-black">
						{{ province }}
					</option>
				</select>

				<label for="postal_code">Codice postale</label>
				<input
					type="text"
					id="postal_code"
					v-model="newAddress.postal_code"
					class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full mb-[20px]"
					placeholder="Codice postale"
					required />

				<div class="flex items-center gap-x-[5px]">
					<input type="checkbox" id="default" v-model="newAddress.default" :true-value="1" :false-value="0" />
					<label for="default">Usa come indirizzo predefinito</label>
				</div>

				<div class="text-center">
					<button type="button" @click.prevent="cancelAdd" class="cursor-pointer text-center text-white bg-[#005961] inline-block p-[10px] mt-[20px] rounded-[5px] mr-[20px]">Annulla</button>

					<button type="submit" class="cursor-pointer text-center text-white bg-[#005961] inline-block p-[10px] mt-[20px] rounded-[5px]">Aggiungi</button>
				</div>
			</form>

			<p v-if="messageLoading" class="text-center">
				{{ messageLoading }}
			</p>

			<p v-if="messageError" class="text-center text-red-500">
				{{ messageError }}
			</p>

			<!-- <p v-if="messageSuccess" class="text-green-500">
				{{ messageSuccess }}
			</p> -->
		</div>
	</section>
</template>
