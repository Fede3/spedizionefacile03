<script setup>
const router = useRouter();

const { endpoint, refresh } = useCart();

/* Step del preventivo */
const stepNumber = ref(1);

// Crea un array di giorni del mese (per esempio, mese corrente)
const daysInMonth = computed(() => {
	const arr = [];

	const today = new Date();
	const year = today.getFullYear();
	const month = today.getMonth();
	const day = today.getDate() + 1;

	// Giorni rimanenti del mese corrente
	const daysCurrentMonth = new Date(year, month + 1, 0).getDate();
	for (let i = day; i <= daysCurrentMonth; i++) {
		const date = new Date(year, month, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		arr.push({
			date,
			weekday: formattedWeekday,
			dayNumber: date.getDate(),
			monthAbbr: formattedMonthAbbr,
		});
	}

	// Tutti i giorni del mese successivo
	const nextMonth = month + 1;
	const daysNextMonth = new Date(year, nextMonth + 1, 0).getDate();
	for (let i = 1; i <= daysNextMonth; i++) {
		const date = new Date(year, nextMonth, i);

		const weekday = date.toLocaleString("default", { weekday: "short" });
		const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

		const monthAbbr = date.toLocaleString("default", { month: "short" });
		const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);

		arr.push({
			date,
			weekday: formattedWeekday,
			dayNumber: date.getDate(),
			monthAbbr: formattedMonthAbbr,
		});
	}

	return arr;
});

const formRef = ref(null);

/* Input nuovo indirizzo di partenza */
const newOrigin = ref({
	country: "Italia",
	city_or_postal_code: "",
});

/* Input nuovo indirizzo di destinazione */
const newDestination = ref({
	country: "Italia",
	city_or_postal_code: "",
});

/* Servizi */
const services = ref({
	service_type: "",
	date: "",
	time: "",
});

/* Nazioni */
const countries = ["Italia", "Germania", "Francia", "Spagna"];

/* Tipologia dei pacchi */
const packageTypeList = ["Busta", "Pacco", "Wallet", "Valigia"];

/* const origin_address = {
	id: 1,
	type: "Origin",
	name: "Mario Rossi",
	additional_information: "Piano 2, interno 5",
	address: "Via Roma",
	number_type: "Civico",
	address_number: "12A",
	intercom_code: "1234",
	country: "Italia",
	city: "Milano",
	postal_code: "20100",
	province: "MI",
	telephone_number: "+39 02 1234567",
	email: "mario.rossi@example.com",
}; */

/* const destination_address = {
	id: 2,
	type: "Destination",
	name: "Luisa Bianchi",
	additional_information: "Interno 3",
	address: "Via Garibaldi",
	number_type: "Civico",
	address_number: "45B",
	intercom_code: "5678",
	country: "Italia",
	city: "Roma",
	postal_code: "00100",
	province: "RM",
	telephone_number: "+39 06 7654321",
	email: "luisa.bianchi@example.com",
}; */

/* Dati del pacco */
const packages = ref([
	/* {
		package_type: "Pacco",
		quantity: 1,
		weight: "20",
		first_size: "30",
		second_size: "40",
		third_size: "10",
		volume_price: "26",
		weight_price: "24",
		single_price: "16",
	}, */
]);

/* Nuovo pacco aggiunto dall'utente che viene pushato su packages */
const newPackage = ref({});

/* Controllo se l'utente ha scelto una tipologia di pacco */
const isPackageSelected = ref(false);

/* Dati indirizzo generico */
const address = {
	name: "",
	additional_information: "",
	address: "",
	number_type: "Numero Civico",
	address_number: "",
	intercom_code: "",
	postal_code: "",
	province: "",
	telephone_number: "",
	email: "",
};

/* Dati indirizzo di partenza */
const originAddress = ref({
	...address,
	type: "Partenza",
	country: newOrigin.value.country,
	city: "",
});

/* Dati indirizzo di destinazione */
const destinationAddress = ref({
	...address,
	type: "Destinazione",
	country: newDestination.value.country,
	city: "",
});

/* Contenuto spedizioni - indirizzo di partenza, indirizzo di destinazione, pacchi e servizio scelto */
const shipments = ref({
	origin_address: originAddress.value,
	destination_address: destinationAddress.value,
	packages: packages.value,
	services: services.value,
});

const sanctum = useSanctumClient();

const addToCart = async () => {
	await useSanctumFetch("/sanctum/csrf-cookie");

	/* const xsrf = useCookie("XSRF-TOKEN"); */

	try {
		await sanctum(endpoint.value, {
			method: "POST",
			body: shipments.value,
		});

		/* await sanctum(endpoint.value, {
			method: "POST",
			body: {
				packages: packages.value,
			},
		}); */

		/* await $fetch(endpoint.value, {
			method: "POST",
			baseURL: useRuntimeConfig().public.apiBase,
			credentials: "include",
			headers: {
				"X-XSRF-TOKEN": decodeURIComponent(xsrf.value),
			},
			body: shipments.value,
		}); */

		/* await useSanctumFetch(endpoint.value, {
			method: "POST",
			credentials: "include",
			body: shipments.value,
		}); */

		await refresh();

		/* await refreshNuxtData("cart"); */

		router.push("/carrello");
	} catch (error) {
		console.error(error);
	}

	/* await refreshNuxtData(["cart"]); */
};

/* Controllo se l'indirizzo di partenza contiene un Luogo o un CAP e assegno il valore corrispondente all'input dell'indirizzo di partenza nello step 2 */
const originControlIfLetters = (text) => {
	const isOnlyLetters = /^[A-Za-z]+$/.test(text);

	if (isOnlyLetters) {
		originAddress.value.city = text;
	} else {
		originAddress.value.postal_code = text;
	}
};

/* Controllo se l'indirizzo di destinazione contiene un Luogo o un CAP e assegno il valore corrispondente all'input dell'indirizzo di destinazione nello step 2 */
const destinationControlIfLetters = (text) => {
	const isOnlyLetters = /^[A-Za-z]+$/.test(text);

	if (isOnlyLetters) {
		destinationAddress.value.city = text;
	} else {
		destinationAddress.value.postal_code = text;
	}
};

const isRateCalculated = ref(false);

/* Seleziono la tipologia di pacco */
const selectPackageType = (packageType) => {
	newPackage.value = {};

	if (isRateCalculated.value) {
		isRateCalculated.value = false;
	}

	/* newPackage.value.id = myId++; */
	newPackage.value.package_type = packageType;
	newPackage.value.quantity = 1;

	packages.value.push(newPackage.value);

	isPackageSelected.value = true;
};

const myPack = ref(null);

/* Totale preventivo */
const totalPrice = ref(0);

/* Controllo se il prezzo con il volume e con il peso esistono a calcolo la quantità */
const checkPrices = (pack) => {
	// Aggiorna single_price solo se entrambi esistono
	if (pack.weight_price != null && pack.volume_price != null) {
		const basePrice = Math.max(Number(pack.weight_price), Number(pack.volume_price));
		pack.single_price = basePrice; // se vuoi centesimi: * 100
		pack.single_priceOrig = Number(pack.single_price);
	}

	if (pack.single_price) {
		calcQuantity(pack);
	}
};

/* Calcolo prezzo se la quantità cambia */
const calcQuantity = (pack) => {
	pack.single_price = pack.single_priceOrig * Number(pack.quantity);

	totalPrice.value = 0;

	packages.value.forEach((pack) => {
		totalPrice.value += Number(pack.single_price);
	});
};

/* Calcolo del prezzo tenendo conto del peso */
const calcPriceWithWeight = (pack) => {
	myPack.value = pack;
	const weight = Number(pack.weight);

	if (weight > 0 && weight < 2) {
		pack.weight_price = 9;
	} else if (weight >= 2 && weight < 5) {
		pack.weight_price = 12;
	} else if (weight >= 5 && weight < 10) {
		pack.weight_price = 18;
	} else if (weight >= 10 && weight <= 25) {
		pack.weight_price = 20;
	} else {
		pack.weight_price = 20;
	}

	checkPrices(pack);
};

/* Calcolo prezzo tenendo conto del volume */
const calcPriceWithVolume = (pack) => {
	myPack.value = pack;
	const volume = Number(((Number(pack.first_size) / 100) * (Number(pack.second_size) / 100) * (Number(pack.third_size) / 100)).toFixed(3));

	if (volume > 0 && volume < 0.008) {
		pack.volume_price = 9;
	} else if (volume >= 0.008 && volume < 0.02) {
		pack.volume_price = 12;
	} else if (volume >= 0.02 && volume < 0.04) {
		pack.volume_price = 18;
	} else if (volume >= 0.04 && volume <= 0.1) {
		pack.volume_price = 20;
	} else {
		pack.volume_price = 20;
	}

	checkPrices(pack);
};

const calculateRate = () => {
	if (
		newOrigin.value.city_or_postal_code &&
		newDestination.value.city_or_postal_code &&
		newPackage.value.weight &&
		newPackage.value.first_size &&
		newPackage.value.second_size &&
		newPackage.value.third_size
	) {
		/* packages.value.forEach((pack) => {
			totalPrice.value += Number(pack.single_price);
		}); */

		isRateCalculated.value = true;
	} else {
		formRef.value.reportValidity();
		isRateCalculated.value = false;
	}
};

const servicesList = [
	{
		name: "Spedizione senza etichetta",
		description: "Spedizione senza etichetta",
	},
	{
		name: "Contrassegno",
		description: "Contrassegno",
	},
	/* {
		name: "Al piano",
		description: "Consegna della spedizione direttamente al piano del destinatario (max 6 colli - peso max collo: 30kg)",
	}, */
	{
		name: "Assicurazione",
		description: "Accessorio assicurazione",
	},
	/* {
		name: "Ore12",
		description: "Consegna entro le ore 12 del primo giorno utile alla consegna",
	}, */
	{
		name: "Ritiro e consegna con sponda idraulica",
		description: "Ritiro e consegna con sponda idraulica",
	},
	/* {
		name: "Appuntamento",
		description: "Numero di telefono da contattare per concordare la consegna",
	}, */
	{
		name: "Stabilito/Programmato",
		description: "Puoi scegliere il giorno preciso in cui il destinatario è disponibile",
	},
	/* {
		name: "Stabilito",
		description: "Puoi scegliere la data precisa in cui il destinatario è disponibile",
	}, */
	{
		name: "Chiamata",
		description: "Messaggio di avviso del pacco in consegna",
	},
	{
		name: "Casella postale",
		description: "Puoi scegliere di far recapitare la spedizione presso una casella postale. La giacenza è di 10 giorni lavorativi.",
	},
];

const servicesArray = ref([]);

const nextStep = async () => {
	window.scrollTo(0, 0);

	stepNumber.value++;
};

const prevStep = () => {
	stepNumber.value--;
};

const chooseService = (service) => {
	if (!servicesArray.value.includes(service.name.toUpperCase())) {
		servicesArray.value.push(service.name.toUpperCase());
	} else {
		const index = servicesArray.value.indexOf(service.name.toUpperCase());
		if (index !== -1) {
			servicesArray.value.splice(index, 1); // rimuove 1 elemento all’indice trovato
		}
	}

	services.value.service_type = servicesArray.value.join(", ");
};

const chooseDate = (day) => {
	const lastDay = day.date.toLocaleDateString();
	if (!services.value.date || services.value.date != lastDay) {
		services.value.date = day.date.toLocaleDateString();
	} else {
		services.value.date = "";
	}
};

const deletePack = (index) => {
	packages.value.splice(index, 1);
	isRateCalculated.value = false;

	totalPrice.value = 0;

	packages.value.forEach((pack) => {
		totalPrice.value += Number(pack.single_price);
	});
};
</script>

<template>
	<section class="bg-[#F4F5FB]">
		<div class="w-[380px] mx-auto py-[30px]">
			<!-- {{ packages }}
			<input type="button" value="ADD TO CART" @click="addToCart" /> -->

			<!-- <input type="button" @click="addToCart" value="AGGIUNGI AL CARRELLO" class="font-light bg-[#005961] text-white text-center w-full p-[10px] mt-[20px] rounded-[4px] cursor-pointer" /> -->

			<form ref="formRef" @submit.prevent="nextStep">
				<!-- Primo Step -->
				<div v-if="stepNumber === 1">
					<div class="bg-white rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866] p-[20px]">
						<h2 class="font-bold flex items-center mb-[10px]">
							<!-- <Icon name="game-icons:position-marker" class="text-[#28a64c]" /> -->
							Partenza
						</h2>

						<label for="origin_country" class="sr-only">Paese</label>
						<select v-model="newOrigin.country" id="origin_country" class="w-full bg-white border-[#E8E8E8] border p-[7px]" required>
							<option v-for="(country, index) in countries" :key="index" :value="country" :disabled="newOrigin.country === country">
								{{ country }}
							</option>
						</select>

						<label for="origin_city" class="my-[3px] block sr-only">Luogo o CAP</label>
						<input
							type="text"
							@input="originControlIfLetters(newOrigin.city_or_postal_code)"
							v-model="newOrigin.city_or_postal_code"
							id="origin_city"
							placeholder="Luogo o CAP"
							class="w-full bg-white border-[#E8E8E8] border mt-[-1px] p-[7px] placeholder:text-[#095866] placeholder:font-bold"
							required />

						<h2 class="font-bold flex items-center my-[10px]">
							<!-- <Icon name="game-icons:position-marker" class="text-[#DB324C]" /> -->
							Destinazione
						</h2>

						<label for="destination_country" class="sr-only">Paese</label>
						<select v-model="newDestination.country" id="destination_country" class="w-full bg-white border-[#E8E8E8] border p-[7px]" required>
							<option v-for="(country, index) in countries" :key="index" :value="country" :disabled="newDestination.country === country">
								{{ country }}
							</option>
						</select>

						<label for="destination_city" class="my-[3px] block sr-only">Luogo o CAP</label>
						<input
							type="text"
							@input="destinationControlIfLetters(newDestination.city_or_postal_code)"
							v-model="newDestination.city_or_postal_code"
							id="destination_city"
							placeholder="Luogo o CAP"
							class="w-full bg-white border-[#E8E8E8] mt-[-1px] border p-[7px] placeholder:text-[#095866] placeholder:font-bold"
							required />
					</div>

					<div class="mt-[20px]">
						<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866]">
							<h2 class="font-bold flex items-center mb-[10px]">Aggiungi un altro collo per la spedizione</h2>

							<ul>
								<li
									v-for="(packageType, packageTypeIndex) in packageTypeList"
									:key="packageTypeIndex"
									class="border border-[#B8D8DA] w-full h-[50px] mt-[25px] first:mt-0 rounded-[5px] active:bg-[#005961] active:text-white relative">
									<button type="button" @click="selectPackageType(packageType)" class="w-full h-full block cursor-pointer">{{ packageType }}</button>
									<input type="radio" name="package_type" class="absolute left-[50%] bottom-0 opacity-0 pointer-events-none" :required="!isPackageSelected" />
								</li>
							</ul>

							<div v-if="isPackageSelected && packages.length > 0">
								<h2 class="font-bold flex items-center my-[10px]">Inserisci: Numero colli uguali - Peso - Dimensioni</h2>

								<ul v-if="packages">
									<li v-for="(pack, packIndex) in packages" :key="packIndex" class="flex items-start mt-[20px] min-h-[110px]">
										<div class="w-[30px] border border-[#BDDCDD] p-[10px] break-all leading-[112%] pr-[50px]">{{ pack.package_type }}</div>
										<div class="w-[calc(100%-80px)]">
											<select v-model="pack.quantity" id="quantity" class="w-full text-center border-b border-t border-r border-[#F3F3F3]" @change="calcQuantity(pack)">
												<option v-for="quantity in 10" :key="quantity" :value="quantity" :disabled="quantity === pack.quantity" required>
													{{ quantity }}
												</option>
											</select>
											<div class="flex pl-[3px]">
												<input
													type="text"
													placeholder="Peso in kg"
													v-model="pack.weight"
													id="weight"
													class="w-1/2 border border-[#F3F3F3] border-l-0 py-[9px]"
													@input="calcPriceWithWeight(pack)"
													required />
												<input type="text" placeholder="Lato 1 in cm" v-model="pack.first_size" id="first_size" class="w-1/2 border border-[#F3F3F3] py-[9px]" required />
											</div>
											<div class="flex">
												<input type="text" placeholder="Lato 2 in cm" v-model="pack.second_size" id="second_size" class="w-1/2 border border-l-0 border-[#F3F3F3] py-[9px]" required />
												<input
													type="text"
													placeholder="Lato 3 in cm"
													v-model="pack.third_size"
													id="third_size"
													class="w-1/2 border border-[#F3F3F3] py-[9px]"
													@input="calcPriceWithVolume(pack)"
													required />
											</div>
										</div>

										<button type="button" class="cursor-pointer text-[#DB9FA1] ml-[10px]" @click="deletePack(packIndex)">
											El
											<!-- <Icon name="gg:trash" /> -->
										</button>
									</li>
								</ul>
							</div>
						</div>

						<input
							type="button"
							value="CALCOLA TARIFFA"
							class="cursor-pointer text-center text-white bg-[#005961] mx-auto p-[10px] block mt-[20px] rounded-[5px]"
							v-if="!isRateCalculated"
							@click="calculateRate" />

						<button type="submit" v-else class="mt-[20px] cursor-pointer bg-[#68C8D6] rounded-[3px] px-[20px] py-[5px] text-white text-center mx-auto block w-[90%]">
							<span class="block">SPEDISCI DA {{ totalPrice }} €</span>
							<small>IVA INCLUSA</small>
						</button>
					</div>
				</div>

				<!-- Servizi -->
				<div class="mt-[10px]" v-if="stepNumber === 2">
					<div>
						<h2 class="text-[#005A60] font-bold text-[1.2rem] leading-[120%]">Aggiungi accessori per la consegna della spedizione</h2>

						<div class="mt-[30px]">
							<label
								v-for="(service, serviceIndex) in servicesList"
								:key="serviceIndex"
								class="uppercase rounded-[10px] mt-[20px] first:mt-0 border-b-[3px] border-b-[#64C1D0] cursor-pointer block w-full text-center"
								:class="{ 'bg-[rgba(0,0,0,.1)]': servicesArray.includes(service.name.toUpperCase()), 'bg-white ': !servicesArray.includes(service.name.toUpperCase()) }">
								<span class="bg-[#ECECEC] rounded-[10px_10px_0_0] h-[40px] leading-[40px] text-[#025659] font-bold px-[20px] block" :class="{ 'text-[0.9rem]': serviceIndex === 3 }">
									{{ service.name }}
								</span>
								<span class="p-[20px_20px_0_20px] text-[#58A09C] block">
									{{ service.description }}
								</span>
								<input
									type="checkbox"
									@click="chooseService(service)"
									class="opacity-0 pointer-events-none"
									:id="service.name.toUpperCase()"
									:checked="servicesArray.includes(service.name.toUpperCase())"
									:required="servicesArray.length === 0" />
							</label>
						</div>

						<!-- Bottoni -->
						<div>
							<button type="button" @click="prevStep" class="font-light bg-[#AC9478] text-white text-center w-full p-[10px] mt-[20px] rounded-[4px] cursor-pointer">Torna al dettaglio</button>

							<button type="submit" class="font-light bg-[#005961] text-white text-center w-full p-[10px] mt-[20px] rounded-[4px] cursor-pointer">Scegli il servizio</button>
						</div>
					</div>
				</div>

				<!-- Indirizzi - partenza e destinazione -->
				<div v-if="stepNumber === 3">
					<div class="bg-[#F1F1F1] p-[20px_30px] border-[#DEDDE2] border-[1px] rounded-[7px]" v-if="services.service_type.includes('STABILITO/PROGRAMMATO')">
						<h2 class="font-bold mb-[15px] text-[#005761] text-[1.2rem]">Scegli la data del ritiro</h2>
						<div class="grid grid-cols-3 gap-[15px_25px] overflow-y-auto h-[500px] pr-[20px]">
							<label
								v-for="day in daysInMonth"
								:key="day.date.toISOString()"
								class="flex flex-col items-center p-[3px_12px] border rounded-[10px] border-b-[4px] w-full h-full"
								:class="{
									'bg-[#005761] text-white cursor-pointer': services.date == day.date.toLocaleDateString(),
									'bg-[rgba(255,255,255,.8)] text-gray-300': day.weekday === 'Sab' || day.weekday === 'Dom',
									'bg-white text-[#005761] cursor-pointer': day.weekday !== 'Sab' && day.weekday !== 'Dom' && services.date != day.date.toLocaleDateString(),
								}">
								<span class="border-b-[1px] block w-full text-center">{{ day.weekday }}</span>
								<span class="font-bold">{{ day.dayNumber }}</span>

								<span>{{ day.monthAbbr }}</span>

								<input
									type="checkbox"
									v-if="day.weekday !== 'Sab' && day.weekday !== 'Dom'"
									@input="chooseDate(day)"
									class="opacity-0 pointer-events-none"
									:id="`date-${day.dayNumber}-${day.monthAbbr}`"
									:checked="services.date == day.date.toLocaleDateString()"
									:required="!services.date" />
							</label>
						</div>

						<h2 class="font-bold mb-[15px] text-[#005761] text-[1.2rem] mt-[25px]">Scegli la fascia oraria</h2>

						<div>
							<label
								class="text-center border-[1px] rounded-[3px] py-[5px] block cursor-pointer"
								:class="{ 'bg-white text-[#005761]': services.time !== 'Mattina (09:00-14:00)', 'bg-[#005761] text-white': services.time === 'Mattina (09:00-14:00)' }">
								<input type="radio" name="time" v-model="services.time" value="Mattina (09:00-14:00)" class="opacity-0 absolute" required />
								Mattina (09:00-14:00)
							</label>

							<label
								class="mt-[15px] block text-center border-[1px] rounded-[3px] py-[5px] cursor-pointer"
								:class="{ 'bg-white text-[#005761]': services.time !== 'Pomeriggio (14:30-18:30)', 'bg-[#005761] text-white': services.time === 'Pomeriggio (14:30-18:30)' }">
								<input type="radio" name="time" v-model="services.time" value="Pomeriggio (14:30-18:30)" class="opacity-0 absolute" />
								Pomeriggio (14:30-18:30)
							</label>
						</div>

						<p class="text-[#005761] mt-[25px]">
							La fascia oraria ha valore indicativo, senza rappresentare un vincolo per lo spedizioniere. Il ritiro avviene al piano strada e
							<span class="font-bold">non è prevista la telefonata del corriere</span>
							.
						</p>
					</div>

					<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866] mt-[20px]">
						<h2 class="font-bold flex items-center mb-[10px]">
							<!-- <Icon name="game-icons:position-marker" class="text-[#28a64c]" /> -->
							Dettagli della partenza
						</h2>

						<div>
							<label for="name" class="sr-only">Nome e Cognome*</label>
							<input
								type="text"
								placeholder="Nome e Cognome*"
								v-model="originAddress.name"
								id="name"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<div class="mt-[10px]">
							<label for="additional_information" class="sr-only">Indicazioni aggiuntive</label>
							<input
								type="text"
								placeholder="Indicazioni aggiuntive"
								v-model="originAddress.additional_information"
								id="additional_information"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>

						<div class="mt-[10px]">
							<label for="address" class="sr-only">Indirizzo*</label>
							<input
								type="text"
								placeholder="Indirizzo*"
								v-model="originAddress.address"
								id="address"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<small class="italic font-bold mt-[10px] leading-[140%] block">Attenzione a non inserire il numero civico o km anche nel campo indirizzo!</small>

						<div class="mt-[10px]">
							<label for="number_type" class="sr-only">Tipo di numero</label>
							<select v-model="originAddress.number_type" id="number_type" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full">
								<option value="Numero Civico">Numero Civico</option>
								<option value="Numero Km">Numero Km</option>
							</select>
						</div>

						<div class="mt-[10px]">
							<label for="address_number" class="sr-only">Numero</label>
							<div class="relative">
								<small class="w-[10px] absolute left-0 top-[4px] text-center select-none">1</small>
								<input
									type="text"
									placeholder="Numero"
									v-model="originAddress.address_number"
									id="address_number"
									class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
									required />
							</div>
						</div>

						<div class="mt-[10px]">
							<label for="intercom_code" class="sr-only">Codice citofono</label>
							<input
								type="text"
								placeholder="Codice citofono"
								v-model="originAddress.intercom_code"
								id="intercom_code"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>

						<small class="mt-[10px] mb-[20px] leading-[140%] block italic">
							<sup>1</sup>
							<span class="ml-[3px]">Se non si ha il numero civico o il numero del Km inserire SNC (senza numero civico)</span>
						</small>

						<div class="mt-[10px]">
							<label for="country">Paese *</label>
							<input type="text" v-model="newOrigin.country" id="country" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" disabled />
						</div>

						<div class="mt-[10px]">
							<label for="city">Località** *</label>
							<input type="text" v-model="originAddress.city" id="city" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="postal_code">CAP *</label>
							<input type="text" v-model="originAddress.postal_code" id="postal_code" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="province">Provincia *</label>
							<input type="text" v-model="originAddress.province" id="province" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="telephone_number" class="sr-only">Telefono*</label>
							<input
								type="tel"
								placeholder="Telefono*"
								v-model="originAddress.telephone_number"
								id="telephone_number"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<div class="mt-[10px]">
							<label for="email" class="sr-only">Email</label>
							<input type="email" placeholder="Email" v-model="originAddress.email" id="email" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>
					</div>

					<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866] mt-[20px]">
						<h2 class="font-bold flex items-center mb-[10px]">
							<!-- <Icon name="game-icons:position-marker" class="text-[#DB324C]" /> -->
							Dettagli della destinazione
						</h2>

						<div>
							<label for="name" class="sr-only">Nome e Cognome*</label>
							<input
								type="text"
								placeholder="Nome e Cognome*"
								v-model="destinationAddress.name"
								id="name"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<div class="mt-[10px]">
							<label for="additional_information" class="sr-only">Indicazioni aggiuntive</label>
							<input
								type="text"
								placeholder="Indicazioni aggiuntive"
								v-model="destinationAddress.additional_information"
								id="additional_information"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>

						<div class="mt-[10px]">
							<label for="address" class="sr-only">Indirizzo*</label>
							<input
								type="text"
								placeholder="Indirizzo*"
								v-model="destinationAddress.address"
								id="address"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<small class="italic font-bold mt-[10px] leading-[140%] block">Attenzione a non inserire il numero civico o km anche nel campo indirizzo!</small>

						<div class="mt-[10px]">
							<label for="number_type" class="sr-only">Tipo di numero</label>
							<select v-model="destinationAddress.number_type" id="number_type" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full">
								<option value="Numero Civico">Numero Civico</option>
								<option value="Numero Km">Numero Km</option>
							</select>
						</div>

						<div class="mt-[10px]">
							<label for="address_number" class="sr-only">Numero</label>
							<div class="relative">
								<small class="w-[10px] absolute left-0 top-[4px] text-center select-none">1</small>
								<input
									type="text"
									placeholder="Numero"
									v-model="destinationAddress.address_number"
									id="address_number"
									class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
									required />
							</div>
						</div>

						<div class="mt-[10px]">
							<label for="intercom_code" class="sr-only">Codice citofono</label>
							<input
								type="text"
								placeholder="Codice citofono"
								v-model="destinationAddress.intercom_code"
								id="intercom_code"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>

						<small class="mt-[10px] mb-[20px] leading-[140%] block italic">
							<sup>1</sup>
							<span class="ml-[3px]">Se non si ha il numero civico o il numero del Km inserire SNC (senza numero civico)</span>
						</small>

						<div class="mt-[10px]">
							<label for="country">Paese *</label>
							<input type="text" v-model="destinationAddress.country" id="country" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="city">Località** *</label>
							<input type="text" v-model="destinationAddress.city" id="city" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="postal_code">CAP *</label>
							<input type="text" v-model="destinationAddress.postal_code" id="postal_code" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="province">Provincia *</label>
							<input type="text" v-model="destinationAddress.province" id="province" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" required />
						</div>

						<div class="mt-[10px]">
							<label for="telephone_number" class="sr-only">Telefono*</label>
							<input
								type="tel"
								placeholder="Telefono*"
								v-model="destinationAddress.telephone_number"
								id="telephone_number"
								class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full"
								required />
						</div>

						<div class="mt-[10px]">
							<label for="email" class="sr-only">Email</label>
							<input type="email" placeholder="Email" v-model="destinationAddress.email" id="email" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full" />
						</div>
					</div>

					<div class="bg-white p-[20px] rounded-[8px] shadow-[0_2px_2px_#E8E8E8] text-[#095866] mt-[20px]">
						<textarea
							placeholder="Riferimento interno (utile ad identificare la spedizione)"
							name=""
							id=""
							class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full resize-none"></textarea>

						<textarea
							placeholder="Note per la consegna (stampata sull'etichetta)"
							name=""
							id=""
							class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full resize-none"></textarea>

						<textarea placeholder="Contenuto" name="" id="" class="bg-[#F8F9FB] p-[10px] border-b border-[#E9EBEC] placeholder:text-gray-400 w-full resize-none"></textarea>
					</div>

					<input type="submit" value="CONFERMA LA SPEDIZIONE" class="font-light bg-[#005961] text-white text-center w-full p-[10px] mt-[20px] rounded-[4px] cursor-pointer" />
				</div>

				<!-- Riepilogo -->
				<div v-if="stepNumber === 4">
					<div class="bg-white pt-[10px] px-[15px] pb-[30px] rounded-[12px] border-[1px] border-[#E2E4E6] text-[#3E7D84]">
						<div class="border-b-[1px] border-[#E5E5E5] py-[7px]">
							<!-- <Icon name="mi:home" class="text-[#28a64c] mr-[5px]" /> -->
							{{ originAddress.city }} - {{ originAddress.postal_code }} - {{ originAddress.country }}
						</div>

						<div class="border-b-[1px] border-[#E5E5E5] py-[7px]">
							<!-- <Icon name="mi:home" class="text-[#DB324C] mr-[5px]" /> -->
							{{ destinationAddress.city }} - {{ destinationAddress.postal_code }} - {{ destinationAddress.country }}
						</div>
					</div>

					<div class="bg-white py-[10px] px-[15px] rounded-[12px] border-[1px] border-[#E2E4E6] text-[#3E7D84] mt-[8px]">
						<div class="border-b-[1px] border-[#E5E5E5] py-[7px] font-bold">Colli</div>

						<div class="border-b-[1px] border-[#E5E5E5] py-[7px]">
							<ul v-if="packages">
								<li v-for="summaryPackage in packages">
									{{ summaryPackage.quantity }} x {{ summaryPackage.weight }}kg ({{ Number(summaryPackage.first_size) / 100 }} x {{ Number(summaryPackage.second_size) / 100 }} x
									{{ Number(summaryPackage.third_size) / 100 }})
								</li>
							</ul>
						</div>

						<div class="py-[7px]">
							Contenuto:
							<span class="font-bold">MERCE</span>
						</div>
					</div>

					<div class="bg-white py-[10px] px-[15px] rounded-[12px] border-[1px] border-[#E2E4E6] text-[#3E7D84] mt-[8px]">
						<div class="border-b-[1px] border-[#E5E5E5] py-[7px] font-bold">Servizio</div>

						<div class="border-b-[1px] border-[#E5E5E5] py-[7px]">{{ services.service_type }}</div>

						<div class="border-b-[1px] border-[#E5E5E5] py-[7px]">{{ services.date }} - {{ services.time }}</div>
					</div>

					<div class="bg-white pt-[10px] px-[15px] pb-[30px] rounded-[12px] border-[1px] border-[#E2E4E6] text-[#3E7D84] mt-[8px]">
						<div class="border-b-[1px] border-[#E5E5E5] py-[7px] text-right font-bold">Importo</div>

						<div class="border-b-[1px] border-[#E5E5E5] pt-[7px] pb-[15px] text-right">
							<small>IVA INCLUSA</small>
							<h5 class="font-bold text-[1.2rem]">{{ totalPrice }}€</h5>
							<!-- <small class="bg-[#F1F1F1] p-[5px] rounded-[3px] block w-full">TRASPORTO 6 €</small> -->
						</div>
					</div>

					<input type="button" @click="addToCart" value="AGGIUNGI AL CARRELLO" class="font-light bg-[#005961] text-white text-center w-full p-[10px] mt-[20px] rounded-[4px] cursor-pointer" />
				</div>
			</form>
		</div>
	</section>
</template>

<style scoped>
.iconify {
	font-size: 30px;
}
</style>
