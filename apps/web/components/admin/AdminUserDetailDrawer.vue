<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
	open: { type: Boolean, default: false },
	userId: { type: [Number, String, null], default: null },
	canMaster: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open', 'updated', 'impersonate']);

const { formatDate, formatPrice } = useAdmin();

const {
	loading,
	saving,
	user,
	orders,
	addresses,
	walletTx,
	auditLog,
	form,
	isBanned,
	fetchDetail,
	saveProfile,
	resetPassword,
	toggleBan,
	changeEmail,
	impersonate,
} = useAdminUserDetail(emit);

const activeTab = ref('orders');

const showBanConfirm = ref(false);
const showResetConfirm = ref(false);
const showEmailModal = ref(false);
const showImpersonateConfirm = ref(false);
const newEmail = ref('');

const fullName = computed(() => user.value
	? `${user.value.name || ''} ${user.value.surname || ''}`.trim()
	: '');

const tabs = [
	{ key: 'orders', label: 'Ordini' },
	{ key: 'addresses', label: 'Indirizzi' },
	{ key: 'wallet', label: 'Wallet' },
	{ key: 'audit', label: 'Audit log' },
];

/* Wallet tx amount in cents -> euros (fallback se formatPrice non disponibile) */
const formatTxAmount = (cents) => {
	if (typeof formatPrice === 'function') return formatPrice(cents);
	const n = Number(cents) / 100;
	return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
};

watch(() => [props.open, props.userId], ([isOpen, id]) => {
	if (isOpen && id) {
		activeTab.value = 'orders';
		fetchDetail(id);
	}
});

const close = () => emit('update:open', false);

const askResetPassword = () => { showResetConfirm.value = true; };
const doResetPassword = async () => {
	const ok = await resetPassword();
	if (ok) showResetConfirm.value = false;
};

const askBan = () => { showBanConfirm.value = true; };
const doBanToggle = async () => {
	const ok = await toggleBan();
	if (ok) showBanConfirm.value = false;
};

const askChangeEmail = () => {
	newEmail.value = user.value?.email || '';
	showEmailModal.value = true;
};
const doChangeEmail = async () => {
	const ok = await changeEmail(newEmail.value);
	if (ok) showEmailModal.value = false;
};

const askImpersonate = () => { showImpersonateConfirm.value = true; };
const doImpersonate = async () => {
	const ok = await impersonate();
	if (ok) showImpersonateConfirm.value = false;
};
</script>

<template>
	<Teleport to="body">
		<Transition name="drawer-fade">
			<div v-if="open" class="admin-drawer-overlay" @click.self="close">
				<aside class="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
					<UserDetailHeader :user="user" @close="close" />

					<div class="admin-drawer__body">
						<div v-if="loading" class="admin-drawer__loading">
							<div class="admin-drawer__spinner" aria-hidden="true" />
							<p>Caricamento dettaglio in corso...</p>
						</div>

						<template v-else-if="user">
							<UserDetailProfileSection :user="user" :format-date="formatDate" />

							<UserDetailPermissionsForm v-model="form" :saving="saving" @save="saveProfile" />

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

								<UserDetailTabOrders
									v-if="activeTab === 'orders'"
									:orders="orders"
									:format-date="formatDate"
									:format-price="formatTxAmount" />

								<UserDetailTabAddresses
									v-if="activeTab === 'addresses'"
									:addresses="addresses" />

								<UserDetailTabWallet
									v-if="activeTab === 'wallet'"
									:transactions="walletTx"
									:format-date="formatDate"
									:format-price="formatTxAmount" />

								<UserDetailTabAuditLog
									v-if="activeTab === 'audit'"
									:events="auditLog"
									:format-date="formatDate" />
							</section>

							<UserDetailActionsMenu
								:is-banned="isBanned"
								:can-master="canMaster"
								@reset-password="askResetPassword"
								@toggle-ban="askBan"
								@change-email="askChangeEmail"
								@impersonate="askImpersonate" />
						</template>

						<div v-else class="admin-drawer-empty admin-drawer-empty--lg">
							Impossibile caricare l'utente.
						</div>
					</div>
				</aside>
			</div>
		</Transition>
	</Teleport>

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

	<UserDetailChangeEmailModal
		v-if="canMaster"
		v-model:open="showEmailModal"
		v-model:email="newEmail"
		:full-name="fullName"
		:saving="saving"
		@confirm="doChangeEmail" />
</template>

<style scoped>
/* Shell del drawer dettaglio utente: overlay, transizione, body container,
 * tabs strip e stati globali (loading, empty). Le sezioni interne hanno
 * i propri scoped style nei sub-componenti in components/admin/user-detail/. */
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

.admin-drawer-section {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

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

@media (max-width: 540px) {
	.admin-drawer {
		width: 100vw;
	}
}
</style>
