<!--
  FILE: pages/account/amministrazione/messaggi.vue
  SCOPO: Pannello admin — messaggi ricevuti dal form contatti del sito.
         Visualizzazione lista con dettaglio espandibile.
  API: GET /api/admin/contact-messages — lista messaggi,
       DELETE /api/admin/contact-messages/{id} — elimina messaggio.
  ROUTE: /account/amministrazione/messaggi (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/contatti.vue → form pubblico che genera i messaggi.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, showError, formatDate } = useAdmin();

const contactMessages = ref([]);

const fetchContactMessages = async () => {
	try {
		const res = await sanctum("/api/admin/contact-messages");
		contactMessages.value = res?.data || res || [];
	} catch (e) { contactMessages.value = []; }
};

const markMessageRead = async (id) => {
	actionLoading.value = `msg-${id}`;
	try {
		await sanctum(`/api/admin/contact-messages/${id}/read`, { method: "PATCH" });
		await fetchContactMessages();
	} catch (e) { showError(e, "Errore."); }
	finally { actionLoading.value = null; }
};

const selectedMessage = ref(null);
const showMessageDetail = async (msg) => {
	selectedMessage.value = msg;
	if (!msg.read_at) await markMessageRead(msg.id);
};
const closeMessageDetail = () => { selectedMessage.value = null; };

onMounted(() => { fetchContactMessages(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Messaggi</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Messaggi</h1>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Messaggi di contatto</h2>
				<div v-if="!contactMessages?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
					<p>Nessun messaggio ricevuto.</p>
				</div>
				<div v-else class="space-y-[8px]">
					<div v-for="msg in contactMessages" :key="msg.id" @click="showMessageDetail(msg)" :class="['p-[16px] rounded-[14px] border cursor-pointer transition-colors', msg.read_at ? 'border-[#E9EBEC] hover:border-[#D0D0D0]' : 'border-blue-200 bg-blue-50/30 hover:border-blue-300']">
						<div class="flex items-start justify-between gap-[12px]">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-[8px] mb-[4px]">
									<span class="text-[0.875rem] font-semibold text-[#252B42]">{{ msg.name }} {{ msg.surname }}</span>
									<span v-if="!msg.read_at" class="w-[8px] h-[8px] rounded-full bg-blue-500 shrink-0"></span>
								</div>
								<p class="text-[0.8125rem] text-[#737373]">{{ msg.email }}</p>
								<p class="text-[0.8125rem] text-[#404040] mt-[4px] line-clamp-2">{{ msg.message }}</p>
							</div>
							<span class="text-[0.75rem] text-[#737373] whitespace-nowrap">{{ formatDate(msg.created_at) }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Message detail modal -->
			<div v-if="selectedMessage" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-[20px]" @click.self="closeMessageDetail">
				<div class="bg-white rounded-[20px] p-[28px] shadow-2xl max-w-[600px] w-full max-h-[80vh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[24px]">
						<h3 class="text-[1.125rem] font-bold text-[#252B42]">Messaggio</h3>
						<button @click="closeMessageDetail" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
						</button>
					</div>
					<div class="space-y-[12px] mb-[20px]">
						<div><p class="text-[0.75rem] text-[#737373]">Da</p><p class="text-[0.875rem] font-medium text-[#252B42]">{{ selectedMessage.name }} {{ selectedMessage.surname }}</p></div>
						<div><p class="text-[0.75rem] text-[#737373]">Email</p><p class="text-[0.875rem] text-[#404040]">{{ selectedMessage.email }}</p></div>
						<div v-if="selectedMessage.telephone_number"><p class="text-[0.75rem] text-[#737373]">Telefono</p><p class="text-[0.875rem] text-[#404040]">{{ selectedMessage.telephone_number }}</p></div>
						<div v-if="selectedMessage.address"><p class="text-[0.75rem] text-[#737373]">Indirizzo</p><p class="text-[0.875rem] text-[#404040]">{{ selectedMessage.address }}</p></div>
						<div><p class="text-[0.75rem] text-[#737373]">Data</p><p class="text-[0.875rem] text-[#404040]">{{ formatDate(selectedMessage.created_at) }}</p></div>
					</div>
					<div class="bg-[#F8F9FB] rounded-[12px] p-[16px]">
						<p class="text-[0.875rem] text-[#252B42] whitespace-pre-wrap">{{ selectedMessage.message }}</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
