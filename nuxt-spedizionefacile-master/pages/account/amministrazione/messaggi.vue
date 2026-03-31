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
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, showError, formatDate } = useAdmin();

const contactMessages = ref([]);
const messageSearch = ref('');
const messageStatusFilter = ref('all');

const filteredMessages = computed(() => {
	const search = messageSearch.value.trim().toLowerCase();
	return (contactMessages.value || []).filter((msg) => {
		const matchesStatus =
			messageStatusFilter.value === 'all'
			|| (messageStatusFilter.value === 'read' && !!msg.read_at)
			|| (messageStatusFilter.value === 'unread' && !msg.read_at);
		const matchesSearch = !search || [msg.name, msg.surname, msg.email, msg.subject, msg.message]
			.filter(Boolean)
			.some((value) => String(value).toLowerCase().includes(search));
		return matchesStatus && matchesSearch;
	});
});

const unreadMessagesCount = computed(() => (contactMessages.value || []).filter((msg) => !msg.read_at).length);

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
			<AccountPageHeader
				title="Messaggi"
				description="Messaggi dal form contatti."
				back-to="/account/amministrazione"
				back-label="Torna al pannello admin"
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Messaggi' },
				]"
			/>

			<div class="mb-[16px] grid grid-cols-1 tablet:grid-cols-[minmax(0,1fr)_220px] gap-[10px]">
				<div class="relative">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
					<input
						v-model="messageSearch"
						type="text"
						placeholder="Cerca nome, email o oggetto..."
						class="w-full h-[44px] pl-[42px] pr-[14px] rounded-[14px] border border-[#E9EBEC] bg-white text-[0.875rem] text-[#252B42] focus:border-[#095866] focus:outline-none" />
				</div>
				<select
					v-model="messageStatusFilter"
					class="w-full h-[44px] px-[14px] rounded-[14px] border border-[#E9EBEC] bg-white text-[0.875rem] text-[#252B42] focus:border-[#095866] focus:outline-none">
					<option value="all">Tutti i messaggi</option>
					<option value="unread">Non letti</option>
					<option value="read">Letti</option>
				</select>
			</div>

			<div class="mb-[16px] grid grid-cols-2 tablet:grid-cols-4 gap-[10px]">
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Totale</p>
					<p class="text-[1.25rem] font-bold text-[#252B42] mt-[4px]">{{ contactMessages.length }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Non letti</p>
					<p class="text-[1.25rem] font-bold text-[#095866] mt-[4px]">{{ unreadMessagesCount }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Visibili</p>
					<p class="text-[1.25rem] font-bold text-[#252B42] mt-[4px]">{{ filteredMessages.length }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[14px] border border-[#E9EBEC] shadow-sm">
					<p class="text-[0.6875rem] uppercase tracking-[0.5px] text-[#737373] font-medium">Letti</p>
					<p class="text-[1.25rem] font-bold text-emerald-600 mt-[4px]">{{ Math.max(0, contactMessages.length - unreadMessagesCount) }}</p>
				</div>
			</div>

			<div class="bg-white rounded-[20px] p-[20px] tablet:p-[24px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
				<div class="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[10px] mb-[18px]">
					<h2 class="text-[1.125rem] font-bold text-[#252B42]">Messaggi</h2>
					<p class="text-[0.8125rem] text-[#737373]">{{ filteredMessages.length }} visibili</p>
				</div>
				<div v-if="!filteredMessages?.length" class="text-center py-[40px]">
					<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0"><path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
					</div>
					<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[8px]">Nessun messaggio ricevuto</h2>
					<p class="text-[#737373] text-[0.875rem]">I messaggi dal form contatti appariranno qui.</p>
				</div>
				<div v-else class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-1 gap-[10px]">
					<div v-for="msg in filteredMessages" :key="msg.id" @click="showMessageDetail(msg)" :class="['p-[14px] rounded-[14px] border cursor-pointer transition-colors', msg.read_at ? 'border-[#E9EBEC] hover:border-[#D7E1E4]' : 'border-blue-200 bg-blue-50/30 hover:border-blue-300']">
						<div class="flex items-start justify-between gap-[10px]">
							<div class="flex-1 min-w-0">
								<div class="flex flex-wrap items-center gap-[8px] mb-[4px]">
									<span class="text-[0.875rem] font-semibold text-[#252B42] truncate">{{ msg.name }} {{ msg.surname }}</span>
									<span v-if="!msg.read_at" class="w-[8px] h-[8px] rounded-full bg-blue-500 shrink-0"></span>
								</div>
								<p v-if="msg.subject" class="text-[0.8125rem] font-medium text-[#404040]">{{ msg.subject }}</p>
								<p class="text-[0.8125rem] text-[#737373]">{{ msg.email }}</p>
								<p class="text-[0.8125rem] text-[#404040] mt-[4px] line-clamp-2">{{ msg.message }}</p>
							</div>
							<span class="text-[0.75rem] text-[#737373] whitespace-nowrap shrink-0">{{ formatDate(msg.created_at) }}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Message detail modal -->
			<div v-if="selectedMessage" class="fixed inset-0 bg-black/40 z-50 flex items-end tablet:items-center justify-center p-0 tablet:p-[20px]" @click.self="closeMessageDetail">
				<div class="bg-white rounded-t-[20px] tablet:rounded-[20px] p-[20px] tablet:p-[28px] shadow-2xl max-w-[600px] w-full max-h-[90dvh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[24px]">
						<h3 class="text-[1.125rem] font-bold text-[#252B42]">Messaggio</h3>
						<button @click="closeMessageDetail" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F0F0] hover:bg-[#E0E0E0] cursor-pointer">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
						</button>
					</div>
					<div class="space-y-[12px] mb-[20px]">
						<div><p class="text-[0.75rem] text-[#737373]">Da</p><p class="text-[0.875rem] font-medium text-[#252B42]">{{ selectedMessage.name }} {{ selectedMessage.surname }}</p></div>
						<div><p class="text-[0.75rem] text-[#737373]">Email</p><p class="text-[0.875rem] text-[#404040]">{{ selectedMessage.email }}</p></div>
						<div v-if="selectedMessage.subject"><p class="text-[0.75rem] text-[#737373]">Oggetto</p><p class="text-[0.875rem] text-[#404040]">{{ selectedMessage.subject }}</p></div>
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
