<script setup>
const userStore = useUserStore();
const route = useRoute();

const formRef = ref(null);

const isRateCalculated = ref(false);

const getTodayDate = computed(() => {
	const today = new Date();
	const dd = String(today.getDate()).padStart(2, "0");
	const mm = String(today.getMonth() + 1).padStart(2, "0");
	const yyyy = today.getFullYear();

	return yyyy + "-" + mm + "-" + dd;
});

/* const getTodayDate = new Date().toISOString().split("T")[0]; */

const { session, status, refresh } = useSession();

const packageTypeList = [
	{
		text: "Pacco",
		img: "pack.png",
		width: 43,
		height: 47,
	},
	{
		text: "Busta",
		img: "envelope.png",
		width: 47,
		height: 32,
	},
	{
		text: "Pallet",
		img: "pallet.png",
		width: 43,
		height: 42,
	},
	{
		text: "Valigia",
		img: "suitcase.png",
		width: 30,
		height: 52,
	},
];

const isPackageSelected = ref(false);

const newPackage = ref({});

/* Seleziono la tipologia di pacco */
const selectPackageType = (packageType) => {
	newPackage.value = {};

	/* firstClick.value = false; */

	/* packageImage.value.img = ;
	packageImage.value.width = packageType.width;
	packageImage.value.height = packageType.height; */

	if (isRateCalculated.value) {
		isRateCalculated.value = false;
	}

	newPackage.value.package_type = packageType.text;
	newPackage.value.quantity = 1;
	newPackage.value.img = packageType.img;
	newPackage.value.width = packageType.width;
	newPackage.value.height = packageType.height;

	userStore.packages.push(newPackage.value);

	isPackageSelected.value = true;
};

const myPack = ref(null);

const sanctum = useSanctumClient();

/* Controllo se il prezzo con il volume e con il peso esistono a calcolo la quantità */
const checkPrices = (pack) => {
	let basePrice = null;

	const wp = pack.weight_price != null ? Number(pack.weight_price) : null;
	const vp = pack.volume_price != null ? Number(pack.volume_price) : null;

	if (wp != null && !isNaN(wp) && vp != null && !isNaN(vp)) {
		basePrice = Math.max(wp, vp);
	} else if (wp != null && !isNaN(wp)) {
		basePrice = wp;
	} else if (vp != null && !isNaN(vp)) {
		basePrice = vp;
	}

	if (basePrice != null && basePrice > 0) {
		pack.single_price = basePrice;
		pack.single_priceOrig = basePrice;
		calcQuantity(pack);
	}
};

/* Calcolo prezzo se la quantità cambia */
const calcQuantity = (pack) => {
	const orig = Number(pack.single_priceOrig) || 0;
	const qty = Number(pack.quantity) || 1;
	pack.single_price = orig * qty;

	userStore.totalPrice = 0;

	userStore.packages.forEach((p) => {
		userStore.totalPrice += Number(p.single_price) || 0;
	});
};

/* Calcolo del prezzo tenendo conto del peso */
const calcPriceWithWeight = (pack) => {
	if (pack.weight != null) {
		pack.weight = String(pack.weight).replace(/[a-zA-Z]/g, "");
	}

	myPack.value = pack;
	const weight = Number(pack.weight);

	if (!pack.weight || isNaN(weight) || weight <= 0) {
		pack.weight_price = null;
		return;
	}

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
	if (pack.first_size) {
		pack.first_size = String(pack.first_size).replace(/[^0-9]/g, "");
	}

	if (pack.second_size) {
		pack.second_size = String(pack.second_size).replace(/[^0-9]/g, "");
	}

	if (pack.third_size) {
		pack.third_size = String(pack.third_size).replace(/[^0-9]/g, "");
	}

	myPack.value = pack;

	if (pack.first_size && pack.second_size && pack.third_size) {
		const firstSize = Number(pack.first_size);
		const secondSize = Number(pack.second_size);
		const thirdSize = Number(pack.third_size);

		if (firstSize <= 0 || secondSize <= 0 || thirdSize <= 0) {
			pack.volume_price = null;
			return;
		}

		const volume = (firstSize / 100) * (secondSize / 100) * (thirdSize / 100);

		const volumeNumber = Number(volume.toFixed(3));

		if (volumeNumber > 0 && volumeNumber < 0.008) {
			pack.volume_price = 9;
		} else if (volumeNumber >= 0.008 && volumeNumber < 0.02) {
			pack.volume_price = 12;
		} else if (volumeNumber >= 0.02 && volumeNumber < 0.04) {
			pack.volume_price = 18;
		} else if (volumeNumber >= 0.04 && volumeNumber <= 0.1) {
			pack.volume_price = 20;
		} else {
			pack.volume_price = 20;
		}

		checkPrices(pack);
	}
};

const filterCap = (shipment_details) => {
	if (shipment_details.origin_postal_code) {
		shipment_details.origin_postal_code = shipment_details.origin_postal_code.replace(/[a-zA-Z]/g, "");
	}

	if (shipment_details.destination_postal_code) {
		shipment_details.destination_postal_code = shipment_details.destination_postal_code.replace(/[a-zA-Z]/g, "");
	}
};

const deletePack = async (index) => {
	userStore.packages.splice(index, 1);

	/* const index = session.value?.data?.packages */

	/* try {
		await useSanctumFetch(`/api/session/delete-package/${index}`, {
			method: "DELETE",
		});
	} catch (error) {
		messageError.value = error.data.errors;
	}

	await refresh(); */

	if (userStore.packages.length === 0) {
		isPackageSelected.value = false;
		/* userStore.isRateCalculated = false; */
		/* firstClick.value = false; */
		/* userStore.newPackage = {}; */
		isRateCalculated.value = false;
	}

	/* userStore.newPackage = {}; */

	/* firstClick.value = false; */

	/* isRateCalculated.value = false; */

	userStore.totalPrice = 0;

	userStore.packages.forEach((pack) => {
		userStore.totalPrice += Number(pack.single_price);
	});
};

const messageError = ref(null);

const calculateRate = async () => {
	messageError.value = null;
	// Validate form on client-side FIRST
	if (!formRef.value || !formRef.value.checkValidity()) {
		formRef.value?.reportValidity();
		isRateCalculated.value = false;
		return false;
	}

	// Check that at least one package is selected
	if (!userStore.packages || userStore.packages.length === 0) {
		messageError.value = { packages: ["Seleziona almeno un tipo di collo."] };
		isRateCalculated.value = false;
		return false;
	}

	// Validate each package has weight and dimensions, and ensure prices are calculated
	for (let i = 0; i < userStore.packages.length; i++) {
		const pack = userStore.packages[i];
		if (!pack.weight || !pack.first_size || !pack.second_size || !pack.third_size) {
			messageError.value = { packages: ["Compila peso e dimensioni per tutti i colli."] };
			isRateCalculated.value = false;
			return false;
		}

		// Recalculate prices to ensure they exist
		if (pack.weight_price == null) {
			calcPriceWithWeight(pack);
		}
		if (pack.volume_price == null && pack.first_size && pack.second_size && pack.third_size) {
			calcPriceWithVolume(pack);
		}
		// If single_price is still not set, calculate from available prices
		if (pack.single_price == null || pack.single_price === undefined) {
			checkPrices(pack);
		}
		// Final safety check
		if (pack.single_price == null || pack.single_price === undefined) {
			messageError.value = { packages: ["Errore nel calcolo del prezzo. Reinserisci peso e dimensioni."] };
			isRateCalculated.value = false;
			return false;
		}
	}

	try {
		await sanctum("/sanctum/csrf-cookie");
		await sanctum("/api/session/first-step", {
			method: "POST",
			body: {
				shipment_details: userStore.shipmentDetails,
				packages: userStore.packages,
			},
		});
	} catch (error) {
		messageError.value = error?.data?.errors || { packages: ["Errore durante il calcolo. Riprova."] };
		isRateCalculated.value = false;
		return false;
	}

	messageError.value = null;
	isRateCalculated.value = true;
	userStore.isQuoteStarted = true;
	await refresh();

	return true;
};


const continueToNextStep = async () => {
	messageError.value = null;

	// If rate is already calculated, navigate to next step
	if (isRateCalculated.value) {
		await navigateTo('/la-tua-spedizione/2');
		return;
	}

	// First click: calculate rate and show price
	await calculateRate();
};
const nextStep = async () => {
	window.scrollTo(0, 0);

	userStore.stepNumber++;
};

const getPackages = computed(() => (userStore.packages.length === 0 && session.value?.data ? session.value?.data.packages : userStore.packages));

/* onMounted(() => { */
/* const saved = sessionStorage.getItem("stepNumber");

	if (saved) {
		sessionStorage.removeItem("stepNumber");
	} */
/* const isShipmentDetailsEmpty = Object.values(userStore.shipmentDetails).every((detail) => detail === ""); */
/* if (userStore.packages?.length === 0 && session.value) {
		userStore.packages = session.value?.data?.packages;
	} */
/* isLoading.value = false; */
/* }); */

watch(
	() => userStore.packages,
	() => {
		messageError.value = null;
		isRateCalculated.value = false;
	},
	{ deep: true },
);

watch(
	() => userStore.shipmentDetails,
	() => {
		messageError.value = null;
		isRateCalculated.value = false;
	},
	{ deep: true },
);
</script>

<template>
	<section>
		<div class="my-container">
			<div
				class="bg-white w-full rounded-[24px] desktop-xl:rounded-[32px] relative z-50 p-[20px_16px] desktop:p-[30px_36px] tablet:p-[20px_40px] mx-auto"
			:class="route.path === '/'
				? 'mt-[-40px] tablet:mt-[-60px] desktop:mt-[-50px] desktop-xl:mt-[-30px] max-w-[1260px]'
				: 'mt-[40px] max-w-[1200px]'">
				<h2 class="border-b-[1px] border-[#E6E6E6] text-[1.25rem] desktop:text-[2rem] text-black font-bold text-center pb-[8px]">Preventivo Rapido</h2>

				<form ref="formRef" @submit.prevent="">
					<Steps :current-step="0" />

					<h3 class="font-semibold text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[469px] h-[50px] pl-[18px]">Aggiungi altri colli alla spedizione</h3>

					<ul class="flex items-center flex-wrap gap-[16px] desktop:gap-x-[30px] desktop-xl:gap-x-[40px] mt-[10px]">
						<li
							v-for="(packageType, packageTypeIndex) in packageTypeList"
							:key="packageTypeIndex"
							class="rounded-[21px] relative shadow-[6px_6px_5.3px_rgba(0,0,0,.32)] h-[77px] desktop-xl:text-[1.625rem] text-black font-medium tracking-[-0.624px] w-[calc(50%-8px)] tablet:w-[calc(25%-12px)] desktop-xl:w-[193px]">
							<button
								type="button"
								@click="selectPackageType(packageType)"
								class="w-full h-full flex justify-center items-center gap-x-[31px] cursor-pointer package-card after:content-[''] after:bg-no-repeat after:bg-right"
								:style="{ '--after-bg': `url(/img/quote/first-step/${packageType.img})`, '--after-width': `${packageType.width}px`, '--after-height': `${packageType.height}px` }">
								{{ packageType.text }}
							</button>
							<input type="radio" name="package_type" class="absolute left-[50%] bottom-0 opacity-0 pointer-events-none" />
							<!--  :required="!isPackageSelected" -->
						</li>
					</ul>

					<p v-if="messageError?.packages" class="text-red-500 text-[1rem] mt-[10px]">
						{{ messageError.packages[0] }}
					</p>

					<h3 class="font-semibold text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[600px] h-[50px] pl-[18px] mt-[40px]">Inserisci la posizione di partenza e destinazione</h3>

					<div
						class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[24px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 border-[1px] border-[rgba(0,0,0,.2)] rounded-[30px] p-[15px] mt-[10px]">
						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
							<label for="origin_city" class="label-preventivo-rapido">Città di Ritiro</label>
							<input type="text" v-model="userStore.shipmentDetails.origin_city" id="origin_city" placeholder="Città" class="input-preventivo-rapido" required />
							<p v-if="messageError?.['shipment_details.origin_city']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.origin_city"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
							<label for="origin_postal_code" class="label-preventivo-rapido">CAP di Ritiro</label>
							<input
								type="text"
								v-model="userStore.shipmentDetails.origin_postal_code"
								id="origin_postal_code"
								placeholder="CAP"
								class="input-preventivo-rapido"
								required
								@input="filterCap(userStore.shipmentDetails)" />
							<p v-if="messageError?.['shipment_details.origin_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.origin_postal_code"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
							<label for="destination_city" class="label-preventivo-rapido">Città Consegna</label>
							<input type="text" v-model="userStore.shipmentDetails.destination_city" id="destination_city" placeholder="Città" class="input-preventivo-rapido" required />
							<p v-if="messageError?.['shipment_details.destination_city']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.destination_city"][0] }}
							</p>
						</div>

						<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
							<label for="destination_postal_code" class="label-preventivo-rapido">CAP Consegna</label>
							<input
								type="text"
								v-model="userStore.shipmentDetails.destination_postal_code"
								id="destination_postal_code"
								placeholder="CAP"
								class="input-preventivo-rapido"
								required
								@input="filterCap(userStore.shipmentDetails)" />
							<p v-if="messageError?.['shipment_details.destination_postal_code']" class="text-red-500 text-[1rem] mt-[10px]">
								{{ messageError["shipment_details.destination_postal_code"][0] }}
							</p>
						</div>

					</div>

					<div v-if="userStore.packages.length > 0">
						<h3 class="font-semibold text-[1.25rem] text-black border-b-[1px] border-[#E6E6E6] desktop:w-[492px] h-[50px] pl-[18px] mt-[40px]">Inserisci le dimensioni e il peso dei colli</h3>

						<ul class="mt-[10px]">
							<li
								v-for="(pack, packIndex) in userStore.packages"
								:key="packIndex"
								class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[24px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 border-[1px] border-[rgba(0,0,0,.2)] rounded-[30px] p-[15px_20px] mt-[10px] w-full li-card before:content-[''] before:self-center"
								:style="{ '--before-bg': `url(/img/quote/first-step/${pack.img})`, '--before-width': `${pack.width}px`, '--before-height': `${pack.height}px` }">
								<!-- class=""
									 -->
								<div class="self-center">
									<select v-model="pack.quantity" id="quantity" class="text-black text-[1.25rem] font-medium" @change="calcQuantity(pack)">
										<option v-for="quantity in 10" :key="quantity" :value="quantity" :disabled="quantity === pack.quantity">
											{{ quantity }}
										</option>
									</select>
									<p v-if="messageError?.[`packages.${packIndex}.quantity`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.quantity`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="weight" class="label-preventivo-rapido">Peso (Kg)</label>
									<input type="text" placeholder="...Kg" v-model="pack.weight" id="weight" class="input-preventivo-rapido" @input="calcPriceWithWeight(pack)" required />
									<p v-if="messageError?.[`packages.${packIndex}.weight`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.weight`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="first_size" class="label-preventivo-rapido">Lato 1 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.first_size" id="first_size" class="input-preventivo-rapido" @input="calcPriceWithVolume(pack)" required />
									<p v-if="messageError?.[`packages.${packIndex}.first_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.first_size`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="second_size" class="label-preventivo-rapido">Lato 2 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.second_size" id="second_size" class="input-preventivo-rapido" @input="calcPriceWithVolume(pack)" required />
									<p v-if="messageError?.[`packages.${packIndex}.second_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.second_size`][0] }}
									</p>
								</div>

								<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
									<label for="third_size" class="label-preventivo-rapido">Lato 3 (Cm)</label>
									<input type="text" placeholder="...Cm" v-model="pack.third_size" id="third_size" class="input-preventivo-rapido" @input="calcPriceWithVolume(pack)" required />
									<p v-if="messageError?.[`packages.${packIndex}.third_size`]" class="text-red-500 text-[1rem] mt-[10px]">
										{{ messageError[`packages.${packIndex}.third_size`][0] }}
									</p>
								</div>

								<button type="button" class="cursor-pointer text-[#DB9FA1] self-center" @click="deletePack(packIndex)" aria-label="Elimina elemento" title="Elimina">
									<NuxtImg src="/img/quote/first-step/trash.png" alt="" width="30" height="35" />
								</button>
							</li>
						</ul>
					</div>

					<!-- <button
							type="button"
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px]"
							@click="calculateRate"
							:class="{
								'text-[1.875rem] h-[80px] after:ml-[20px] after:scale-200': !isRateCalculated,
								'h-[113px] after:scale-300 after:ml-[35px] flex items-center justify-center': isRateCalculated,
							}">
							<span v-if="!isRateCalculated">Continua</span>
							<span v-else>
								<span class="text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ totalPrice }}€</span>
								<span class="block text-right mr-[5px] mt-[5px]">IVA inclusa</span>
							</span>
						</button> -->

					<div
						class="bg-[#E44203] w-full text-white font-semibold text-center mt-[24px] desktop-xl:mt-[40px] rounded-[50px] desktop:mt-[20px] tracking-[-0.48px]"
						:class="{ 'text-[1.875rem] h-[80px]': !isRateCalculated, ' h-[113px]': isRateCalculated }">
							<button
								type="button"
								@click="continueToNextStep"
								class="w-full h-full rounded-[50px] cursor-pointer after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px] text-[1.875rem] after:ml-[10px] after:scale-200">
								<span v-if="!isRateCalculated">Continua</span>
								<span v-else>
									<span class="text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ session?.data?.total_price }}€</span>
									<span class="block text-right mr-[5px] mt-[5px]">IVA inclusa</span>
								</span>
							</button>

						<p v-if="status === 'pending'" class="h-full flex justify-center items-center">
							<Icon name="eos-icons:bubble-loading" style="font-size: 60px" />
						</p>
					</div>

					<!-- <button
							type="button"
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px] text-[1.875rem] h-[80px] after:ml-[10px] after:scale-200"
							@click="calculateRate"
							v-if="!isRateCalculated">
							Continua
						</button>

						<NuxtLink
							to="/la-tua-spedizione"
							v-else
							class="bg-[#E44203] w-full text-white font-semibold text-center mt-[32px] desktop-xl:mt-[88px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px] after:content-[''] after:bg-[url(/img/arrow-down.svg)] after:inline-block after:size-[16px] h-[113px] after:scale-300 after:ml-[35px] flex items-center justify-center">
							<span>
								<span class="text-[2.25rem] border-b-[1px] border-white pb-[4px]">Spedisci da {{ userStore.totalPrice }}€</span>
								<span class="block text-right mr-[5px] mt-[5px]">IVA inclusa</span>
							</span>
						</NuxtLink> -->
				</form>
			</div>
		</div>
	</section>
</template>

<style>
.package-card::after {
	background-image: var(--after-bg);
	width: var(--after-width);
	height: var(--after-height);
}

.li-card::before {
	background-image: var(--before-bg);
	width: var(--before-width);
	height: var(--before-height);
}

.service-list::before {
	background-image: var(--before-service-bg);
	width: var(--before-service-width);
	height: var(--before-service-height);
}
</style>
