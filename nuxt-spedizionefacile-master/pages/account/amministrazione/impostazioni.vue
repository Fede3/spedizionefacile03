<!--
  FILE: pages/account/amministrazione/impostazioni.vue
  SCOPO: Pannello admin — impostazioni generali del sito.
         Configurazione Stripe (chiavi API), BRT (credenziali), parametri generali.
  API: GET /api/admin/settings — leggi impostazioni,
       POST /api/admin/settings — salva impostazioni.
  ROUTE: /account/amministrazione/impostazioni (middleware sanctum:auth + admin).

  VINCOLI: le chiavi API sono sensibili, gestite lato server.

  COLLEGAMENTI:
    - composables/useAdmin.js → utility condivise admin.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();
const runtimeConfig = useRuntimeConfig();

const settingsData = ref({});
const savingSettings = ref(false);
const stripeWebhookUrl = computed(() => `${String(runtimeConfig.public.apiBase || '').replace(/\/$/, '')}/stripe/webhook`);

const fetchSettings = async () => {
	try {
		const res = await sanctum("/api/admin/settings");
		settingsData.value = res?.data || res || {};
	} catch (e) { settingsData.value = {}; }
};

const saveSettings = async () => {
	savingSettings.value = true;
	try {
		await sanctum("/api/admin/settings", { method: "POST", body: settingsData.value });
		showSuccess("Impostazioni salvate con successo.");
	} catch (e) { showError(e, "Errore durante il salvataggio."); }
	finally { savingSettings.value = false; }
};

onMounted(() => { fetchSettings(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Impostazioni"
				description="Configurazione tecnica di Stripe, BRT e parametri generali in una shell piu' ordinata e meno dispersiva."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Impostazioni' },
				]"
			/>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<template v-if="actionMessage.type === 'success'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
				<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
				{{ actionMessage.text }}
			</div>

			<div class="mb-[16px] grid grid-cols-1 tablet:grid-cols-3 gap-[10px]">
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Stripe</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[4px]">Chiavi e webhook</p>
				</div>
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">BRT</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[4px]">Credenziali operatore</p>
				</div>
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Generali</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[4px]">Nome sito e supporto</p>
				</div>
			</div>

			<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[16px]">
				<div class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-purple-600" fill="currentColor"><path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg> Configurazione Stripe
					</h2>
					<div class="mb-[20px] rounded-[16px] border border-[#E9EBEC] bg-[#F8F9FB] px-[16px] py-[14px] text-[0.875rem] text-[#4b5563] leading-[1.6]">
						<p class="font-semibold text-[#252B42] mb-[4px]">Come funziona su questo sito</p>
						<p>
							Queste chiavi configurano l'account Stripe della piattaforma SpediamoFacile. I clienti non devono inserire chiavi: quando Stripe è attivo potranno aggiungere carte, pagare al checkout e ricaricare il wallet normalmente.
						</p>
						<p class="mt-[8px]">
							Per una configurazione completa servono: <span class="font-medium text-[#252B42]">Publishable Key</span>, <span class="font-medium text-[#252B42]">Secret Key</span> e <span class="font-medium text-[#252B42]">Webhook Secret</span>.
						</p>
						<p class="mt-[8px]">
							Webhook Stripe da impostare: <span class="font-mono text-[0.8125rem] text-[#252B42]">{{ stripeWebhookUrl }}</span>
						</p>
					</div>
					<div class="space-y-[14px] max-w-[600px]">
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Public Key</label>
							<input v-model="settingsData.stripe_public_key" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] font-mono focus:border-[#095866] focus:outline-none" placeholder="pk_..." />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Secret Key</label>
							<input v-model="settingsData.stripe_secret_key" type="password" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] font-mono focus:border-[#095866] focus:outline-none" placeholder="sk_..." />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Webhook Secret</label>
							<input v-model="settingsData.stripe_webhook_secret" type="password" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] font-mono focus:border-[#095866] focus:outline-none" placeholder="whsec_..." />
						</div>
					</div>
				</div>

				<div class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-indigo-600" fill="currentColor"><path d="M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z"/></svg> Configurazione BRT
					</h2>
					<div class="space-y-[14px] max-w-[600px]">
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Customer ID</label>
							<input v-model="settingsData.brt_customer_id" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Username</label>
							<input v-model="settingsData.brt_username" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Password</label>
							<input v-model="settingsData.brt_password" type="password" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
					</div>
				</div>

				<div class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] desktop:col-span-2">
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M16.36,14C16.44,13.34 16.5,12.68 16.5,12C16.5,11.32 16.44,10.66 16.36,10H19.74C19.9,10.64 20,11.31 20,12C20,12.69 19.9,13.36 19.74,14M14.59,19.56C15.19,18.45 15.65,17.25 15.97,16H18.92C17.96,17.65 16.43,18.93 14.59,19.56M14.34,14H9.66C9.56,13.34 9.5,12.68 9.5,12C9.5,11.32 9.56,10.65 9.66,10H14.34C14.43,10.65 14.5,11.32 14.5,12C14.5,12.68 14.43,13.34 14.34,14M12,19.96C11.17,18.76 10.5,17.43 10.09,16H13.91C13.5,17.43 12.83,18.76 12,19.96M8,8H5.08C6.03,6.34 7.57,5.06 9.4,4.44C8.8,5.55 8.35,6.75 8,8M5.08,16H8C8.35,17.25 8.8,18.45 9.4,19.56C7.57,18.93 6.03,17.65 5.08,16M4.26,14C4.1,13.36 4,12.69 4,12C4,11.31 4.1,10.64 4.26,10H7.64C7.56,10.66 7.5,11.32 7.5,12C7.5,12.68 7.56,13.34 7.64,14M12,4.03C12.83,5.23 13.5,6.57 13.91,8H10.09C10.5,6.57 11.17,5.23 12,4.03M18.92,8H15.97C15.65,6.75 15.19,5.55 14.59,4.44C16.43,5.07 17.96,6.34 18.92,8M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg> Impostazioni generali
					</h2>
					<div class="space-y-[14px] max-w-[600px]">
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Nome sito</label>
							<input v-model="settingsData.site_name" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Email supporto</label>
							<input v-model="settingsData.support_email" type="email" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Sovrapprezzo contrassegno (&euro;)</label>
							<input v-model="settingsData.cod_surcharge" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[16px] text-[0.875rem] focus:border-[#095866] focus:outline-none" placeholder="3.50" />
						</div>
					</div>
				</div>
			</div>

			<div class="mt-[16px] flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
				<p class="text-[0.8125rem] text-[#737373]">Salva solo quando hai completato Stripe, BRT e impostazioni generali.</p>
				<button @click="saveSettings" :disabled="savingSettings" class="w-full tablet:w-auto px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-[8px]">
					<svg v-if="savingSettings" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
					<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
					{{ savingSettings ? "Salvataggio..." : "Salva impostazioni" }}
				</button>
			</div>
		</div>
	</section>
</template>
