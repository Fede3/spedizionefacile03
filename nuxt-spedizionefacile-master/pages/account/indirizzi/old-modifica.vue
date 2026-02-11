<script setup>
const route = useRoute();

const {
	data: address,
	error,
	status,
} = useSanctumFetch(`/api/addresses/${route.query.id}`, {
	method: "GET",
	headers: {
		"ngrok-skip-browser-warning": "skip-browser-warning",
	},
});

const editAddress = async () => {
	messageError.value = null;

	messageLoading.value = "Modifiche in corso...";

	try {
		const { data: response, error } = await useSanctumFetch(`/api/addresses/${address.value.identifier}`, {
			method: "PATCH",
			headers: {
				"ngrok-skip-browser-warning": "skip-browser-warning",
			},
			body: {
				name: address.value.name,
				address: address.value.address,
				city: address.value.city,
				province_name: address.value.province_name,
				postal_code: address.value.postal_code,
			},
		});

		await refreshAddress();

		messageError.value = error.value?.data?.errors;

		messageSuccess.value = response.value?.message;
	} finally {
		showEditForm.value = false;
		messageLoading.value = null;
		/* setTimeout(() => { */
		/* messageSuccess.value = null; */
		/* }, 2000); */
	}
};

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

const filteredProvinces = (address) => {
	return provinceList.value.filter((province) => province !== address.province_name);
};
</script>

<template>
	<section class="min-h-[400px] py-[80px]">
		<div class="my-container">
			<!-- <NuxtLink to="/dashboard/indirizzi" class="bg-[#E44203] text-white p-[10px] cursor-pointer">Torna indietro</NuxtLink> -->

			<div class="mb-[20px]">
				<NuxtLink to="/dashboard" class="hover:underline">Dashboard</NuxtLink>
				›
				<NuxtLink to="/dashboard/indirizzi" class="hover:underline">I tuoi indirizzi</NuxtLink>
				›
				<span class="font-bold">Modifica indirizzo</span>
			</div>

			<!-- Form modifica indirizzo -->
			<form @submit.prevent="editAddress" v-if="address">
				<label for="name">Nome:</label>
				<input type="text" id="name" v-model="address.data.name" placeholder="Nome" required />

				<label for="address">Indirizzo:</label>
				<input type="text" id="address" v-model="address.data.address" placeholder="Indirizzo" required />

				<label for="city">Città:</label>
				<input type="text" id="city" v-model="address.data.city" placeholder="Città" required />

				<label for="province_name">Provincia:</label>
				<select v-model="address.data.province_name" id="province_name">
					<option disabled :value="address.data.province_name">{{ address.data.province_name }}</option>
					<option v-for="(province, index) in filteredProvinces(address.data)" :key="index" :value="province">
						{{ province }}
					</option>
				</select>

				<label for="postal_code">Codice postale:</label>
				<input type="text" id="postal_code" v-model="address.data.postal_code" placeholder="Codice postale" required />

				<!-- <div class="flex items-center gap-x-[5px]">
					<input type="checkbox" id="default" v-model="editedAddress.default" :true-value="1" :false-value="0" />
					<label for="default">Predefinito</label>
				</div>-->

				<button @click.prevent="cancel" class="bg-[#E44203] text-white p-[10px] cursor-pointer inline-block mr-[10px]">Annulla</button>

				<button type="submit" class="bg-[#E44203] text-white p-[10px] cursor-pointer inline-block">Aggiorna dati</button>
			</form>
			<!-- <p v-if="messageSuccess" class="text-green-500">
				{{ messageSuccess }}
			</p>

			<p v-if="messageLoading">
				{{ messageLoading }}
			</p> -->

			<div v-else>
				<div class="w-full max-w-sm">
					<div class="flex animate-pulse space-x-4">
						<div class="flex-1 space-y-3 py-1">
							<div v-for="n in 5">
								<div class="h-3 w-[100px] bg-gray-300 rounded mb-[4px]"></div>
								<div class="h-6 w-[220px] bg-gray-300 rounded mb-[20px]"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
