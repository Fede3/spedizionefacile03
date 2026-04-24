<!-- AdminUserDetailDrawer.vue — Drawer dettaglio utente admin (M9) -->
<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
	open: { type: Boolean, default: false },
	userId: { type: [Number, String, null], default: null },
	canMaster: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open', 'updated', 'impersonate']);

const sanctum = useSanctumClient();
const { showSuccess, showError, formatDate, formatPrice } = useAdmin();

/* ===== State ===== */
const loading = ref(false);
const saving = ref(false);
const user = ref(null);
const orders = ref([]);
const addresses = ref([]);
const walletTx = ref([]);
const auditLog = ref([]);

const activeTab = ref('orders');

/* Editable form */
const form = ref({
	role: 'User',
	status: 'active',
	is_pro: false,
});

/* Confirm dialogs */
const showBanConfirm = ref(false);
const showResetConfirm = ref(false);
const showEmailModal = ref(false);
const showImpersonateConfirm = ref(false);
const newEmail = ref('');

/* ===== Computed ===== */
const fullName = computed(() => user.value ? `${user.value.name || ''} ${user.value.surname || ''}`.trim() : '');
const userType = computed(() => {
	const t = (user.value?.user_type || 'privato').toLowerCase();
	return t === 'commerciante' || t === 'azienda' ? 'Azienda' : 'Privato';
});
const isBanned = computed(() => form.value.status === 'banned');
const initials = computed(() => {
	if (!user.value) return '?';
	const f = (user.value.name?.[0] || '').toUpperCase();
	const l = (user.value.surname?.[0] || '').toUpperCase();
	return `${f}${l}` || '?';
});

const tabs = [
	{ key: 'orders', label: 'Ordini' },
	{ key: 'addresses', label: 'Indirizzi' },
	{ key: 'wallet', label: 'Wallet' },
	{ key: 'audit', label: 'Audit log' },
];

/* ===== Fetchers ===== */
const fetchDetail = async () => {
	if (!props.userId) return;
	loading.value = true;
	try {
		const res = await sanctum(`/api/admin/users/${props.userId}`);
		const data = res?.data ?? res ?? null;
		user.value = data;
		form.value = {
			role: data?.role || 'User',
			status: data?.status || (data?.banned_at ? 'banned' : (data?.email_verified_at ? 'active' : 'pending-verification')),
			is_pro: Boolean(data?.is_pro),
		};
		orders.value = Array.isArray(data?.orders) ? data.orders : [];
		addresses.value = Array.isArray(data?.addresses) ? data.addresses : [];
		walletTx.value = Array.isArray(data?.wallet_transactions) ? data.wallet_transactions : [];
		auditLog.value = Array.isArray(data?.audit_log) ? data.audit_log : [];
	} catch (e) {
		showError(e, 'Errore nel caricamento del dettaglio utente.');
		user.value = null;
	} finally {
		loading.value = false;
	}
};

watch(() => [props.open, props.userId], ([isOpen, id]) => {
	if (isOpen && id) {
		activeTab.value = 'orders';
		fetchDetail();
	}
});

/* ===== Save (role/status/is_pro) ===== */
const saveProfile = async () => {
	if (!user.value) return;
	saving.value = true;
	try {
		await sanctum(`/api/admin/users/${user.value.id}`, {
			method: 'PATCH',
			body: { ...form.value },
		});
		showSuccess('Profilo aggiornato correttamente.');
		emit('updated');
		await fetchDetail();
	} catch (e) {
		showError(e, "Errore durante l'aggiornamento del profilo.");
	} finally {
		saving.value = false;
	}
};

/* ===== Reset password ===== */
const askResetPassword = () => { showResetConfirm.value = true; };
const doResetPassword = async () => {
	if (!user.value) return;
	saving.value = true;
	try {
		await sanctum(`/api/admin/users/${user.value.id}/reset-password`, { method: 'POST' });
		showSuccess('Email di reset password inviata.');
		showResetConfirm.value = false;
	} catch (e) {
		showError(e, "Errore durante l'invio del reset password.");
	} finally {
		saving.value = false;
	}
};

/* ===== Ban / Unban ===== */
const askBan = () => { showBanConfirm.value = true; };
const doBanToggle = async () => {
	if (!user.value) return;
	saving.value = true;
	try {
		const next = isBanned.value ? 'active' : 'banned';
		await sanctum(`/api/admin/users/${user.value.id}`, {
			method: 'PATCH',
			body: { status: next },
		});
		showSuccess(next === 'banned' ? 'Utente bannato.' : 'Ban rimosso.');
		showBanConfirm.value = false;
		emit('updated');
		await fetchDetail();
	} catch (e) {
		showError(e, "Errore durante l'operazione di ban.");
	} finally {
		saving.value = false;
	}
};

/* ===== Cambia email (admin-master) ===== */
const askChangeEmail = () => {
	newEmail.value = user.value?.email || '';
	showEmailModal.value = true;
};
const doChangeEmail = async () => {
	if (!user.value || !newEmail.value) return;
	saving.value = true;
	try {
		await sanctum(`/api/admin/users/${user.value.id}`, {
			method: 'PATCH',
			body: { email: newEmail.value },
		});
		showSuccess('Email aggiornata.');
		showEmailModal.value = false;
		emit('updated');
		await fetchDetail();
	} catch (e) {
		showError(e, "Errore durante il cambio email.");
	} finally {
		saving.value = false;
	}
};

/* ===== Impersonate ===== */
const askImpersonate = () => { showImpersonateConfirm.value = true; };
const doImpersonate = async () => {
	if (!user.value) return;
	saving.value = true;
	try {
		await sanctum(`/api/admin/users/${user.value.id}/impersonate`, { method: 'POST' });
		showSuccess('Sessione impersonata avviata. Verrai reindirizzato.');
		showImpersonateConfirm.value = false;
		emit('impersonate', user.value);
		setTimeout(() => { window.location.href = '/account'; }, 600);
	} catch (e) {
		showError(e, "Errore durante l'impersona.");
	} finally {
		saving.value = false;
	}
};

const close = () => emit('update:open', false);

/* Wallet tx amount in cents -> euros */
const formatTxAmount = (cents) => {
	if (typeof formatPrice === 'function') return formatPrice(cents);
	const n = Number(cents) / 100;
	return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
};
</script>

<template>
	<Teleport to="body">
		<Transition name="drawer-fade">
			<div v-if="open" class="admin-drawer-overlay" @click.self="close">
				<aside class="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
					<!-- Header -->
					<header class="admin-drawer__head">
						<div class="admin-drawer__head-main">
							<div class="admin-drawer__avatar" aria-hidden="true">{{ initials }}</div>
							<div class="admin-drawer__head-copy">
								<h2 id="drawer-title" class="admin-drawer__title">{{ fullName || 'Utente' }}</h2>
								<p class="admin-drawer__subtitle">{{ user?.email || '\u2014' }}</p>
							</div>
						</div>
						<button type="button" class="admin-drawer__close" :aria-label="`Chiudi dettaglio`" @click="close">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
						</button>
					</header>

					<!-- Body scroll area -->
					<div class="admin-drawer__body">
						<!-- Loading -->
						<div v-if="loading" class="admin-drawer__loading">
							<div class="admin-drawer__spinner" aria-hidden="true" />
							<p>Caricamento dettaglio in corso...</p>
						</div>

						<template v-else-if="user">
							<!-- Profilo readonly -->
							<section class="admin-drawer-section">
								<h3 class="admin-drawer-section__title">Dati profilo</h3>
								<dl class="admin-drawer-grid">
									<div class="admin-drawer-grid__cell">
										<dt>ID</dt>
										<dd>#{{ user.id }}</dd>
									</div>
									<div class="admin-drawer-grid__cell">
										<dt>Tipo</dt>
										<dd>{{ userType }}</dd>
									</div>
									<div class="admin-drawer-grid__cell">
										<dt>Telefono</dt>
										<dd>{{ user.telephone_number || '\u2014' }}</dd>
									</div>
									<div class="admin-drawer-grid__cell">
										<dt>Codice referral</dt>
										<dd class="admin-drawer-grid__mono">{{ user.referral_code || '\u2014' }}</dd>
									</div>
									<div class="admin-drawer-grid__cell">
										<dt>Registrato</dt>
										<dd>{{ formatDate(user.created_at) }}</dd>
									</div>
									<div class="admin-drawer-grid__cell">
										<dt>Email verificata</dt>
										<dd>{{ user.email_verified_at ? formatDate(user.email_verified_at) : 'No' }}</dd>
									</div>
								</dl>
							</section>

							<!-- Editor permessi -->
							<section class="admin-drawer-section">
								<h3 class="admin-drawer-section__title">Permessi e stato</h3>
								<div class="admin-drawer-form">
									<label class="admin-drawer-field">
										<span class="admin-drawer-field__label">Ruolo</span>
										<select v-model="form.role" class="admin-drawer-field__control" :disabled="saving">
											<option value="User">Cliente (Privato)</option>
											<option value="Partner">Partner</option>
											<option value="Partner Pro">Partner Pro</option>
											<option value="Admin">Admin</option>
										</select>
									</label>
									<label class="admin-drawer-field">
										<span class="admin-drawer-field__label">Stato account</span>
										<select v-model="form.status" class="admin-drawer-field__control" :disabled="saving">
											<option value="active">Attivo</option>
											<option value="pending-verification">In verifica email</option>
											<option value="banned">Bannato</option>
										</select>
									</label>
									<label class="admin-drawer-toggle">
										<input v-model="form.is_pro" type="checkbox" :disabled="saving" />
										<span class="admin-drawer-toggle__track"><span class="admin-drawer-toggle__thumb" /></span>
										<span class="admin-drawer-toggle__label">Utente Pro (visibile come Partner Pro)</span>
									</label>
									<button type="button" class="admin-drawer-save" :disabled="saving" @click="saveProfile">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
										{{ saving ? 'Salvataggio...' : 'Salva modifiche' }}
									</button>
								</div>
							</section>

							<!-- Tabs -->
							<section class="admin-drawer-section">
								<div class="admin-drawer-tabs" role="tablist">
									<button
										v-for="t in tabs"
										:key="t.key"
										type="button"
										role="tab"
										:aria-selected="activeTab === t.key"
										:class="['admin-drawer-tab', activeTab === t.key && 'admin-drawer-tab--active']"
										@click="activeTab = t.key">
										{{ t.label }}
									</button>
								</div>

								<!-- Ordini -->
								<div v-if="activeTab === 'orders'" class="admin-drawer-tabpanel">
									<div v-if="!orders.length" class="admin-drawer-empty">Nessun ordine registrato.</div>
									<ul v-else class="admin-drawer-list">
										<li v-for="o in orders.slice(0, 8)" :key="o.id" class="admin-drawer-list__item">
											<div class="admin-drawer-list__main">
												<p class="admin-drawer-list__title">Ordine #{{ o.id }}</p>
												<p class="admin-drawer-list__meta">{{ formatDate(o.created_at) }}</p>
											</div>
											<span class="admin-drawer-list__value">{{ formatTxAmount(o.total_amount ?? o.amount ?? 0) }}</span>
										</li>
									</ul>
								</div>

								<!-- Indirizzi -->
								<div v-if="activeTab === 'addresses'" class="admin-drawer-tabpanel">
									<div v-if="!addresses.length" class="admin-drawer-empty">Nessun indirizzo salvato.</div>
									<ul v-else class="admin-drawer-list">
										<li v-for="a in addresses" :key="a.id" class="admin-drawer-list__item">
											<div class="admin-drawer-list__main">
												<p class="admin-drawer-list__title">{{ a.label || a.name || 'Indirizzo' }}</p>
												<p class="admin-drawer-list__meta">{{ a.address }}, {{ a.postal_code }} {{ a.city }}</p>
											</div>
										</li>
									</ul>
								</div>

								<!-- Wallet -->
								<div v-if="activeTab === 'wallet'" class="admin-drawer-tabpanel">
									<div v-if="!walletTx.length" class="admin-drawer-empty">Nessun movimento wallet.</div>
									<ul v-else class="admin-drawer-list">
										<li v-for="tx in walletTx.slice(0, 10)" :key="tx.id" class="admin-drawer-list__item">
											<div class="admin-drawer-list__main">
												<p class="admin-drawer-list__title">{{ tx.description || tx.type || 'Movimento' }}</p>
												<p class="admin-drawer-list__meta">{{ formatDate(tx.created_at) }}</p>
											</div>
											<span :class="['admin-drawer-list__value', Number(tx.amount) < 0 && 'admin-drawer-list__value--neg']">
												{{ formatTxAmount(tx.amount) }}
											</span>
										</li>
									</ul>
								</div>

								<!-- Audit -->
								<div v-if="activeTab === 'audit'" class="admin-drawer-tabpanel">
									<div v-if="!auditLog.length" class="admin-drawer-empty">Nessun evento registrato.</div>
									<ul v-else class="admin-drawer-list">
										<li v-for="ev in auditLog.slice(0, 10)" :key="ev.id" class="admin-drawer-list__item">
											<div class="admin-drawer-list__main">
												<p class="admin-drawer-list__title">{{ ev.action || ev.event }}</p>
												<p class="admin-drawer-list__meta">{{ formatDate(ev.created_at) }}{{ ev.actor_name ? ` \u2022 ${ev.actor_name}` : '' }}</p>
											</div>
										</li>
									</ul>
								</div>
							</section>

							<!-- Azioni distruttive -->
							<section class="admin-drawer-section admin-drawer-section--danger">
								<h3 class="admin-drawer-section__title">Azioni rapide</h3>
								<div class="admin-drawer-actions">
									<button type="button" class="admin-drawer-action" @click="askResetPassword">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.63,2C18.16,2 22.64,6.5 22.64,12C22.64,17.5 18.16,22 12.63,22C9.12,22 6.05,20.18 4.26,17.43L5.84,16.18C7.25,18.47 9.76,20 12.64,20A8,8 0 0,0 20.64,12A8,8 0 0,0 12.64,4C8.56,4 5.2,7.06 4.71,11H7.47L3.73,14.73L0,11H2.69C3.19,5.95 7.45,2 12.63,2M15.59,10.24C16.09,10.25 16.5,10.65 16.5,11.16V15.77C16.5,16.27 16.09,16.69 15.58,16.69H10.05C9.54,16.69 9.13,16.27 9.13,15.77V11.16C9.13,10.65 9.54,10.25 10.04,10.24V9.23C10.04,7.7 11.29,6.46 12.81,6.46C14.34,6.46 15.59,7.7 15.59,9.23V10.24M12.81,7.86C12.06,7.86 11.44,8.47 11.44,9.23V10.24H14.19V9.23C14.19,8.47 13.57,7.86 12.81,7.86Z"/></svg>
										Reset password
									</button>
									<button type="button" :class="['admin-drawer-action', isBanned ? 'admin-drawer-action--success' : 'admin-drawer-action--danger']" @click="askBan">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,2C17.5,2 22,6.5 22,12C22,17.5 17.5,22 12,22C6.5,22 2,17.5 2,12C2,6.5 6.5,2 12,2M12,4C10.1,4 8.4,4.6 7.1,5.7L18.3,16.9C19.3,15.5 20,13.8 20,12C20,7.6 16.4,4 12,4M16.9,18.3L5.7,7.1C4.6,8.4 4,10.1 4,12C4,16.4 7.6,20 12,20C13.9,20 15.6,19.4 16.9,18.3Z"/></svg>
										{{ isBanned ? 'Rimuovi ban' : 'Banna utente' }}
									</button>
									<button v-if="canMaster" type="button" class="admin-drawer-action" @click="askChangeEmail">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
										Cambia email
									</button>
									<button v-if="canMaster" type="button" class="admin-drawer-action admin-drawer-action--accent" @click="askImpersonate">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z"/></svg>
										Impersona
									</button>
								</div>
							</section>
						</template>

						<div v-else class="admin-drawer-empty admin-drawer-empty--lg">
							Impossibile caricare l'utente.
						</div>
					</div>
				</aside>
			</div>
		</Transition>
	</Teleport>

	<!-- Confirm dialogs -->
	<AccountConfirmDialog
		v-model:open="showResetConfirm"
		title="Invia reset password"
		:description="`Stai per inviare a ${user?.email} un'email per reimpostare la password. L'utente potra creare una nuova password tramite il link.`"
		confirm-label="Invia email"
		tone="primary"
		:loading="saving"
		@confirm="doResetPassword" />

	<AccountConfirmDialog
		v-model:open="showBanConfirm"
		:title="isBanned ? 'Rimuovi ban' : 'Banna utente'"
		:description="isBanned
			? `Stai per ripristinare l'accesso di ${fullName}. L'utente potra di nuovo effettuare il login.`
			: `Stai per bannare ${fullName}. L'utente non potra piu accedere finche non rimuovi il ban.`"
		:confirm-label="isBanned ? 'Rimuovi ban' : 'Banna'"
		:tone="isBanned ? 'primary' : 'danger'"
		:loading="saving"
		@confirm="doBanToggle" />

	<AccountConfirmDialog
		v-model:open="showImpersonateConfirm"
		title="Impersona utente"
		:description="`Stai per accedere come ${fullName}. Tutte le azioni saranno tracciate nell'audit log. Al termine dovrai effettuare il logout per tornare al tuo account.`"
		confirm-label="Impersona ora"
		tone="primary"
		:loading="saving"
		@confirm="doImpersonate" />

	<!-- Montiamo questa modale solo lato client e solo quando serve:
	     canMaster dipende dallo stato auth e può divergere tra SSR e hydration. -->
	<ClientOnly>
		<UModal
			v-if="canMaster && showEmailModal"
			:open="showEmailModal"
			title="Cambia email"
			description="Inserisci la nuova email dell'utente e conferma l'aggiornamento."
			:ui="{ overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]', content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),26rem)]', body: '!p-0' }"
			@update:open="showEmailModal = $event">
			<template #body>
				<section class="admin-drawer-email-modal">
					<h3 class="admin-drawer-email-modal__title">Cambia email</h3>
					<p class="admin-drawer-email-modal__desc">Inserisci la nuova email per {{ fullName }}. L'utente verra avvisato.</p>
					<input v-model="newEmail" type="email" class="admin-drawer-email-modal__input" placeholder="nome@dominio.it" />
					<div class="admin-drawer-email-modal__actions">
						<button type="button" class="admin-drawer-action" :disabled="saving" @click="showEmailModal = false">Annulla</button>
						<button type="button" class="admin-drawer-action admin-drawer-action--success" :disabled="saving || !newEmail" @click="doChangeEmail">
							{{ saving ? 'Salvataggio...' : 'Conferma' }}
						</button>
					</div>
				</section>
			</template>
		</UModal>
	</ClientOnly>
</template>

<style scoped>
/* sf-admin-user-detail.css — stili del drawer dettaglio utente admin (AdminUserDetailDrawer.vue).
 * Estratto dallo <style scoped> originale: tutte le classi sono prefissate
 * .admin-drawer* quindi sicuro come global, nessun rischio di collisione.
 * Pattern identico a sf-service-card.css (importato nello <script setup>).
 */
.admin-drawer-overlay {
	position: fixed;
	inset: 0;
	background: rgba(9, 19, 28, 0.36);
	backdrop-filter: blur(6px);
	z-index: 60;
	display: flex;
	justify-content: flex-end;
}

.admin-drawer {
	width: min(480px, 100vw);
	height: 100vh;
	background: var(--admin-surface);
	border-left: 1px solid var(--admin-border);
	box-shadow: var(--admin-shadow-lg);
	display: flex;
	flex-direction: column;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
	transition: opacity 0.2s ease;
}

.drawer-fade-enter-active .admin-drawer,
.drawer-fade-leave-active .admin-drawer {
	transition: transform 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
	opacity: 0;
}

.drawer-fade-enter-from .admin-drawer,
.drawer-fade-leave-to .admin-drawer {
	transform: translateX(24px);
}

/* Header */
.admin-drawer__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 16px 20px;
	border-bottom: 1px solid var(--admin-border);
	background: var(--admin-surface-muted);
}

.admin-drawer__head-main {
	display: flex;
	align-items: center;
	gap: 12px;
	min-width: 0;
}

.admin-drawer__avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: 999px;
	background: var(--admin-status-success-bg);
	color: var(--admin-status-success);
	font-weight: 800;
	font-size: 0.875rem;
}

.admin-drawer__head-copy {
	min-width: 0;
}

.admin-drawer__title {
	margin: 0;
	font-size: 1rem;
	font-weight: 800;
	line-height: 1.2;
	color: var(--admin-text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 280px;
}

.admin-drawer__subtitle {
	margin: 2px 0 0;
	font-size: 0.8125rem;
	color: var(--admin-text-secondary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 280px;
}

.admin-drawer__close {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: var(--admin-radius-sm);
	border: 1px solid var(--admin-border);
	background: var(--admin-surface);
	color: var(--admin-text-secondary);
	cursor: pointer;
	flex-shrink: 0;
	transition: var(--admin-transition-fast);
}

.admin-drawer__close:hover {
	background: var(--admin-surface-hover);
	color: var(--admin-text-primary);
}

/* Body */
.admin-drawer__body {
	flex: 1;
	overflow-y: auto;
	padding: 16px 20px 24px;
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.admin-drawer__loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 60px 0;
	color: var(--admin-text-muted);
	font-size: 0.875rem;
}

.admin-drawer__spinner {
	width: 24px;
	height: 24px;
	border-radius: 999px;
	border: 2px solid var(--admin-border);
	border-top-color: var(--admin-status-success);
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

/* Sections */
.admin-drawer-section {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.admin-drawer-section--danger {
	padding-top: 14px;
	border-top: 1px solid var(--admin-border);
}

.admin-drawer-section__title {
	margin: 0;
	font-size: 0.6875rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--admin-text-muted);
}

/* Profilo grid */
.admin-drawer-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	margin: 0;
	padding: 12px;
	background: var(--admin-surface-muted);
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
}

.admin-drawer-grid__cell dt {
	font-size: 0.625rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--admin-text-muted);
}

.admin-drawer-grid__cell dd {
	margin: 3px 0 0;
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--admin-text-primary);
	word-break: break-word;
}

.admin-drawer-grid__mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	font-size: 0.75rem;
}

/* Form */
.admin-drawer-form {
	display: flex;
	flex-direction: column;
	gap: 10px;
	padding: 12px;
	background: var(--admin-surface-muted);
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
}

.admin-drawer-field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.admin-drawer-field__label {
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--admin-text-muted);
}

.admin-drawer-field__control {
	height: var(--admin-button-height);
	padding: 0 12px;
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
	background: var(--admin-surface);
	color: var(--admin-text-primary);
	font-size: 0.875rem;
	font-weight: 600;
	cursor: pointer;
	transition: var(--admin-transition-fast);
}

.admin-drawer-field__control:focus-visible {
	outline: none;
	border-color: var(--admin-border-selected);
	box-shadow: var(--admin-focus-ring);
}

/* Toggle Pro */
.admin-drawer-toggle {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 4px;
	cursor: pointer;
}

.admin-drawer-toggle input {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: none;
}

.admin-drawer-toggle__track {
	position: relative;
	width: 36px;
	height: 20px;
	border-radius: 999px;
	background: var(--admin-border-hover);
	flex-shrink: 0;
	transition: background var(--sf-t1) var(--sf-ease);
}

.admin-drawer-toggle__thumb {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 16px;
	height: 16px;
	border-radius: 999px;
	background: #fff;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	transition: transform var(--sf-t1) var(--sf-ease);
}

.admin-drawer-toggle input:checked + .admin-drawer-toggle__track {
	background: var(--admin-status-success);
}

.admin-drawer-toggle input:checked + .admin-drawer-toggle__track .admin-drawer-toggle__thumb {
	transform: translateX(16px);
}

.admin-drawer-toggle__label {
	font-size: 0.8125rem;
	font-weight: 600;
	color: var(--admin-text-primary);
}

.admin-drawer-save {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-height: var(--admin-button-height);
	padding: 0 14px;
	border-radius: var(--admin-radius-sm);
	border: 1px solid var(--admin-status-success);
	background: var(--admin-status-success);
	color: var(--admin-text-on-brand);
	font-size: 0.8125rem;
	font-weight: 700;
	cursor: pointer;
	transition: var(--admin-transition-fast);
}

.admin-drawer-save:hover:not(:disabled) {
	background: var(--color-brand-primary-hover, #074a56);
	border-color: var(--color-brand-primary-hover, #074a56);
}

.admin-drawer-save:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* Tabs */
.admin-drawer-tabs {
	display: flex;
	gap: 4px;
	padding: 4px;
	background: var(--admin-surface-muted);
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-pill);
}

.admin-drawer-tab {
	flex: 1;
	padding: 8px 10px;
	border-radius: var(--admin-radius-pill);
	background: transparent;
	border: none;
	color: var(--admin-text-secondary);
	font-size: 0.75rem;
	font-weight: 700;
	cursor: pointer;
	transition: var(--admin-transition-fast);
}

.admin-drawer-tab:hover {
	color: var(--admin-text-primary);
}

.admin-drawer-tab--active {
	background: var(--admin-surface);
	color: var(--admin-status-success-text);
	box-shadow: var(--admin-shadow-sm);
}

.admin-drawer-tabpanel {
	margin-top: 8px;
}

/* Lists */
.admin-drawer-list {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.admin-drawer-list__item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
	padding: 10px 12px;
	background: var(--admin-surface-muted);
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
}

.admin-drawer-list__main {
	min-width: 0;
}

.admin-drawer-list__title {
	margin: 0;
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--admin-text-primary);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 280px;
}

.admin-drawer-list__meta {
	margin: 2px 0 0;
	font-size: 0.6875rem;
	color: var(--admin-text-muted);
}

.admin-drawer-list__value {
	font-size: 0.8125rem;
	font-weight: 700;
	color: var(--admin-status-success-text);
	font-variant-numeric: tabular-nums;
}

.admin-drawer-list__value--neg {
	color: var(--admin-status-danger-text, #b91c1c);
}

.admin-drawer-empty {
	padding: 24px;
	text-align: center;
	color: var(--admin-text-muted);
	font-size: 0.8125rem;
	background: var(--admin-surface-muted);
	border: 1px dashed var(--admin-border);
	border-radius: var(--admin-radius-sm);
}

.admin-drawer-empty--lg {
	padding: 60px 24px;
}

/* Actions */
.admin-drawer-actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
}

.admin-drawer-action {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	min-height: var(--admin-button-height);
	padding: 0 12px;
	border-radius: var(--admin-radius-sm);
	border: 1px solid var(--admin-border);
	background: var(--admin-surface);
	color: var(--admin-text-primary);
	font-size: 0.8125rem;
	font-weight: 700;
	cursor: pointer;
	transition: var(--admin-transition-fast);
}

.admin-drawer-action:hover:not(:disabled) {
	background: var(--admin-surface-hover);
	border-color: var(--admin-border-selected);
}

.admin-drawer-action--danger {
	color: var(--admin-status-danger-text, #b91c1c);
	border-color: rgba(220, 38, 38, 0.32);
}

.admin-drawer-action--danger:hover:not(:disabled) {
	background: var(--admin-status-danger-bg, rgba(220, 38, 38, 0.08));
	border-color: var(--admin-status-danger, #dc2626);
}

.admin-drawer-action--success {
	background: var(--admin-status-success);
	color: var(--admin-text-on-brand);
	border-color: var(--admin-status-success);
}

.admin-drawer-action--success:hover:not(:disabled) {
	background: var(--color-brand-primary-hover, #074a56);
}

.admin-drawer-action--accent {
	background: var(--color-brand-accent, #E44203);
	color: #fff;
	border-color: var(--color-brand-accent, #E44203);
}

.admin-drawer-action--accent:hover:not(:disabled) {
	filter: brightness(0.95);
}

.admin-drawer-action:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

/* Email modal */
.admin-drawer-email-modal {
	padding: 20px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.admin-drawer-email-modal__title {
	margin: 0;
	font-size: 1rem;
	font-weight: 800;
	color: var(--admin-text-primary);
}

.admin-drawer-email-modal__desc {
	margin: 0;
	font-size: 0.8125rem;
	color: var(--admin-text-secondary);
}

.admin-drawer-email-modal__input {
	height: var(--admin-button-height);
	padding: 0 12px;
	border: 1px solid var(--admin-border);
	border-radius: var(--admin-radius-sm);
	background: var(--admin-surface);
	color: var(--admin-text-primary);
	font-size: 0.875rem;
}

.admin-drawer-email-modal__input:focus-visible {
	outline: none;
	border-color: var(--admin-border-selected);
	box-shadow: var(--admin-focus-ring);
}

.admin-drawer-email-modal__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

@media (max-width: 540px) {
	.admin-drawer {
		width: 100vw;
	}

	.admin-drawer-actions {
		grid-template-columns: 1fr;
	}
}
</style>
