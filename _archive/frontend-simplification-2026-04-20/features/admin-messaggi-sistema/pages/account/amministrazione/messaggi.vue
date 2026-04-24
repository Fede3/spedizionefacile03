<!-- FILE: pages/account/amministrazione/messaggi.vue -->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Messaggi admin | SpediamoFacile',
	ogTitle: 'Messaggi admin | SpediamoFacile',
	description: 'Consulta e gestisci messaggi e richieste di contatto dal pannello admin SpediamoFacile.',
	ogDescription: 'Inbox amministrazione per messaggi e richieste utenti su SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { actionLoading, showError, formatDate } = useAdmin();

const contactMessages = ref([]);
const messageSearch = ref('');
const messageStatusFilter = ref('all');
const visibleMessagesCount = computed(() => filteredMessages.value.length);
const readMessagesCount = computed(() => Math.max(0, contactMessages.value.length - unreadMessagesCount.value));
const filteredMessages = computed(() => {
	const search = messageSearch.value.trim().toLowerCase();
	return (contactMessages.value || []).filter((msg) => {
		const matchesStatus =
			messageStatusFilter.value === 'all' ||
			(messageStatusFilter.value === 'read' && !!msg.read_at) ||
			(messageStatusFilter.value === 'unread' && !msg.read_at);
		const matchesSearch =
			!search ||
			[msg.name, msg.surname, msg.email, msg.subject, msg.message]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(search));
		return matchesStatus && matchesSearch;
	});
});
const hasFilteredMessages = computed(() => filteredMessages.value.length > 0);

const unreadMessagesCount = computed(() => (contactMessages.value || []).filter((msg) => !msg.read_at).length);

const fetchContactMessages = async () => {
	try {
		const res = await sanctum('/api/admin/contact-messages');
		contactMessages.value = res?.data || res || [];
	} catch (e) {
		contactMessages.value = [];
	}
};

const markMessageRead = async (id) => {
	actionLoading.value = `msg-${id}`;
	try {
		await sanctum(`/api/admin/contact-messages/${id}/read`, { method: 'PATCH' });
		await fetchContactMessages();
	} catch (e) {
		showError(e, 'Errore.');
	} finally {
		actionLoading.value = null;
	}
};

const selectedMessage = ref(null);
const showMessageDetail = async (msg) => {
	selectedMessage.value = msg;
	if (!msg.read_at) await markMessageRead(msg.id);
};
const closeMessageDetail = () => {
	selectedMessage.value = null;
};

onMounted(() => {
	fetchContactMessages();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Messaggi"
				description="Inbox contatti ordinata, con lista leggibile e dettaglio stabile."
				back-to="/account/amministrazione"
				back-label="Torna al pannello admin"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione' }, { label: 'Messaggi' }]" />

			<div class="admin-messaggi-toolbar">
				<div class="admin-messaggi-toolbar__top">
					<div class="admin-messaggi-toolbar__copy">
						<h2 class="admin-messaggi-toolbar__title">Inbox contatti</h2>
						<p class="admin-messaggi-toolbar__text">Apri la conversazione a sinistra e leggi il contenuto senza uscire dalla vista.</p>
					</div>
					<div class="admin-messaggi-toolbar__actions">
						<span class="admin-messaggi-toolbar__pill">{{ visibleMessagesCount }} visibili</span>
						<span v-if="unreadMessagesCount" class="admin-messaggi-toolbar__pill admin-messaggi-toolbar__pill--accent">{{ unreadMessagesCount }} non letti</span>
						<span class="admin-messaggi-toolbar__pill admin-messaggi-toolbar__pill--muted">
							{{ messageStatusFilter === 'all' ? 'Tutti' : messageStatusFilter === 'read' ? 'Letti' : 'Non letti' }}
						</span>
					</div>
				</div>

				<div class="admin-messaggi-toolbar__filters">
					<div class="relative">
						<svg aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="absolute left-[14px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--color-brand-text-secondary)]"
							fill="currentColor">
							<path
								d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
						</svg>
						<input
							v-model="messageSearch"
							type="text"
							placeholder="Cerca nome, email o oggetto..."
							class="admin-messaggi-toolbar__input" />
					</div>
					<select
						v-model="messageStatusFilter"
						class="admin-messaggi-toolbar__select cursor-pointer">
						<option value="all">Tutti i messaggi</option>
						<option value="unread">Non letti</option>
						<option value="read">Letti</option>
					</select>
				</div>
			</div>

				<div class="admin-messaggi-grid mt-[18px] desktop:mt-[22px]" :class="{ 'admin-messaggi-grid--single': !hasFilteredMessages }">
					<div class="admin-messaggi-list-card">
					<div class="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[10px] mb-[12px]">
						<div>
						<h2 class="text-[15px] font-bold text-[#1d2738] font-['Montserrat',sans-serif]">Conversazioni</h2>
						<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] mt-[3px]">Apri un messaggio per leggerlo senza perdere il contesto della lista.</p>
					</div>
					<span class="admin-messaggi-toolbar__pill admin-messaggi-toolbar__pill--muted">{{ visibleMessagesCount }} visibili</span>
				</div>
					<div v-if="!filteredMessages?.length" class="admin-messaggi-empty">
						<div class="w-[60px] h-[60px] mx-auto mb-[14px] bg-[#F5F6F9] rounded-full flex items-center justify-center">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0">
								<path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
							</svg>
						</div>
						<h2 class="text-[16px] font-bold text-[#1d2738] font-['Montserrat',sans-serif] mb-[8px]">Nessun messaggio ricevuto</h2>
							<p class="text-[#5A6474] text-[14px] max-w-[420px] mx-auto">I messaggi dal form contatti appariranno qui. Quando arrivano, restano tutti nella stessa lista senza aprire pannelli vuoti o superfici inutili.</p>
						</div>
						<div v-else class="grid grid-cols-1 gap-[8px]">
						<div
							v-for="msg in filteredMessages"
							:key="msg.id"
							@click="showMessageDetail(msg)"
							:class="[
								'rounded-[16px] cursor-pointer transition-all duration-200 ring-[1px] p-[13px] tablet:p-[14px]',
								selectedMessage?.id === msg.id
									? 'bg-[#eef7f8] ring-[rgba(9,88,102,0.22)] shadow-[0_8px_24px_rgba(9,88,102,0.12)]'
									: msg.read_at
										? 'bg-white ring-[rgba(220,225,232,0.9)] shadow-[0_1px_4px_rgba(9,88,102,0.06)] hover:shadow-[0_8px_20px_rgba(9,88,102,0.10)] hover:ring-[rgba(9,88,102,0.14)]'
										: 'bg-[#f5fbfc] ring-[rgba(9,88,102,0.16)] shadow-[0_2px_8px_rgba(9,88,102,0.10)] hover:shadow-[0_10px_24px_rgba(9,88,102,0.14)]',
							]">
							<div class="flex items-start justify-between gap-[12px]">
								<div class="min-w-0 flex items-start gap-[12px] flex-1">
									<div class="w-[40px] h-[40px] rounded-[14px] bg-[#eef7f8] text-[var(--color-brand-primary)] flex items-center justify-center shrink-0 ring-[1px] ring-[rgba(9,88,102,0.08)]">
										<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
											<path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
										</svg>
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex flex-wrap items-center gap-[8px] mb-[4px]">
											<span class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)] truncate">{{ msg.name }} {{ msg.surname }}</span>
											<span v-if="!msg.read_at" class="inline-flex items-center gap-[6px] rounded-full px-[8px] py-[3px] bg-[rgba(9,88,102,0.08)] text-[11px] font-bold text-[var(--color-brand-primary)]">
												<span class="w-[6px] h-[6px] rounded-full bg-[var(--color-brand-primary)] block"></span>
												Nuovo
											</span>
										</div>
										<p v-if="msg.subject" class="text-[0.875rem] font-semibold text-[var(--color-brand-text)] truncate">{{ msg.subject }}</p>
										<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] truncate mt-[2px]">{{ msg.email }}</p>
										<p class="text-[0.875rem] text-[var(--color-brand-text)] mt-[8px] line-clamp-2 leading-[1.5]">{{ msg.message }}</p>
									</div>
								</div>
								<div class="text-right shrink-0 flex flex-col items-end gap-[5px]">
									<span class="text-[12px] font-medium text-[#8892A3] whitespace-nowrap">{{ formatDate(msg.created_at) }}</span>
										<span class="inline-flex items-center text-[var(--color-brand-primary)]" aria-hidden="true">
											<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg>
										</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-if="hasFilteredMessages" class="hidden desktop:block admin-messaggi-detail-card sticky top-[112px]">
					<div v-if="selectedMessage" class="space-y-[16px]">
						<div class="flex items-start justify-between gap-[12px]">
							<div>
								<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Dettaglio messaggio</p>
								<h3 class="text-[18px] font-bold text-[#1d2738] font-['Montserrat',sans-serif] mt-[4px]">
									{{ selectedMessage.subject || 'Richiesta dal form contatti' }}
								</h3>
							</div>
							<button
								@click="closeMessageDetail"
								class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F1F4] hover:bg-[rgba(9,88,102,0.1)] cursor-pointer"
								aria-label="Chiudi messaggio">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-text)]" fill="currentColor">
									<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
								</svg>
							</button>
						</div>

						<div class="grid grid-cols-1 gap-[12px]">
							<div class="rounded-[16px] bg-[#F8F9FB] p-[14px] ring-[1px] ring-[rgba(220,225,232,0.9)]">
								<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Da</p>
								<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)] mt-[4px]">{{ selectedMessage.name }} {{ selectedMessage.surname }}</p>
								<p class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] mt-[3px]">{{ selectedMessage.email }}</p>
							</div>

							<div class="grid grid-cols-2 gap-[12px]">
								<div class="rounded-[16px] bg-[#F8F9FB] p-[14px] ring-[1px] ring-[rgba(220,225,232,0.9)]">
									<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Data</p>
									<p class="text-[0.875rem] text-[var(--color-brand-text)] mt-[4px]">{{ formatDate(selectedMessage.created_at) }}</p>
								</div>
								<div class="rounded-[16px] bg-[#F8F9FB] p-[14px] ring-[1px] ring-[rgba(220,225,232,0.9)]">
									<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Stato</p>
									<p class="text-[0.875rem] font-semibold mt-[4px]" :class="selectedMessage.read_at ? 'text-[#1d2738]' : 'text-[var(--color-brand-primary)]'">
										{{ selectedMessage.read_at ? 'Letto' : 'Non letto' }}
									</p>
								</div>
							</div>

							<div v-if="selectedMessage.telephone_number" class="rounded-[16px] bg-[#F8F9FB] p-[14px] ring-[1px] ring-[rgba(220,225,232,0.9)]">
								<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Telefono</p>
								<p class="text-[0.875rem] text-[var(--color-brand-text)] mt-[4px]">{{ selectedMessage.telephone_number }}</p>
							</div>

							<div v-if="selectedMessage.address" class="rounded-[16px] bg-[#F8F9FB] p-[14px] ring-[1px] ring-[rgba(220,225,232,0.9)]">
								<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Indirizzo</p>
								<p class="text-[0.875rem] text-[var(--color-brand-text)] mt-[4px]">{{ selectedMessage.address }}</p>
							</div>

							<div class="rounded-[16px] bg-white p-[16px] ring-[1px] ring-[rgba(220,225,232,0.9)] shadow-[0_1px_4px_rgba(9,88,102,0.04)]">
								<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)] mb-[10px]">Messaggio</p>
								<p class="text-[0.9375rem] text-[var(--color-brand-text)] whitespace-pre-wrap leading-[1.65]">{{ selectedMessage.message }}</p>
							</div>
						</div>
					</div>

					<div v-else class="admin-messaggi-empty admin-messaggi-empty--detail">
						<div class="w-[54px] h-[54px] rounded-full bg-white text-[var(--color-brand-primary)] flex items-center justify-center shadow-[0_2px_12px_rgba(9,88,102,0.10)]">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[22px] h-[22px]" fill="currentColor">
								<path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
							</svg>
						</div>
						<h3 class="text-[15px] font-bold text-[#1d2738] font-['Montserrat',sans-serif] mt-[14px]">Seleziona un messaggio</h3>
						<p class="text-[14px] text-[var(--color-brand-text-secondary)] mt-[8px] max-w-[260px]">
							Apri una richiesta dalla inbox per leggere mittente, data e contenuto senza cambiare vista.
						</p>
					</div>
				</div>
			</div>

			<!-- Message detail modal -->
			<div
				v-if="selectedMessage"
				class="desktop:hidden fixed inset-0 bg-black/40 z-50 flex items-end tablet:items-center justify-center p-0 tablet:p-[20px]"
				@click.self="closeMessageDetail">
				<div
					class="bg-white rounded-t-[16px] tablet:rounded-[16px] p-[18px] shadow-2xl max-w-[600px] w-full max-h-[90dvh] overflow-y-auto">
					<div class="flex items-center justify-between mb-[16px]">
						<h3 class="text-[16px] font-bold text-[#1d2738] font-['Montserrat',sans-serif]">Messaggio</h3>
						<button
							@click="closeMessageDetail"
							class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#F0F1F4] hover:bg-[rgba(9,88,102,0.1)] cursor-pointer"
							aria-label="Chiudi messaggio">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-text)]" fill="currentColor">
								<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
							</svg>
						</button>
					</div>
					<div class="space-y-[12px] mb-[20px]">
						<div>
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Da</p>
							<p class="text-[0.875rem] font-medium text-[var(--color-brand-text)]">{{ selectedMessage.name }} {{ selectedMessage.surname }}</p>
						</div>
						<div>
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Email</p>
							<p class="text-[0.875rem] text-[var(--color-brand-text)]">{{ selectedMessage.email }}</p>
						</div>
						<div v-if="selectedMessage.subject">
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Oggetto</p>
							<p class="text-[0.875rem] text-[var(--color-brand-text)]">{{ selectedMessage.subject }}</p>
						</div>
						<div v-if="selectedMessage.telephone_number">
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Telefono</p>
							<p class="text-[0.875rem] text-[var(--color-brand-text)]">{{ selectedMessage.telephone_number }}</p>
						</div>
						<div v-if="selectedMessage.address">
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Indirizzo</p>
							<p class="text-[0.875rem] text-[var(--color-brand-text)]">{{ selectedMessage.address }}</p>
						</div>
						<div>
							<p class="text-[11px] uppercase tracking-[0.5px] font-semibold text-[var(--color-brand-text-muted)]">Data</p>
							<p class="text-[0.875rem] text-[var(--color-brand-text)]">{{ formatDate(selectedMessage.created_at) }}</p>
						</div>
					</div>
					<div class="bg-[#F5F6F9] rounded-[16px] p-[16px]">
						<p class="text-[0.875rem] text-[var(--color-brand-text)] whitespace-pre-wrap">{{ selectedMessage.message }}</p>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.admin-messaggi-toolbar,
.admin-messaggi-list-card,
.admin-messaggi-detail-card {
	background: #ffffff;
	border-radius: 16px;
	padding: 15px;
	box-shadow: 0 4px 20px rgba(20, 37, 48, 0.06), 0 1px 3px rgba(20, 37, 48, 0.04);
	overflow: hidden;
}

.admin-messaggi-toolbar__top {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding-bottom: 12px;
	border-bottom: 1px solid var(--surface-page-end, #eef1f3);
}

.admin-messaggi-toolbar__copy {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.admin-messaggi-toolbar__title {
	font-size: 16px;
	font-weight: 700;
	font-family: 'Montserrat', sans-serif;
	color: var(--color-brand-text, #1d2738);
}

.admin-messaggi-toolbar__text {
	font-size: 13px;
	line-height: 1.45;
	color: var(--color-brand-text-secondary, #5a6474);
}

.admin-messaggi-toolbar__actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.admin-messaggi-toolbar__pill {
	display: inline-flex;
	align-items: center;
	border-radius: 999px;
	background: var(--surface-neutral-50, #f0f3f5);
	padding: 5px 12px;
	font-size: 0.75rem;
	font-weight: 600;
	color: var(--color-brand-text-secondary, #5c6d7f);
}

.admin-messaggi-toolbar__pill--muted {
	background: rgba(9, 88, 102, 0.08);
	color: var(--color-brand-primary);
}

.admin-messaggi-toolbar__pill--accent {
	background: rgba(228, 66, 3, 0.08);
	color: var(--color-brand-accent);
}

.admin-messaggi-toolbar__filters {
	display: grid;
	grid-template-columns: 1fr;
	gap: 10px;
	margin-top: 12px;
}

.admin-messaggi-toolbar__input,
.admin-messaggi-toolbar__select {
	width: 100%;
	min-height: 50px;
	border-radius: 16px;
	border: 1.5px solid #d8e1e5;
	background: #ffffff;
	color: var(--color-brand-text, #1d2738);
	font-size: 0.9375rem;
	padding: 0 14px;
	transition: border-color 160ms ease, box-shadow 160ms ease;
}

.admin-messaggi-toolbar__input {
	padding-left: 42px;
}

.admin-messaggi-toolbar__input:focus,
.admin-messaggi-toolbar__select:focus {
	outline: none;
	border-color: rgba(9, 88, 102, 0.46);
	box-shadow: 0 0 0 4px rgba(9, 88, 102, 0.08);
}

.admin-messaggi-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
	align-items: start;
}

.admin-messaggi-grid--single {
	grid-template-columns: minmax(0, 1fr);
}

.admin-messaggi-empty {
	min-height: 320px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	border-radius: 16px;
	background: var(--surface-subtle, #fbfcfd);
	border: 1px solid rgba(220,225,232,0.9);
	padding: 20px;
}

.admin-messaggi-empty--detail {
	min-height: 320px;
}

@media (min-width: 768px) {
	.admin-messaggi-toolbar,
	.admin-messaggi-list-card,
	.admin-messaggi-detail-card {
		padding: 16px;
	}

	.admin-messaggi-toolbar__top {
		flex-direction: row;
		align-items: end;
		justify-content: space-between;
	}

	.admin-messaggi-toolbar__filters {
		grid-template-columns: minmax(0, 1fr) 220px;
	}
}

@media (min-width: 1024px) {
	.admin-messaggi-toolbar,
	.admin-messaggi-list-card,
	.admin-messaggi-detail-card {
		padding: 18px;
	}

	.admin-messaggi-grid {
		grid-template-columns: minmax(340px, 0.94fr) minmax(320px, 0.86fr);
		gap: 14px;
	}

	.admin-messaggi-grid--single {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
