<!--
  FILE: pages/account/amministrazione/test-brt.vue
  SCOPO: Pannello admin — pagina di test per le API BRT.
         Permette di testare la creazione spedizioni e la ricerca punti PUDO
         senza creare ordini reali.
  API: POST /api/admin/brt/test-create — test creazione spedizione BRT,
       POST /api/admin/brt/test-pudo — test ricerca punti PUDO.
  ROUTE: /account/amministrazione/test-brt (middleware sanctum:auth + admin).

  VINCOLI: solo ambiente di test/staging, non usare in produzione con dati reali.

  COLLEGAMENTI:
    - services/BrtService.php (backend) → servizio BRT SOAP/REST.
    - pages/account/amministrazione/spedizioni.vue → spedizioni reali.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();

const brtTestLoading = ref(false);
const brtTestResult = ref(null);
const brtTestForm = ref({
	consignee_name: 'Mario Rossi',
	consignee_address: 'Via Roma 1',
	consignee_city: 'Milano',
	consignee_zip: '20121',
	consignee_province: 'MI',
	consignee_country: 'IT',
	consignee_email: 'test@test.com',
	consignee_phone: '3331234567',
	weight_kg: 2,
	parcels: 1,
	notes: 'Test SpediamoFacile',
});

const brtTestPudoLoading = ref(false);
const brtTestPudoResult = ref(null);
const brtTestPudoForm = ref({
	city: 'Milano',
	zip_code: '20121',
	country: 'ITA',
});

const runBrtTest = async () => {
	brtTestLoading.value = true;
	brtTestResult.value = null;
	try {
		await sanctum("/sanctum/csrf-cookie");
		const res = await sanctum("/api/admin/brt/test-create", {
			method: "POST",
			body: brtTestForm.value,
		});
		brtTestResult.value = { success: true, data: res };
	} catch (e) {
		brtTestResult.value = { success: false, data: e?.data || e?.response?._data || { error: e.message } };
	} finally {
		brtTestLoading.value = false;
	}
};

const runBrtPudoTest = async () => {
	brtTestPudoLoading.value = true;
	brtTestPudoResult.value = null;
	try {
		const res = await sanctum(`/api/brt/pudo/search?city=${encodeURIComponent(brtTestPudoForm.value.city)}&zip_code=${encodeURIComponent(brtTestPudoForm.value.zip_code)}&country=${encodeURIComponent(brtTestPudoForm.value.country)}&max_results=5`);
		brtTestPudoResult.value = { success: true, data: res };
	} catch (e) {
		brtTestPudoResult.value = { success: false, data: e?.data || e?.response?._data || { error: e.message } };
	} finally {
		brtTestPudoLoading.value = false;
	}
};

const downloadTestLabel = (base64) => {
	const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'etichetta-test-brt.pdf';
	a.click();
	URL.revokeObjectURL(url);
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Test BRT</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Test BRT</h1>

			<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[24px]">

				<!-- TEST CREAZIONE SPEDIZIONE -->
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z"/></svg> Test Creazione Spedizione
					</h2>
					<p class="text-[0.75rem] text-[#737373] mb-[20px]">Invia una richiesta di test all'API BRT per creare una spedizione. Riceverai la risposta completa e l'etichetta PDF.</p>

					<div class="space-y-[12px]">
						<div class="grid grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Nome destinatario</label>
								<input v-model="brtTestForm.consignee_name" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Indirizzo</label>
								<input v-model="brtTestForm.consignee_address" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="grid grid-cols-3 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Citta</label>
								<input v-model="brtTestForm.consignee_city" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">CAP</label>
								<input v-model="brtTestForm.consignee_zip" type="text" maxlength="5" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Provincia</label>
								<input v-model="brtTestForm.consignee_province" type="text" maxlength="2" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="grid grid-cols-3 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Paese (ISO)</label>
								<input v-model="brtTestForm.consignee_country" type="text" maxlength="2" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Peso (Kg)</label>
								<input v-model="brtTestForm.weight_kg" type="number" min="1" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">N. Colli</label>
								<input v-model="brtTestForm.parcels" type="number" min="1" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div class="grid grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Email</label>
								<input v-model="brtTestForm.consignee_email" type="email" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Telefono</label>
								<input v-model="brtTestForm.consignee_phone" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
						</div>
						<div>
							<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Note</label>
							<input v-model="brtTestForm.notes" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
						</div>
					</div>

					<button @click="runBrtTest" :disabled="brtTestLoading" class="mt-[20px] w-full px-[20px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-[8px]">
						<svg v-if="brtTestLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>
						{{ brtTestLoading ? "Invio in corso..." : "Invia Test Spedizione" }}
					</button>

					<!-- RISULTATO TEST -->
					<div v-if="brtTestResult" class="mt-[16px]">
						<div :class="['rounded-[50px] p-[16px] border', brtTestResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200']">
							<div class="flex items-center gap-[8px] mb-[10px]">
								<template v-if="brtTestResult.success"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-emerald-600" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
								<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-red-600" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
								<span :class="['font-bold text-[0.875rem]', brtTestResult.success ? 'text-emerald-800' : 'text-red-800']">
									{{ brtTestResult.success ? 'Spedizione creata con successo!' : 'Errore BRT' }}
								</span>
							</div>
							<div v-if="brtTestResult.success && brtTestResult.data?.label_base64" class="mb-[10px]">
								<button @click="downloadTestLabel(brtTestResult.data.label_base64)" class="px-[14px] py-[8px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-[0.8125rem] font-medium cursor-pointer transition-colors inline-flex items-center gap-[6px]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/></svg> Scarica Etichetta PDF
								</button>
							</div>
							<details class="mt-[8px]">
								<summary class="text-[0.75rem] font-medium cursor-pointer text-[#404040]">Risposta completa API</summary>
								<pre class="mt-[8px] p-[12px] bg-[#1a1a2e] text-[#e0e0e0] rounded-[8px] text-[0.6875rem] overflow-x-auto max-h-[400px] overflow-y-auto font-mono">{{ JSON.stringify(brtTestResult.data, null, 2) }}</pre>
							</details>
						</div>
					</div>
				</div>

				<!-- TEST PUDO -->
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[6px] flex items-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/></svg> Test Ricerca PUDO
					</h2>
					<p class="text-[0.75rem] text-[#737373] mb-[20px]">Cerca punti di ritiro/consegna BRT vicini a un indirizzo.</p>

					<div class="space-y-[12px]">
						<div>
							<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Citta</label>
							<input v-model="brtTestPudoForm.city" type="text" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div class="grid grid-cols-2 gap-[12px]">
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">CAP</label>
								<input v-model="brtTestPudoForm.zip_code" type="text" maxlength="5" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" />
							</div>
							<div>
								<label class="block text-[0.75rem] font-medium text-[#404040] mb-[4px]">Paese (ISO alpha-3)</label>
								<input v-model="brtTestPudoForm.country" type="text" maxlength="3" class="w-full px-[12px] py-[8px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[8px] text-[0.8125rem] focus:border-[#095866] focus:outline-none" placeholder="ITA" />
							</div>
						</div>
					</div>

					<button @click="runBrtPudoTest" :disabled="brtTestPudoLoading" class="mt-[20px] w-full px-[20px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-[8px]">
						<svg v-if="brtTestPudoLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
						{{ brtTestPudoLoading ? "Ricerca in corso..." : "Cerca PUDO" }}
					</button>

					<div v-if="brtTestPudoResult" class="mt-[16px]">
						<div :class="['rounded-[50px] p-[16px] border', brtTestPudoResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200']">
							<div class="flex items-center gap-[8px] mb-[10px]">
								<template v-if="brtTestPudoResult.success"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-emerald-600" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
								<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-red-600" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
								<span :class="['font-bold text-[0.875rem]', brtTestPudoResult.success ? 'text-emerald-800' : 'text-red-800']">
									{{ brtTestPudoResult.success ? `${brtTestPudoResult.data?.pudo?.length || 0} PUDO trovati` : 'Errore PUDO' }}
								</span>
							</div>
							<!-- Lista PUDO trovati -->
							<div v-if="brtTestPudoResult.success && brtTestPudoResult.data?.pudo?.length" class="space-y-[8px] mb-[12px]">
								<div v-for="(p, i) in brtTestPudoResult.data.pudo" :key="i" class="bg-white rounded-[8px] p-[10px] border border-[#E9EBEC] text-[0.8125rem]">
									<p class="font-semibold text-[#252B42]">{{ p.name || p.pudo_id }}</p>
									<p class="text-[#737373] text-[0.75rem]">{{ p.address }} - {{ p.city }} {{ p.zip_code }}</p>
									<p v-if="p.distance_meters" class="text-[0.6875rem] text-[#095866]">{{ Math.round(p.distance_meters) }}m di distanza</p>
								</div>
							</div>
							<details>
								<summary class="text-[0.75rem] font-medium cursor-pointer text-[#404040]">Risposta completa API</summary>
								<pre class="mt-[8px] p-[12px] bg-[#1a1a2e] text-[#e0e0e0] rounded-[8px] text-[0.6875rem] overflow-x-auto max-h-[400px] overflow-y-auto font-mono">{{ JSON.stringify(brtTestPudoResult.data, null, 2) }}</pre>
							</details>
						</div>
					</div>

					<!-- INFO CREDENZIALI -->
					<div class="mt-[24px] rounded-[50px] p-[16px] bg-[#F8F9FB] border border-[#E9EBEC]">
						<h3 class="text-[0.8125rem] font-bold text-[#252B42] mb-[8px] flex items-center gap-[6px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] text-[#095866]" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg> Credenziali BRT configurate
						</h3>
						<div class="text-[0.75rem] text-[#737373] space-y-[4px]">
							<p><span class="font-medium text-[#404040]">API URL:</span> <code class="bg-[#E9EBEC] px-[6px] py-[2px] rounded text-[0.6875rem]">api.brt.it/rest/v1/shipments</code></p>
							<p><span class="font-medium text-[#404040]">Client ID:</span> Configurato nel file <code class="bg-[#E9EBEC] px-[6px] py-[2px] rounded text-[0.6875rem]">.env</code> (BRT_CLIENT_ID)</p>
							<p><span class="font-medium text-[#404040]">PUDO URL:</span> <code class="bg-[#E9EBEC] px-[6px] py-[2px] rounded text-[0.6875rem]">api.brt.it</code></p>
							<p class="mt-[8px] text-[0.6875rem]">Le credenziali si configurano nel file <code class="bg-[#E9EBEC] px-[6px] py-[2px] rounded text-[0.6875rem]">laravel-spedizionefacile-main/.env</code></p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
