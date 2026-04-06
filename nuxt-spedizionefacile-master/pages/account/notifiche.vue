<!--
  FILE: pages/account/notifiche.vue
  SCOPO: Centro notifiche dell'account con lista in-app e preferenze referral.
  API: GET /api/notifications, GET /api/notifications/unread-count, GET /api/notifications/preferences,
       PATCH /api/notifications/{id}/read, PATCH /api/notifications/read-all, PUT /api/notifications/preferences.
  COMPONENTI: nessun componente custom; riusa AccountPageHeader e le classi shell account.
  ROUTE: /account/notifiche (middleware sanctum:auth).
-->
<script setup>
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'Notifiche account | SpediamoFacile',
	ogTitle: 'Notifiche account | SpediamoFacile',
	description: 'Gestisci notifiche in-app e preferenze referral dal tuo account SpediamoFacile.',
	ogDescription: 'Centro notifiche e consenso referral dell area account SpediamoFacile.',
});

const sanctum = useSanctumClient();

const notificationsQuery = useSanctumFetch('/api/notifications', { lazy: true });
const unreadCountQuery = useSanctumFetch('/api/notifications/unread-count', { lazy: true });
const preferencesQuery = useSanctumFetch('/api/notifications/preferences', { lazy: true });

const loadError = ref('');
const actionFeedback = ref('');
const actionFeedbackType = ref('success');
const activeAction = ref('');
const savingPreferences = ref(false);

const preferenceForm = reactive({
	referral_site_enabled: true,
	referral_email_enabled: false,
	referral_sms_enabled: false,
});

const notificationList = computed(() => {
	const source = notificationsQuery.data.value;
	if (Array.isArray(source)) return source;
	if (Array.isArray(source?.data)) return source.data;
	if (Array.isArray(source?.items)) return source.items;
	return [];
});

const totalNotifications = computed(() => {
	const source = notificationsQuery.data.value;
	return Number(source?.total ?? source?.meta?.total ?? notificationList.value.length ?? 0);
});

const localUnreadCount = computed(() => notificationList.value.filter((notification) => !notification.read_at).length);
const unreadCount = computed(() => {
	const source = unreadCountQuery.data.value;
	if (typeof source === 'number') return source;
	if (typeof source === 'string' && source.trim()) return Number(source);
	return Number(source?.unread_count ?? localUnreadCount.value ?? 0);
});

const preferencesData = computed(() => preferencesQuery.data.value?.data || preferencesQuery.data.value || null);
const referralPreferencesEnabled = computed(
	() => Number(preferenceForm.referral_site_enabled) + Number(preferenceForm.referral_email_enabled),
);
const alertType = computed(() => (loadError.value ? 'error' : actionFeedbackType.value));

const formatDate = (value) => {
	if (!value) return 'Data non disponibile';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return 'Data non disponibile';
	return new Intl.DateTimeFormat('it-IT', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(parsed);
};

const formatTypeLabel = (type) => {
	const labels = {
		referral: 'Referral',
		order: 'Ordine',
		wallet: 'Portafoglio',
		support: 'Supporto',
		system: 'Sistema',
	};
	return labels[String(type || '').toLowerCase()] || 'Notifica';
};

const syncPreferencesForm = (value) => {
	if (!value) return;
	preferenceForm.referral_site_enabled = Boolean(value.referral_site_enabled);
	preferenceForm.referral_email_enabled = Boolean(value.referral_email_enabled);
	preferenceForm.referral_sms_enabled = Boolean(value.referral_sms_enabled);
};

watch(
	preferencesData,
	(value) => {
		syncPreferencesForm(value);
	},
	{ immediate: true },
);

const refreshAll = async () => {
	activeAction.value = 'refresh';
	loadError.value = '';
	const tasks = [notificationsQuery.refresh(), unreadCountQuery.refresh(), preferencesQuery.refresh()];
	const results = await Promise.allSettled(tasks);
	const firstFailure = results.find((result) => result.status === 'rejected');
	if (firstFailure) {
		loadError.value = 'Alcune informazioni non sono state caricate. Riprova tra poco.';
	}
	syncPreferencesForm(preferencesData.value);
	activeAction.value = '';
};

onMounted(() => {
	refreshAll();
});

const savePreferences = async () => {
	savingPreferences.value = true;
	loadError.value = '';
	actionFeedback.value = '';
	try {
		await sanctum('/api/notifications/preferences', {
			method: 'PUT',
			body: {
				referral_site_enabled: preferenceForm.referral_site_enabled,
				referral_email_enabled: preferenceForm.referral_email_enabled,
				referral_sms_enabled: preferenceForm.referral_sms_enabled,
			},
		});
		actionFeedback.value = 'Preferenze aggiornate.';
		actionFeedbackType.value = 'success';
		await refreshAll();
		return true;
	} catch (error) {
		actionFeedback.value = error?.response?._data?.message || error?.data?.message || 'Impossibile salvare le preferenze.';
		actionFeedbackType.value = 'error';
		await refreshAll();
		return false;
	} finally {
		savingPreferences.value = false;
	}
};

const togglePreference = async (key) => {
	const previous = preferenceForm[key];
	preferenceForm[key] = !previous;
	const saved = await savePreferences();
	if (!saved) {
		preferenceForm[key] = previous;
	}
};

const markNotificationRead = async (notification) => {
	if (!notification?.id || notification.read_at) return;
	activeAction.value = `read-${notification.id}`;
	actionFeedback.value = '';
	try {
		await sanctum(`/api/notifications/${notification.id}/read`, {
			method: 'PATCH',
		});
		actionFeedback.value = 'Notifica segnata come letta.';
		actionFeedbackType.value = 'success';
		await refreshAll();
	} catch (error) {
		actionFeedback.value = error?.response?._data?.message || error?.data?.message || 'Impossibile segnare la notifica.';
		actionFeedbackType.value = 'error';
	} finally {
		activeAction.value = '';
	}
};

const markAllAsRead = async () => {
	if (!unreadCount.value) return;
	activeAction.value = 'all';
	actionFeedback.value = '';
	try {
		await sanctum('/api/notifications/read-all', {
			method: 'PATCH',
		});
		actionFeedback.value = 'Tutte le notifiche sono state segnate come lette.';
		actionFeedbackType.value = 'success';
		await refreshAll();
	} catch (error) {
		actionFeedback.value = error?.response?._data?.message || error?.data?.message || 'Impossibile completare l azione.';
		actionFeedbackType.value = 'error';
	} finally {
		activeAction.value = '';
	}
};

const isActionBusy = (key) => activeAction.value === key;

const notificationHeaderStats = computed(() => [
	{ label: 'Totali', value: `${totalNotifications.value}` },
	{ label: 'Non lette', value: `${unreadCount.value}` },
	{ label: 'Consensi', value: `${referralPreferencesEnabled.value}` },
]);

const referralPreferenceItems = computed(() => [
	{
		key: 'referral_site_enabled',
		title: 'Notifiche in-app',
		description: 'Mostra avvisi e aggiornamenti nel centro notifiche dell account.',
		tone: 'bg-[#F0F6F7] text-[var(--color-brand-primary)]',
		helper: 'Attivo quando vuoi ricevere segnali dentro il sito.',
	},
	{
		key: 'referral_email_enabled',
		title: 'Email referral',
		description: 'Ricevi un riepilogo via email quando il referral cambia stato.',
		tone: 'bg-[#F5F6F9] text-[var(--color-brand-text-secondary)]',
		helper: 'Consenso esplicito richiesto per il canale email.',
	},
]);

const smsPreferenceItem = computed(() => ({
	title: 'SMS referral',
	description: 'Canale previsto, ma non ancora disponibile nella shell attuale.',
	helper: 'Lo lasciamo disattivato finché il provider SMS non è configurato.',
}));
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[28px] desktop:py-[56px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Account"
				title="Notifiche"
				description="Gestisci le notifiche in-app e le preferenze referral senza uscire dalla shell account."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Notifiche' }]">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="stat in notificationHeaderStats"
							:key="stat.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[var(--color-brand-primary)]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>
				<template #actions>
					<div class="flex flex-wrap items-center gap-[8px]">
						<button
							type="button"
							class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]"
							:disabled="isActionBusy('refresh') || savingPreferences"
							@click="refreshAll">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
								<path
									d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.57,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
							</svg>
							Aggiorna
						</button>
						<button
							type="button"
							class="btn-cta btn-compact inline-flex items-center justify-center gap-[6px]"
							:disabled="!unreadCount || isActionBusy('all')"
							@click="markAllAsRead">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
								<path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" />
							</svg>
							Segna tutte lette
						</button>
					</div>
				</template>
			</AccountPageHeader>

			<div
				v-if="loadError || actionFeedback"
				:class="['mb-[16px] ux-alert', alertType === 'error' ? 'ux-alert--critical' : 'ux-alert--success']">
				<svg
					v-if="alertType === 'success'"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon shrink-0"
					fill="currentColor">
					<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
				</svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ loadError || actionFeedback }}</span>
			</div>

			<div class="sf-account-stat-grid mb-[16px]">
				<div class="sf-account-stat-card">
					<div class="flex items-center gap-[8px]">
						<div class="sf-account-stat-card__icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="var(--color-brand-primary)">
								<path
									d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.37,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16Z" />
							</svg>
						</div>
						<p class="text-[0.75rem] uppercase tracking-[0.5px] font-medium text-[var(--color-brand-text-secondary)]">Centro notifiche</p>
					</div>
					<p class="sf-account-stat-card__value">{{ totalNotifications }}</p>
				</div>
				<div class="sf-account-stat-card">
					<div class="flex items-center gap-[8px]">
						<div class="sf-account-stat-card__icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="var(--color-brand-primary)">
								<path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
							</svg>
						</div>
						<p class="text-[0.75rem] uppercase tracking-[0.5px] font-medium text-[var(--color-brand-text-secondary)]">Non lette</p>
					</div>
					<p class="sf-account-stat-card__value text-[var(--color-brand-primary)]">{{ unreadCount }}</p>
				</div>
				<div class="sf-account-stat-card">
					<div class="flex items-center gap-[8px]">
						<div class="sf-account-stat-card__icon">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="var(--color-brand-primary)">
								<path
									d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z" />
							</svg>
						</div>
						<p class="text-[0.75rem] uppercase tracking-[0.5px] font-medium text-[var(--color-brand-text-secondary)]">Consensi attivi</p>
					</div>
					<p class="sf-account-stat-card__value">{{ referralPreferencesEnabled }}</p>
				</div>
			</div>

			<div class="grid gap-[16px] desktop:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<div class="space-y-[14px]">
					<div class="sf-account-panel rounded-[20px] p-[18px] desktop:p-[20px]">
						<div class="mb-[16px] flex items-start justify-between gap-[12px]">
							<div class="min-w-0">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Lista notifiche</p>
								<h2 class="mt-[4px] font-montserrat text-[1.0625rem] font-[800] text-[var(--color-brand-text)]">Messaggi in-app recenti</h2>
								<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
									Segna le notifiche come lette una alla volta oppure svuota il non letto in un colpo solo.
								</p>
							</div>
							<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ unreadCount }} non lette</span>
						</div>

						<div
							v-if="notificationsQuery.status.value === 'pending' && !notificationList.length"
							class="rounded-[20px] border border-[var(--color-brand-border)] bg-[#F5F6F9] p-[24px] text-center">
							<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Caricamento notifiche...</p>
							<p class="mt-[6px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">
								Stiamo recuperando gli ultimi aggiornamenti del tuo account.
							</p>
						</div>

						<div v-else-if="!notificationList.length" class="rounded-[20px] border border-[var(--color-brand-border)] bg-[#F5F6F9] p-[24px] text-center">
							<div class="mx-auto mb-[16px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[#EEF6F8] text-[var(--color-brand-primary)]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[26px] w-[26px]" fill="currentColor">
									<path
										d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.37,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16Z" />
								</svg>
							</div>
							<p class="text-[1rem] font-semibold text-[var(--color-brand-text)]">Nessuna notifica disponibile</p>
							<p class="mx-auto mt-[6px] max-w-[440px] text-[0.875rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
								Quando il sistema referral o gli aggiornamenti account genereranno una notifica, comparirà qui.
							</p>
						</div>

						<div v-else class="space-y-[12px]">
							<article
								v-for="notification in notificationList"
								:key="notification.id"
								:class="[
									'sf-account-panel rounded-[20px] border p-[16px] transition-all',
									notification.read_at ? 'border-[var(--color-brand-border)] bg-white' : 'border-[#BFD8DD] bg-[#F5FBFC]',
								]">
								<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-start desktop:justify-between">
									<div class="min-w-0 space-y-[8px]">
										<div class="flex flex-wrap items-center gap-[8px]">
											<span class="sf-account-meta-pill">{{ formatTypeLabel(notification.type) }}</span>
											<span v-if="notification.read_at" class="sf-account-meta-pill sf-account-meta-pill--muted">Letta</span>
											<span v-else class="sf-account-meta-pill">Nuova</span>
										</div>
										<h3 class="font-montserrat text-[1rem] font-[800] text-[var(--color-brand-text)]">{{ notification.title || 'Aggiornamento account' }}</h3>
										<p class="max-w-[75ch] text-[0.875rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
											{{ notification.body || 'Hai una nuova notifica nel tuo account.' }}
										</p>
										<div class="flex flex-wrap gap-[8px] text-[0.75rem] font-medium text-[var(--color-brand-text-secondary)]">
											<span>{{ formatDate(notification.created_at) }}</span>
											<span v-if="notification.payload?.order_id">Ordine #{{ notification.payload.order_id }}</span>
										</div>
									</div>

									<div class="flex shrink-0 flex-wrap items-center gap-[8px]">
										<button
											v-if="!notification.read_at"
											type="button"
											class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]"
											:disabled="isActionBusy(`read-${notification.id}`)"
											@click="markNotificationRead(notification)">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
												<path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" />
											</svg>
											Segna come letta
										</button>
										<span v-else class="sf-account-meta-pill sf-account-meta-pill--muted">Già letta</span>
									</div>
								</div>
							</article>
						</div>
					</div>
				</div>

				<div class="space-y-[14px]">
					<div class="sf-account-panel rounded-[20px] p-[18px] desktop:p-[20px]">
						<div class="flex items-start gap-[12px]">
							<div class="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-[#F0F6F7] text-[var(--color-brand-primary)]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[22px] w-[22px]" fill="currentColor">
									<path
										d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.37,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16Z" />
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Preferenze referral</p>
								<h2 class="mt-[4px] font-montserrat text-[1.0625rem] font-[800] text-[var(--color-brand-text)]">Consenso per canali disponibili</h2>
								<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
									Scegli dove ricevere gli aggiornamenti referral. I canali sito ed email sono attivi, mentre SMS non è ancora disponibile.
								</p>
							</div>
						</div>

						<div class="mt-[18px] space-y-[12px]">
							<div
								v-for="item in referralPreferenceItems"
								:key="item.key"
								class="rounded-[20px] border border-[var(--color-brand-border)] bg-[#FBFCFD] px-[14px] py-[14px]">
								<div class="flex items-start justify-between gap-[12px]">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-[8px]">
											<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">{{ item.title }}</h3>
											<span :class="['inline-flex items-center rounded-full px-[10px] py-[4px] text-[0.6875rem] font-semibold', item.tone]">
												Attivo
											</span>
										</div>
										<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">{{ item.description }}</p>
										<p class="mt-[6px] text-[0.75rem] font-medium text-[var(--color-brand-text-secondary)]">{{ item.helper }}</p>
									</div>
									<button
										type="button"
										:class="['sf-toggle', preferenceForm[item.key] && 'is-active']"
										:disabled="savingPreferences"
										:aria-pressed="preferenceForm[item.key] ? 'true' : 'false'"
										:aria-label="`Attiva o disattiva ${item.title}`"
										@click="togglePreference(item.key)">
										<span class="sf-toggle__thumb"></span>
									</button>
								</div>
							</div>

							<div class="rounded-[20px] border border-dashed border-[#D6E4E7] bg-[#F5F6F9] px-[14px] py-[14px]">
								<div class="flex items-start justify-between gap-[12px]">
									<div class="min-w-0">
										<div class="flex flex-wrap items-center gap-[8px]">
											<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">{{ smsPreferenceItem.title }}</h3>
											<span
												class="inline-flex items-center rounded-full bg-[#FFF7E8] px-[10px] py-[4px] text-[0.6875rem] font-semibold text-[#B45309]">
												Non disponibile
											</span>
										</div>
										<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">{{ smsPreferenceItem.description }}</p>
										<p class="mt-[6px] text-[0.75rem] font-medium text-[var(--color-brand-text-secondary)]">{{ smsPreferenceItem.helper }}</p>
									</div>
									<button type="button" class="sf-toggle" disabled aria-disabled="true" aria-label="SMS non ancora disponibile">
										<span class="sf-toggle__thumb"></span>
									</button>
								</div>
							</div>
						</div>

						<div class="mt-[16px] rounded-[20px] bg-[#F5FBFC] px-[14px] py-[12px] text-[0.8125rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
							Le preferenze sito ed email richiedono consenso esplicito. Ogni modifica viene salvata subito nel tuo profilo.
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
