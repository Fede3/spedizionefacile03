<!--
  FILE: pages/account/indirizzi/index.vue
  SCOPO: Rubrica indirizzi — CRUD completo degli indirizzi salvati dall'utente.
         Card layout con predefinito, creazione, modifica, eliminazione con conferma inline.
  API: GET /api/user-addresses — lista indirizzi,
       POST /api/user-addresses — crea nuovo,
       PATCH /api/user-addresses/{id} — modifica / imposta predefinito,
       DELETE /api/user-addresses/{id} — elimina.
  COMPONENTI: nessun componente custom (solo Icon di Nuxt).
  ROUTE: /account/indirizzi (middleware sanctum:auth).

  DATI IN INGRESSO:
    - addresses (da useSanctumFetch) — lista indirizzi dal server.
    - provinceList — elenco completo province italiane (hardcoded).

  DATI IN USCITA:
    - POST/PATCH/DELETE su /api/user-addresses — operazioni CRUD.

  VINCOLI:
    - L'utente deve essere autenticato (middleware sanctum:auth).
    - Ogni indirizzo ha: name, address, city, postal_code, province_name, default.
    - Un solo indirizzo puo' essere predefinito alla volta.

  ERRORI TIPICI:
    - Errore di validazione dal backend (CAP malformato, campi mancanti).
    - Errore di rete durante eliminazione.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere campi all'indirizzo: aggiungere in newAddress, editedAddress, form e API body.
    - Cambiare il limite massimo di indirizzi: gestito lato backend.

  COLLEGAMENTI:
    - pages/account/index.vue → dashboard account (breadcrumb).
    - pages/riepilogo.vue → gli indirizzi salvati possono essere usati nel riepilogo spedizione.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

const route = useRoute();
const router = useRouter();

/* Lista completa delle province italiane per il menu a tendina */
const provinceList = ref([
	"AG - Agrigento", "AL - Alessandria", "AN - Ancona", "AO - Aosta",
	"AP - Ascoli Piceno", "AQ - L'Aquila", "AR - Arezzo", "AT - Asti",
	"AV - Avellino", "BA - Bari", "BG - Bergamo", "BI - Biella",
	"BL - Belluno", "BN - Benevento", "BO - Bologna", "BR - Brindisi",
	"BS - Brescia", "BT - Barletta-Andria-Trani", "BZ - Bolzano/Bozen",
	"CA - Cagliari", "CB - Campobasso", "CE - Caserta", "CH - Chieti",
	"CI - Sulcis Iglesiente", "CL - Caltanissetta", "CN - Cuneo",
	"CO - Como", "CR - Cremona", "CS - Cosenza", "CT - Catania",
	"CZ - Catanzaro", "EN - Enna", "FC - Forlì-Cesena", "FE - Ferrara",
	"FG - Foggia", "FI - Firenze", "FM - Fermo", "FR - Frosinone",
	"GE - Genova", "GO - Gorizia", "GR - Grosseto", "IM - Imperia",
	"IS - Isernia", "KR - Crotone", "LC - Lecco", "LE - Lecce",
	"LI - Livorno", "LO - Lodi", "LT - Latina", "LU - Lucca",
	"MB - Monza e Brianza", "MC - Macerata", "ME - Messina", "MI - Milano",
	"MN - Mantova", "MO - Modena", "MS - Massa-Carrara", "MT - Matera",
	"NA - Napoli", "NO - Novara", "NU - Nuoro", "OR - Oristano",
	"PA - Palermo", "PC - Piacenza", "PD - Padova", "PE - Pescara",
	"PG - Perugia", "PI - Pisa", "PN - Pordenone", "PO - Prato",
	"PR - Parma", "PT - Pistoia", "PU - Pesaro e Urbino", "PV - Pavia",
	"PZ - Potenza", "RA - Ravenna", "RC - Reggio Calabria",
	"RE - Reggio Emilia", "RG - Ragusa", "RI - Rieti", "RM - Roma",
	"RN - Rimini", "RO - Rovigo", "SA - Salerno", "SI - Siena",
	"SO - Sondrio", "SP - La Spezia", "SR - Siracusa", "SS - Sassari",
	"SV - Savona", "TA - Taranto", "TE - Teramo", "TN - Trento",
	"TO - Torino", "TP - Trapani", "TR - Terni", "TS - Trieste",
	"TV - Treviso", "UD - Udine", "VA - Varese",
	"VB - Verbano-Cusio-Ossola", "VC - Vercelli", "VE - Venezia",
	"VI - Vicenza", "VR - Verona", "VT - Viterbo", "VV - Vibo Valentia",
	"VS - Medio Campidano",
]);

/* Dati del nuovo indirizzo da creare */
const newAddress = ref({
	name: "",
	address: "",
	city: "",
	postal_code: "",
	province_name: "",
	default: false,
});

/* Messaggi di feedback */
const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);

/* Stato visualizzazione form */
const showEditForm = ref(false);
const showCreateForm = ref(false);
const editedAddress = ref(null);

/* ID dell'indirizzo da eliminare (per conferma inline) */
const deleteConfirmId = ref(null);
/* Indica se l'eliminazione e' in corso */
const deleteLoading = ref(false);

/* Carica la lista degli indirizzi salvati dal server */
const {
	data: addresses,
	error,
	status,
	refresh: refreshAddress,
// lazy: true — la rubrica indirizzi si carica dopo il render iniziale della pagina
} = useSanctumFetch(`/api/user-addresses`, {
	method: "GET",
	lazy: true,
});

const sanctum = useSanctumClient();

/* Apre il form di modifica con i dati dell'indirizzo selezionato */
const edit = (address) => {
	editedAddress.value = { ...address };
	showEditForm.value = true;
	messageError.value = null;
	messageSuccess.value = null;
};

/* Chiude il form di modifica senza salvare */
const cancelEdit = () => {
	editedAddress.value = null;
	showEditForm.value = false;
	messageError.value = null;
};

/* Chiude il form di creazione e pulisce i campi */
const cancelAdd = () => {
	newAddress.value = { name: "", address: "", city: "", postal_code: "", province_name: "", default: false };
	showCreateForm.value = false;
	messageError.value = null;
};

/* Salva un nuovo indirizzo nel server, poi ricarica la lista */
const createAddress = async () => {
	messageError.value = null;
	messageLoading.value = "Aggiunta in corso...";

	try {
		await sanctum(`/api/user-addresses`, {
			method: "POST",
			body: newAddress.value,
		});

		await refreshAddress();
		newAddress.value = { name: "", address: "", city: "", postal_code: "", province_name: "", default: false };
		showCreateForm.value = false;
		messageLoading.value = null;
		messageSuccess.value = "Indirizzo aggiunto con successo!";
		setTimeout(() => { messageSuccess.value = null; }, 4000);
	} catch (error) {
		messageError.value = error?.data?.message || "Errore durante l'aggiunta. Riprova.";
		messageLoading.value = null;
	}
};

/* Salva le modifiche a un indirizzo esistente */
const editAddress = async () => {
	messageError.value = null;
	messageLoading.value = "Salvataggio in corso...";

	try {
		await sanctum(`/api/user-addresses/${editedAddress.value.id}`, {
			method: "PATCH",
			body: {
				name: editedAddress.value.name,
				address: editedAddress.value.address,
				city: editedAddress.value.city,
				province_name: editedAddress.value.province_name,
				postal_code: editedAddress.value.postal_code,
			},
		});

		await refreshAddress();
		showEditForm.value = false;
		messageLoading.value = null;
		messageSuccess.value = "Indirizzo aggiornato con successo!";
		setTimeout(() => { messageSuccess.value = null; }, 4000);
	} catch (error) {
		messageError.value = error?.data?.message || "Errore durante il salvataggio. Riprova.";
		messageLoading.value = null;
	}
};

/* Imposta un indirizzo come predefinito */
const editDefaultAddress = async (address) => {
	messageError.value = null;
	try {
		await sanctum(`/api/user-addresses/${address.id}`, {
			method: "PATCH",
			body: { default: true },
		});
		await refreshAddress();
		messageSuccess.value = "Indirizzo predefinito aggiornato!";
		setTimeout(() => { messageSuccess.value = null; }, 3000);
	} catch (error) {
		messageError.value = "Errore durante l'aggiornamento. Riprova.";
	}
};

/* Elimina un indirizzo dal server e ricarica la lista */
const deleteAddress = async (id) => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/user-addresses/${id}`, {
			method: "DELETE",
		});
		await refreshAddress();
		deleteConfirmId.value = null;
		messageSuccess.value = "Indirizzo eliminato.";
		setTimeout(() => { messageSuccess.value = null; }, 3000);
	} catch (error) {
		messageError.value = "Errore durante l'eliminazione. Riprova.";
	} finally {
		deleteLoading.value = false;
	}
};

/* Rimuove la provincia attuale dalla lista (per evitare duplicati nel menu a tendina) */
const filteredProvinces = (address) => {
	return provinceList.value.filter((province) => province !== address.province_name);
};

/* Estrae la sigla della provincia (le prime 2 lettere) */
const getProvinceCode = (provinceName) => {
	if (!provinceName) return '';
	return provinceName.slice(0, 2);
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span v-if="!showEditForm && !showCreateForm" class="font-semibold text-[#252B42]">Indirizzi</span>
				<template v-else>
					<NuxtLink class="hover:underline text-[#095866] cursor-pointer" @click.prevent="cancelEdit(); cancelAdd();">Indirizzi</NuxtLink>
					<span class="mx-[6px]">/</span>
					<span class="font-semibold text-[#252B42]">{{ showEditForm ? 'Modifica indirizzo' : 'Nuovo indirizzo' }}</span>
				</template>
			</div>

			<!-- Messaggi di feedback globali -->
			<div v-if="messageSuccess" class="mb-[20px] px-[16px] py-[12px] rounded-[50px] text-[0.875rem] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-[8px]">
				<Icon name="mdi:check-circle-outline" class="text-[18px] shrink-0 text-emerald-600" />
				{{ messageSuccess }}
			</div>
			<div v-if="messageError && !showEditForm && !showCreateForm" class="mb-[20px] px-[16px] py-[12px] rounded-[50px] text-[0.875rem] font-medium bg-red-50 text-red-700 border border-red-200">
				{{ messageError }}
			</div>

			<!-- ===== LISTA INDIRIZZI ===== -->
			<template v-if="!showEditForm && !showCreateForm">
				<div class="flex items-center justify-between mb-[24px]">
					<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42]">I tuoi indirizzi</h1>
					<button
						@click="showCreateForm = true; messageError = null; messageSuccess = null;"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-semibold transition-colors cursor-pointer">
						<Icon name="mdi:plus" class="text-[18px]" />
						Aggiungi indirizzo
					</button>
				</div>

				<!-- Loading skeleton -->
				<div v-if="!addresses" class="space-y-[12px]">
					<div v-for="n in 2" :key="n" class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] animate-pulse">
						<div class="flex items-center gap-[16px]">
							<div class="w-[44px] h-[44px] rounded-[50px] bg-gray-200"></div>
							<div class="flex-1 space-y-[8px]">
								<div class="h-[14px] bg-gray-200 rounded w-[50%]"></div>
								<div class="h-[12px] bg-gray-200 rounded w-[35%]"></div>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty state -->
				<div v-else-if="addresses?.data?.length === 0" class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
					<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<Icon name="mdi:map-marker-outline" class="text-[32px] text-[#C8CCD0]" />
					</div>
					<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessun indirizzo salvato</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
						Salva i tuoi indirizzi per velocizzare la compilazione delle spedizioni.
					</p>
					<button
						@click="showCreateForm = true"
						class="inline-flex items-center gap-[6px] px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
						<Icon name="mdi:plus" class="text-[18px]" />
						Aggiungi il tuo primo indirizzo
					</button>
				</div>

				<!-- Elenco indirizzi come card -->
				<div v-else class="space-y-[12px]">
					<div
						v-for="(address, index) in addresses.data"
						:key="address.id"
						:class="[
							'bg-white rounded-[16px] p-[20px] desktop:p-[24px] border transition-all',
							address.default ? 'border-[#095866] shadow-sm' : 'border-[#E9EBEC] hover:border-[#D0D0D0]',
						]">
						<div class="flex items-start gap-[16px]">
							<!-- Icona indirizzo -->
							<div :class="['w-[44px] h-[44px] rounded-[50px] flex items-center justify-center shrink-0', address.default ? 'bg-[#095866]/10' : 'bg-[#F8F9FB]']">
								<Icon name="mdi:map-marker-outline" :class="['text-[22px]', address.default ? 'text-[#095866]' : 'text-[#737373]']" />
							</div>

							<!-- Dati indirizzo -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-[8px] mb-[4px]">
									<h3 class="text-[0.9375rem] font-bold text-[#252B42]">{{ address.name }}</h3>
									<span v-if="address.default" class="inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium bg-[#095866]/10 text-[#095866]">
										Predefinito
									</span>
								</div>
								<p class="text-[0.875rem] text-[#404040]">{{ address.address }}</p>
								<p class="text-[0.875rem] text-[#737373]">
									{{ address.postal_code }} {{ address.city }}
									<span v-if="address.province_name">({{ getProvinceCode(address.province_name) }})</span>
								</p>
							</div>

							<!-- Azioni -->
							<div class="flex items-center gap-[6px] shrink-0">
								<button
									v-if="!address.default"
									@click="editDefaultAddress(address)"
									class="text-[0.8125rem] text-[#095866] hover:underline cursor-pointer font-medium hidden desktop:inline">
									Predefinito
								</button>
								<button
									@click="edit(address)"
									class="inline-flex items-center gap-[4px] px-[12px] py-[6px] rounded-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] text-[0.8125rem] cursor-pointer font-medium transition-colors">
									<Icon name="mdi:pencil" class="text-[14px]" />
									Modifica
								</button>

								<!-- Conferma eliminazione inline -->
								<template v-if="deleteConfirmId !== address.id">
									<button
										@click="deleteConfirmId = address.id"
										class="inline-flex items-center gap-[4px] text-[0.8125rem] text-red-400 hover:text-red-600 cursor-pointer ml-[4px]">
										<Icon name="mdi:delete-outline" class="text-[14px]" />
										Elimina
									</button>
								</template>
								<template v-else>
									<div class="flex items-center gap-[6px]">
										<button
											@click="deleteAddress(address.id)"
											:disabled="deleteLoading"
											class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-red-600 hover:bg-red-700 text-white rounded-[6px] text-[0.75rem] font-medium cursor-pointer disabled:opacity-60">
											<Icon name="mdi:check" class="text-[14px]" />
											{{ deleteLoading ? 'Eliminazione...' : 'Conferma' }}
										</button>
										<button
											@click="deleteConfirmId = null"
											class="inline-flex items-center gap-[4px] px-[12px] py-[6px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[6px] text-[0.75rem] font-medium cursor-pointer">
											<Icon name="mdi:close" class="text-[14px]" />
											Annulla
										</button>
									</div>
								</template>
							</div>
						</div>

						<!-- Bottone "Imposta predefinito" su mobile -->
						<button
							v-if="!address.default"
							@click="editDefaultAddress(address)"
							class="desktop:hidden mt-[12px] w-full inline-flex items-center justify-center gap-[6px] py-[8px] text-[0.8125rem] text-[#095866] font-medium border border-[#E9EBEC] rounded-[8px] hover:bg-[#f0fafb] transition-colors cursor-pointer">
							<Icon name="mdi:check-circle-outline" class="text-[16px]" />
							Imposta come predefinito
						</button>
					</div>
				</div>
			</template>

			<!-- ===== FORM MODIFICA INDIRIZZO ===== -->
			<template v-if="showEditForm && editedAddress">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Modifica indirizzo</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[600px] mx-auto">
					<form @submit.prevent="editAddress">
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome / Riferimento *</label>
							<input type="text" v-model="editedAddress.name" placeholder="es. Casa, Ufficio, Mario Rossi" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
							<input type="text" v-model="editedAddress.address" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="grid grid-cols-2 gap-[12px] mb-[16px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Citta *</label>
								<input type="text" v-model="editedAddress.city" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
								<input
									type="text"
									v-model="editedAddress.postal_code"
									placeholder="00100"
									maxlength="5"
									inputmode="numeric"
									pattern="[0-9]{5}"
									@input="editedAddress.postal_code = editedAddress.postal_code.replace(/[^0-9]/g, '')"
									class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none"
									required />
							</div>
						</div>
						<div class="mb-[24px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia *</label>
							<select v-model="editedAddress.province_name" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer" required>
								<option disabled :value="editedAddress.province_name">{{ editedAddress.province_name }}</option>
								<option v-for="(province, index) in filteredProvinces(editedAddress)" :key="index" :value="province">{{ province }}</option>
							</select>
						</div>

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">{{ messageLoading }}</p>
						<p v-if="messageError" class="text-center text-[0.875rem] text-red-600 font-medium mb-[16px] bg-red-50 p-[10px] rounded-[8px] border border-red-200">{{ messageError }}</p>

						<div class="flex gap-[12px]">
							<button type="button" @click.prevent="cancelEdit" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								<Icon name="mdi:close" class="text-[18px]" />
								Annulla
							</button>
							<button type="submit" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<Icon name="mdi:content-save" class="text-[18px]" />
								{{ messageLoading ? 'Salvataggio...' : 'Salva modifiche' }}
							</button>
						</div>
					</form>
				</div>
			</template>

			<!-- ===== FORM CREA INDIRIZZO ===== -->
			<template v-if="showCreateForm">
				<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Aggiungi indirizzo</h1>

				<div class="bg-white rounded-[16px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[600px] mx-auto">
					<form @submit.prevent="createAddress">
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome / Riferimento *</label>
							<input type="text" v-model="newAddress.name" placeholder="es. Casa, Ufficio, Mario Rossi" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo *</label>
							<input type="text" v-model="newAddress.address" placeholder="Via Roma 10" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
						</div>
						<div class="grid grid-cols-2 gap-[12px] mb-[16px]">
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Citta *</label>
								<input type="text" v-model="newAddress.city" placeholder="Roma" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none" required />
							</div>
							<div>
								<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP *</label>
								<input
									type="text"
									v-model="newAddress.postal_code"
									placeholder="00100"
									maxlength="5"
									inputmode="numeric"
									pattern="[0-9]{5}"
									@input="newAddress.postal_code = newAddress.postal_code.replace(/[^0-9]/g, '')"
									class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none"
									required />
							</div>
						</div>
						<div class="mb-[16px]">
							<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia *</label>
							<select v-model="newAddress.province_name" class="w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer" required>
								<option disabled value="">Scegli la provincia</option>
								<option v-for="(province, index) in provinceList" :key="index" :value="province">{{ province }}</option>
							</select>
						</div>

						<label class="flex items-center gap-[8px] cursor-pointer mb-[24px]">
							<input type="checkbox" v-model="newAddress.default" :true-value="1" :false-value="0" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
							<span class="text-[0.8125rem] text-[#737373]">Usa come indirizzo predefinito</span>
						</label>

						<p v-if="messageLoading" class="text-center text-[0.875rem] text-[#095866] font-medium mb-[16px]">{{ messageLoading }}</p>
						<p v-if="messageError" class="text-center text-[0.875rem] text-red-600 font-medium mb-[16px] bg-red-50 p-[10px] rounded-[8px] border border-red-200">{{ messageError }}</p>

						<div class="flex gap-[12px]">
							<button type="button" @click.prevent="cancelAdd" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer">
								<Icon name="mdi:close" class="text-[18px]" />
								Annulla
							</button>
							<button type="submit" :disabled="!!messageLoading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
								<Icon name="mdi:plus" class="text-[18px]" />
								{{ messageLoading ? 'Aggiunta...' : 'Aggiungi indirizzo' }}
							</button>
						</div>
					</form>
				</div>
			</template>
		</div>
	</section>
</template>
