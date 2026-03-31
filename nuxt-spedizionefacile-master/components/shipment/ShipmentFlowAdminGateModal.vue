<script setup>
const { challenge, closeGate } = useShipmentFlowAdminGate();
const route = useRoute();
const sanctumClient = useSanctumClient();
const uiFeedback = useUiFeedback();

const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

const isOpen = computed(() => Boolean(challenge.value));

const resetState = () => {
	password.value = '';
	errorMessage.value = '';
	isSubmitting.value = false;
};

const handleCancel = async () => {
	const fallback = challenge.value?.lastValidRoute || '/preventivo';
	closeGate();
	resetState();
	if (route.fullPath !== fallback) {
		await navigateTo(fallback, { replace: true });
	}
};

const handleConfirm = async () => {
	if (isSubmitting.value) return;
	if (!String(password.value || '').trim()) {
		errorMessage.value = 'Inserisci la password amministratore per continuare.';
		return;
	}

	isSubmitting.value = true;
	errorMessage.value = '';

	try {
		await sanctumClient('/api/auth/confirm-password', {
			method: 'POST',
			body: { password: password.value },
		});
		uiFeedback.success('Conferma amministratore acquisita', 'Puoi proseguire nel flusso fuori percorso.');
		closeGate();
		resetState();
	} catch (error) {
		errorMessage.value = error?.data?.errors?.password?.[0]
			|| error?.data?.message
			|| 'Password non corretta. Riprova per continuare.';
	} finally {
		isSubmitting.value = false;
	}
};

watch(isOpen, (open) => {
	if (!open) resetState();
});

watch(() => route.fullPath, (currentPath) => {
	if (!challenge.value) return;
	if (challenge.value.targetPath === currentPath) return;
	closeGate();
	resetState();
});

const modalUi = {
	overlay: 'bg-[#09131c]/35 backdrop-blur-[6px]',
	content: '!ring-0 !divide-y-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),34rem)] mx-auto',
	body: '!p-0',
};
</script>

<template>
	<UModal
		:open="isOpen"
		:dismissible="false"
		:close="false"
		:ui="modalUi"
		@update:open="(value) => { if (!value) handleCancel(); }">
		<template #body>
			<section class="admin-flow-gate sf-modal-content">
				<div class="admin-flow-gate__header sf-modal-header">
					<div class="sf-modal-header__main">
						<div class="admin-flow-gate__icon sf-modal-icon" aria-hidden="true">!</div>
						<div>
							<h2 class="admin-flow-gate__title sf-modal-title">Accesso admin fuori flusso</h2>
							<p class="admin-flow-gate__description sf-modal-description">
							Stai aprendo una sezione del funnel senza il percorso normale. Per motivi di sicurezza,
							conferma la password amministratore prima di continuare.
							</p>
						</div>
					</div>
				</div>

				<div class="sf-modal-divider" />

				<div class="admin-flow-gate__summary sf-modal-summary">
					<div>
						<span class="admin-flow-gate__label">Percorso richiesto</span>
						<strong>{{ challenge?.targetPath }}</strong>
					</div>
					<div>
						<span class="admin-flow-gate__label">Fallback sicuro</span>
						<strong>{{ challenge?.lastValidRoute }}</strong>
					</div>
				</div>

				<div class="admin-flow-gate__field sf-modal-body">
					<label for="admin-flow-password" class="admin-flow-gate__field-label">Password amministratore</label>
					<input
						id="admin-flow-password"
						v-model="password"
						type="password"
						class="admin-flow-gate__input"
						autocomplete="current-password"
						placeholder="Inserisci la password per continuare"
						@keyup.enter="handleConfirm" />
					<p v-if="errorMessage" class="admin-flow-gate__error">{{ errorMessage }}</p>
				</div>

				<div class="admin-flow-gate__actions sf-modal-actions">
					<button type="button" class="admin-flow-gate__button admin-flow-gate__button--ghost btn-secondary" @click="handleCancel">
						Torna al flusso corretto
					</button>
					<button type="button" class="admin-flow-gate__button admin-flow-gate__button--primary btn-primary" :disabled="isSubmitting" @click="handleConfirm">
						{{ isSubmitting ? 'Verifica in corso…' : 'Continua come admin' }}
					</button>
				</div>
			</section>
		</template>
	</UModal>
</template>

<style scoped>
.admin-flow-gate {
	display: grid;
	gap: 18px;
	padding: 0;
}

.admin-flow-gate__header {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 14px;
	align-items: start;
}

.admin-flow-gate__icon {
	background: linear-gradient(135deg, #0d6b79 0%, #095866 100%);
	color: #fff;
	font-size: 1.125rem;
	font-weight: 800;
}

.admin-flow-gate__title {
	line-height: 1.1;
}

.admin-flow-gate__description {
	margin-top: 6px;
}

.admin-flow-gate__summary {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.admin-flow-gate__label {
	display: block;
	margin-bottom: 4px;
	font-size: 0.72rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: #6b7d87;
}

.admin-flow-gate__field {
	display: grid;
	gap: 8px;
}

.admin-flow-gate__field-label {
	font-size: 0.92rem;
	font-weight: 700;
	color: #1c2740;
}

.admin-flow-gate__input {
	width: 100%;
	min-height: 52px;
	padding: 0 16px;
	border-radius: 16px;
	border: 1px solid #dbe5ea;
	background: #fff;
	font-size: 1rem;
	color: #1c2740;
	outline: none;
	transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.admin-flow-gate__input:focus {
	border-color: #0d6b79;
	box-shadow: inset 0 0 0 1px rgba(13, 107, 121, 0.2);
}

.admin-flow-gate__error {
	font-size: 0.85rem;
	font-weight: 600;
	color: #b42318;
}

.admin-flow-gate__actions {
	gap: 12px;
}

.admin-flow-gate__button {
	min-height: 46px;
	padding: 0 18px;
	font-weight: 700;
}

.admin-flow-gate__button--primary:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

@media (max-width: 640px) {
	.admin-flow-gate {
		padding: 18px;
		gap: 16px;
	}

	.admin-flow-gate__summary {
		grid-template-columns: 1fr;
	}

	.admin-flow-gate__actions {
		flex-direction: column-reverse;
	}

	.admin-flow-gate__button {
		width: 100%;
	}
}
</style>
