<!-- FILE: pages/account/notifiche.vue -->
<script setup>
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'Notifiche account | SpediamoFacile',
	ogTitle: 'Notifiche account | SpediamoFacile',
	description: 'Gestisci notifiche in-app, SMS, push e preferenze inviti dal tuo account SpediamoFacile.',
	ogDescription: 'Centro notifiche e consenso inviti dell area account SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
/* -- ARCHIVIATO 2026-04-20 -- const push = usePushNotifications(); */
/* Stub push no-op per preservare i binding template senza rompere il build. */
const push = {
	isSupported: ref(false),
	isSubscribed: ref(false),
	permission: ref('default'),
	isBusy: ref(false),
	lastError: ref(''),
	refresh: async () => true,
	subscribe: async () => false,
	unsubscribe: async () => false,
	sendTest: async () => false,
};

const notificationsQuery = useSanctumFetch('/api/notifications', { lazy: true });
const unreadCountQuery = useSanctumFetch('/api/notifications/unread-count', { lazy: true });
const preferencesQuery = useSanctumFetch('/api/notifications/preferences', { lazy: true });

const loadError = ref('');
const actionFeedback = ref('');
const actionFeedbackType = ref('success');
const activeAction = ref('');
const savingPreferences = ref(false);

/* F08 SMS / F09 Push aggiunti ai preferenceForm. phone_number gestito a parte. */
const preferenceForm = reactive({
	referral_site_enabled: true,
	referral_email_enabled: false,
	referral_sms_enabled: false,
	sms_order_updates: false,
	sms_marketing: false,
	push_order_updates: false,
	push_marketing: false,
});

const phoneInput = ref('');
const phoneSaving = ref(false);
const phoneError = ref('');
const smsProvider = ref('null');
const pushConfigured = ref(false);

const notificationList = computed(() => {
	const source = notificationsQuery.data.value;
	if (Array.isArray(source)) return source;
	if (Array.isArray(source?.data)) return source.data;
	if (Array.isArray(source?.items)) return source.items;
	return [];
});

const totalNotifications = computed(() => {
	const source = notificationsQuery.data.value;
	const raw = Number(source?.total ?? source?.meta?.total ?? notificationList.value.length ?? 0);
	return Number.isNaN(raw) ? 0 : raw;
});

const localUnreadCount = computed(() => notificationList.value.filter((notification) => !notification.read_at).length);
const unreadCount = computed(() => {
	const source = unreadCountQuery.data.value;
	if (typeof source === 'number') return Number.isNaN(source) ? 0 : source;
	if (typeof source === 'string' && source.trim()) {
		const parsed = Number(source);
		return Number.isNaN(parsed) ? 0 : parsed;
	}
	const raw = Number(source?.unread_count ?? localUnreadCount.value ?? 0);
	return Number.isNaN(raw) ? 0 : raw;
});

const preferencesData = computed(() => preferencesQuery.data.value?.data || preferencesQuery.data.value || null);
const channelsActiveCount = computed(() =>
	Number(preferenceForm.referral_site_enabled)
	+ Number(preferenceForm.referral_email_enabled)
	+ Number(preferenceForm.sms_order_updates),
	// -- ARCHIVIATO 2026-04-20 -- + Number(preferenceForm.push_order_updates),
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
		referral: 'Invito',
		order: 'Ordine',
		wallet: 'Portafoglio',
		support: 'Supporto',
		system: 'Sistema',
	};
	return labels[String(type || '').toLowerCase()] || 'Notifica';
};

const getNotifBorderClass = (type) => {
	const map = {
		order: 'sf-notif-row--order',
		wallet: 'sf-notif-row--wallet',
		referral: 'sf-notif-row--info',
		support: 'sf-notif-row--warning',
		system: 'sf-notif-row--info',
		error: 'sf-notif-row--error',
		success: 'sf-notif-row--success',
	};
	return map[String(type || '').toLowerCase()] || 'sf-notif-row--info';
};

const groupedNotifications = computed(() => {
	const groups = [];
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	let currentLabel = '';
	for (const notif of notificationList.value) {
		const d = new Date(notif.created_at);
		if (Number.isNaN(d.getTime())) {
			if (currentLabel !== 'Notifiche recenti') {
				currentLabel = 'Notifiche recenti';
				groups.push({ label: currentLabel, items: [] });
			}
			groups[groups.length - 1].items.push(notif);
			continue;
		}
		let label;
		if (d >= today) label = 'Oggi';
		else if (d >= yesterday) label = 'Ieri';
		else label = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);

		if (label !== currentLabel) {
			currentLabel = label;
			groups.push({ label, items: [] });
		}
		groups[groups.length - 1].items.push(notif);
	}
	return groups;
});

const syncPreferencesForm = (value) => {
	if (!value) return;
	preferenceForm.referral_site_enabled = Boolean(value.referral_site_enabled);
	preferenceForm.referral_email_enabled = Boolean(value.referral_email_enabled);
	preferenceForm.referral_sms_enabled = Boolean(value.referral_sms_enabled);
	preferenceForm.sms_order_updates = Boolean(value.sms_order_updates);
	preferenceForm.sms_marketing = Boolean(value.sms_marketing);
	preferenceForm.push_order_updates = Boolean(value.push_order_updates);
	preferenceForm.push_marketing = Boolean(value.push_marketing);
	if (typeof value.phone_number === 'string') phoneInput.value = value.phone_number;
	if (typeof value.sms_provider === 'string') smsProvider.value = value.sms_provider;
	if (typeof value.push_configured === 'boolean') pushConfigured.value = value.push_configured;
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
	const tasks = [
		notificationsQuery.refresh(),
		unreadCountQuery.refresh(),
		preferencesQuery.refresh(),
		push.refresh(),
	];
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

const savePartialPreferences = async (patch) => {
	savingPreferences.value = true;
	loadError.value = '';
	actionFeedback.value = '';
	try {
		await sanctum('/api/notification-preferences', {
			method: 'PATCH',
			body: patch,
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
	const saved = await savePartialPreferences({ [key]: preferenceForm[key] });
	if (!saved) {
		preferenceForm[key] = previous;
	}
};

/* F08: salva il numero E.164 lato server (validato e normalizzato dal backend). */
const savePhoneNumber = async () => {
	phoneSaving.value = true;
	phoneError.value = '';
	try {
		await sanctum('/api/notification-preferences', {
			method: 'PATCH',
			body: { phone_number: phoneInput.value || null },
		});
		await refreshAll();
		actionFeedback.value = phoneInput.value
			? 'Numero salvato. Ora puoi attivare le notifiche SMS.'
			: 'Numero rimosso e SMS disattivati.';
		actionFeedbackType.value = 'success';
	} catch (error) {
		phoneError.value = error?.response?._data?.message || error?.data?.message || 'Numero non valido.';
		actionFeedbackType.value = 'error';
	} finally {
		phoneSaving.value = false;
	}
};

/* F09: subscribe/unsubscribe push. Mantiene allineata la preferenza lato server. */
const togglePush = async () => {
	if (!push.isSupported.value) return;
	if (push.isSubscribed.value) {
		const ok = await push.unsubscribe();
		if (ok) {
			await savePartialPreferences({ push_order_updates: false });
		}
		return;
	}
	const ok = await push.subscribe();
	if (ok) {
		await savePartialPreferences({ push_order_updates: true });
	}
};

const sendPushTest = async () => {
	const ok = await push.sendTest();
	actionFeedback.value = ok ? 'Push di prova inviato.' : 'Impossibile inviare il push di prova.';
	actionFeedbackType.value = ok ? 'success' : 'error';
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

const notificationSummaryItems = computed(() => [
	{
		key: 'total',
		label: 'Centro notifiche',
		value: `${totalNotifications.value}`,
		meta: totalNotifications.value ? 'Storico aggiornamenti disponibile' : 'Nessun messaggio registrato',
	},
	{
		key: 'unread',
		label: 'Non lette',
		value: `${unreadCount.value}`,
		meta: unreadCount.value ? 'Da gestire o archiviare' : 'Situazione pulita',
	},
	{
		key: 'channels',
		label: 'Canali attivi',
		value: `${channelsActiveCount.value}`,
		meta: 'Sito, email e SMS',
	},
]);

const referralPreferenceItems = computed(() => [
	{
		key: 'referral_site_enabled',
		title: 'Notifiche in-app',
		description: 'Ricevi gli aggiornamenti direttamente nel centro notifiche del tuo account.',
		helper: 'Ideale per avvisi che vuoi vedere entrando nel sito, senza rumore extra.',
	},
	{
		key: 'referral_email_enabled',
		title: 'Email inviti',
		description: 'Ricevi un riepilogo via email quando lo stato di un invito cambia.',
		helper: 'Utile se vuoi una traccia anche fuori dal sito.',
	},
]);

/* F08: copy SMS e stato disponibilita' provider. */
const smsAvailability = computed(() => {
	if (smsProvider.value === 'null') {
		return {
			available: false,
			label: 'Provider non configurato',
			helper: 'Le SMS verranno solo registrate nei log finche\' un provider (es. Twilio) non e\' attivo.',
		};
	}
	return {
		available: true,
		label: `Attivo (${smsProvider.value})`,
		helper: 'Riceverai un SMS sui cambi stato spedizione importanti (ritiro, in transito, consegna).',
	};
});

const pushAvailability = computed(() => {
	if (!pushConfigured.value) {
		return { available: false, label: 'VAPID non configurato lato server', helper: 'Il backend deve generare le chiavi VAPID con `php artisan vapid:generate`.' };
	}
	if (!push.isSupported.value) {
		return { available: false, label: 'Browser non supportato', helper: 'Le push richiedono Chrome, Edge, Firefox, o Safari 16+.' };
	}
	if (push.permission.value === 'denied') {
		return { available: false, label: 'Permesso bloccato', helper: 'Hai bloccato le notifiche dal browser. Riattivale dalle impostazioni del sito.' };
	}
	return { available: true, label: push.isSubscribed.value ? 'Attive su questo dispositivo' : 'Disponibili', helper: 'Le notifiche push compaiono come pop-up del sistema operativo, anche con il sito chiuso.' };
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				title="Notifiche"
				description="Sito, email, SMS e push: scegli i canali piu utili per restare aggiornato."
				current="Notifiche">
			</AccountPageHeader>

			<div
				v-if="loadError || actionFeedback"
				:class="['mb-[16px] ux-alert', alertType === 'error' ? 'ux-alert--critical' : 'ux-alert--success']">
				<svg aria-hidden="true"
					v-if="alertType === 'success'"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon shrink-0"
					fill="currentColor">
					<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
				</svg>
				<svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ loadError || actionFeedback }}</span>
			</div>

			<div class="sf-account-summary-strip mb-[20px] sf-animate-in sf-animate-in-1">
				<div
					v-for="item in notificationSummaryItems"
					:key="item.key"
					class="sf-account-summary-item">
					<div class="sf-account-summary-item__icon">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[15px] w-[15px]" fill="currentColor" style="color: var(--color-brand-primary);">
							<path d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.37,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16Z" />
						</svg>
					</div>
					<div class="sf-account-summary-item__body">
						<span class="sf-account-summary-item__value">{{ item.value }}</span>
						<span class="sf-account-summary-item__label">{{ item.label }}</span>
						<span class="sf-account-summary-item__meta">{{ item.meta }}</span>
					</div>
				</div>
			</div>

			<!-- ========== F08 SMS ========== -->
			<section class="sf-account-section sf-account-panel sf-animate-in sf-animate-in-2">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">SMS spedizione</p>
						<h2 class="sf-account-section__title">Aggiornamenti via SMS</h2>
						<p class="sf-account-section__description">
							Ti avvisiamo via SMS quando il pacco viene ritirato, e' in consegna o consegnato. Solo eventi importanti.
						</p>
					</div>
					<span :class="['sf-account-meta-pill', smsAvailability.available ? '' : 'sf-account-meta-pill--muted']">
						{{ smsAvailability.label }}
					</span>
				</div>
				<div class="sf-account-section__body space-y-[12px]">
					<!-- Numero di telefono -->
					<div class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px]">
						<label for="sms-phone" class="block font-montserrat text-[0.875rem] font-[800] text-[var(--color-brand-text)]">Numero per SMS</label>
						<p class="mt-[4px] text-[0.75rem] leading-[1.5] text-[var(--color-brand-text-muted)]">
							Formato internazionale (+39 ...) o italiano locale (333 1234567). Verra' normalizzato in automatico.
						</p>
						<div class="mt-[10px] flex flex-col gap-[8px] tablet:flex-row tablet:items-center">
							<input
								id="sms-phone"
								v-model="phoneInput"
								type="tel"
								inputmode="tel"
								autocomplete="tel"
								placeholder="+39 333 1234567"
								class="h-[40px] flex-1 rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
							/>
							<button
								type="button"
								class="btn-primary btn-compact"
								:disabled="phoneSaving"
								@click="savePhoneNumber">
								{{ phoneSaving ? 'Salvataggio...' : 'Salva numero' }}
							</button>
						</div>
						<p v-if="phoneError" class="mt-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-accent)]">{{ phoneError }}</p>
					</div>

					<!-- Toggle SMS aggiornamenti -->
					<div class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] hover:bg-[#FBFCFD]">
						<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-[8px]">
									<h3 class="font-montserrat text-[0.875rem] font-[800] text-[var(--color-brand-text)]">Aggiornamenti spedizione</h3>
									<span :class="['sf-account-meta-pill', preferenceForm.sms_order_updates ? '' : 'sf-account-meta-pill--muted']">
										{{ preferenceForm.sms_order_updates ? 'Attivo' : 'Disattivo' }}
									</span>
								</div>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">Ritiro, in transito, in consegna oggi, consegnato. Massimo 3 SMS per spedizione.</p>
								<p class="mt-[4px] text-[0.75rem] leading-[1.5] text-[var(--color-brand-text-muted)]">{{ smsAvailability.helper }}</p>
							</div>
							<button
								type="button"
								role="switch"
								:class="['sf-toggle sf-toggle--premium', preferenceForm.sms_order_updates && 'is-active']"
								:disabled="savingPreferences || !phoneInput"
								:aria-checked="preferenceForm.sms_order_updates ? 'true' : 'false'"
								aria-label="Attiva o disattiva SMS aggiornamenti spedizione"
								@click="togglePreference('sms_order_updates')">
								<span class="sf-toggle__thumb"></span>
							</button>
						</div>
					</div>

					<!-- Toggle SMS marketing -->
					<div class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] hover:bg-[#FBFCFD]">
						<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-[8px]">
									<h3 class="font-montserrat text-[0.875rem] font-[800] text-[var(--color-brand-text)]">Promo e sconti via SMS</h3>
									<span :class="['sf-account-meta-pill', preferenceForm.sms_marketing ? '' : 'sf-account-meta-pill--muted']">
										{{ preferenceForm.sms_marketing ? 'Attivo' : 'Disattivo' }}
									</span>
								</div>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">Coupon dedicati e iniziative stagionali. Default disattivo.</p>
							</div>
							<button
								type="button"
								role="switch"
								:class="['sf-toggle sf-toggle--premium', preferenceForm.sms_marketing && 'is-active']"
								:disabled="savingPreferences || !phoneInput"
								:aria-checked="preferenceForm.sms_marketing ? 'true' : 'false'"
								aria-label="Attiva o disattiva SMS marketing"
								@click="togglePreference('sms_marketing')">
								<span class="sf-toggle__thumb"></span>
							</button>
						</div>
					</div>
				</div>
			</section>

			<!-- -- ARCHIVIATO 2026-04-20 -- INIZIO SEZIONE PUSH NOTIFICATIONS (F09) -->
			<!--
			<section class="sf-account-section sf-account-panel sf-animate-in sf-animate-in-2">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Push notifiche</p>
						<h2 class="sf-account-section__title">Notifiche sul dispositivo</h2>
						<p class="sf-account-section__description">
							Avvisi push sul tuo dispositivo (PWA installata o sito aperto in background). Niente cookie, niente email.
						</p>
					</div>
					<span :class="['sf-account-meta-pill', pushAvailability.available ? '' : 'sf-account-meta-pill&#45;&#45;muted']">
						{{ pushAvailability.label }}
					</span>
				</div>
				<div class="sf-account-section__body space-y-[12px]">
					<div class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px]">
						<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-[8px]">
									<h3 class="font-montserrat text-[0.875rem] font-[800] text-[var(&#45;&#45;color-brand-text)]">Push aggiornamenti spedizione</h3>
									<span :class="['sf-account-meta-pill', push.isSubscribed.value ? '' : 'sf-account-meta-pill&#45;&#45;muted']">
										{{ push.isSubscribed.value ? 'Attive' : 'Disattive' }}
									</span>
								</div>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[var(&#45;&#45;color-brand-text-secondary)]">{{ pushAvailability.helper }}</p>
								<button
									type="button"
									role="switch"
									:class="['sf-toggle sf-toggle&#45;&#45;premium', push.isSubscribed.value && 'is-active']"
									:disabled="push.isBusy.value || !pushAvailability.available"
									:aria-checked="push.isSubscribed.value ? 'true' : 'false'"
									aria-label="Attiva o disattiva notifiche push"
									@click="togglePush">
									<span class="sf-toggle__thumb"></span>
								</button>
							</div>
						</div>
					</div>

					<div v-if="push.isSubscribed.value" class="flex justify-end">
						<button type="button" class="btn-secondary btn-compact" @click="sendPushTest">Invia push di prova</button>
					</div>
				</div>
			</section>
			-->
			<!-- -- END ARCHIVIATO 2026-04-20 -- FINE SEZIONE PUSH NOTIFICATIONS -->


			<!-- ========== REFERRAL (esistente) ========== -->
			<section class="sf-account-section sf-account-panel sf-animate-in sf-animate-in-3">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Inviti</p>
						<h2 class="sf-account-section__title">Notifiche inviti</h2>
						<p class="sf-account-section__description">
							Scegli dove ricevere gli aggiornamenti sui tuoi inviti. Salviamo subito ogni modifica.
						</p>
					</div>
					<button
						type="button"
						class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]"
						:disabled="isActionBusy('refresh') || savingPreferences"
						@click="refreshAll">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
							<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.57,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
						</svg>
						Aggiorna
					</button>
				</div>
				<div class="sf-account-section__body">
					<div class="space-y-[10px]">
						<div
							v-for="item in referralPreferenceItems"
							:key="item.key"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] transition-colors hover:bg-[#FBFCFD]">
							<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-[8px]">
										<h3 class="font-montserrat text-[0.875rem] font-[800] text-[var(--color-brand-text)]">{{ item.title }}</h3>
										<span
											:class="[
												'sf-account-meta-pill',
												preferenceForm[item.key] ? '' : 'sf-account-meta-pill--muted',
											]">
											{{ preferenceForm[item.key] ? 'Attivo' : 'Disattivo' }}
										</span>
									</div>
									<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">{{ item.description }}</p>
									<p class="mt-[4px] text-[0.75rem] leading-[1.5] text-[var(--color-brand-text-muted)]">{{ item.helper }}</p>
								</div>
								<button
									type="button"
									role="switch"
									:class="['sf-toggle sf-toggle--premium', preferenceForm[item.key] && 'is-active']"
									:disabled="savingPreferences"
									:aria-checked="preferenceForm[item.key] ? 'true' : 'false'"
									:aria-label="`Attiva o disattiva ${item.title}`"
									@click="togglePreference(item.key)">
									<span class="sf-toggle__thumb"></span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- ========== CENTRO NOTIFICHE ========== -->
			<section class="sf-account-section sf-account-panel sf-animate-in sf-animate-in-3">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Centro notifiche</p>
						<h2 class="sf-account-section__title">Messaggi recenti</h2>
						<p class="sf-account-section__description">
							Vedi cosa e' arrivato di recente e svuota il non letto solo quando ti serve davvero.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ unreadCount }} non lette</span>
						<button
							type="button"
							class="btn-primary btn-compact inline-flex items-center justify-center gap-[6px]"
							:disabled="!unreadCount || isActionBusy('all')"
							@click="markAllAsRead">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
								<path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" />
							</svg>
							Segna tutte lette
						</button>
					</div>
				</div>
				<div class="sf-account-section__body">
					<!-- Loading: 3 card skeleton unificate via SfSkeleton -->
					<div
						v-if="notificationsQuery.status.value === 'pending' && !notificationList.length"
						class="space-y-[10px]"
						aria-busy="true"
						aria-live="polite">
						<div
							v-for="n in 3"
							:key="n"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px]">
							<SfSkeleton variant="text-block" />
						</div>
					</div>

					<!-- Empty state — pattern sf-empty-state condiviso sitewide -->
					<div v-else-if="!notificationList.length" class="sf-empty-state" role="status">
						<div class="sf-empty-state__icon" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
								<path d="M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.37,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.64,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16Z" />
							</svg>
						</div>
						<h3 class="sf-empty-state__title">Nessuna notifica disponibile</h3>
						<p class="sf-empty-state__copy">
							Quando arriverà un aggiornamento sul tuo account o un invito, lo troverai qui in ordine cronologico.
						</p>
						<NuxtLink to="/account" class="sf-empty-state__cta sf-empty-state__cta--ghost" aria-label="Torna alla dashboard account">
							<span>Vai alla dashboard</span>
						</NuxtLink>
					</div>

					<div v-else class="space-y-[8px]">
						<template v-for="(group, gi) in groupedNotifications" :key="gi">
							<div class="sf-date-header-line mb-[6px]" :class="{ 'mt-[16px]': gi > 0 }">
								<span class="text-[0.6875rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-text-muted)] whitespace-nowrap">{{ group.label }}</span>
							</div>

							<article
								v-for="notification in group.items"
								:key="notification.id"
								:class="[
									'rounded-[16px] rounded-l-[12px] px-[16px] py-[15px] transition-all sf-notif-row',
									getNotifBorderClass(notification.type),
									notification.read_at ? 'sf-notif-row--read' : 'sf-notif-row--unread',
								]">
								<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-start desktop:justify-between">
									<div class="min-w-0 space-y-[6px]">
										<div class="flex flex-wrap items-center gap-[6px]">
											<span v-if="!notification.read_at" class="sf-unread-dot"></span>
											<span class="sf-account-meta-pill">{{ formatTypeLabel(notification.type) }}</span>
											<span v-if="notification.read_at" class="sf-account-meta-pill sf-account-meta-pill--muted">Letta</span>
											<span v-else class="sf-account-meta-pill">Nuova</span>
											<span v-if="notification.payload?.order_id" class="sf-account-meta-pill sf-account-meta-pill--muted">
												Ordine #{{ notification.payload.order_id }}
											</span>
										</div>
										<h3 :class="['font-montserrat text-[0.9375rem] text-[var(--color-brand-text)]', notification.read_at ? 'font-[700]' : 'font-[800]']">
											{{ notification.title || 'Aggiornamento account' }}
										</h3>
										<p class="max-w-[78ch] text-[0.8125rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
											{{ notification.body || 'Hai una nuova notifica nel tuo account.' }}
										</p>
										<div class="flex flex-wrap gap-[6px] text-[0.6875rem] font-medium text-[var(--color-brand-text-secondary)]">
											<span>{{ formatDate(notification.created_at) }}</span>
										</div>
									</div>

									<div class="flex shrink-0 flex-wrap items-center gap-[8px]">
										<button
											v-if="!notification.read_at"
											type="button"
											class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]"
											:disabled="isActionBusy(`read-${notification.id}`)"
											@click="markNotificationRead(notification)">
											<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
												<path d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z" />
											</svg>
											Segna come letta
										</button>
										<span v-else class="sf-account-meta-pill sf-account-meta-pill--muted">Gia letta</span>
									</div>
								</div>
							</article>
						</template>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>
