<!--
  FILE: components/cart/CartAuthModal.vue
  SCOPO: Modal login/registrazione inline per checkout da carrello (guest).
  Usa direttamente i ref del composable useCarrello passati come props.
-->
<script setup>
defineProps({
	open: { type: Boolean, default: false },
	tab: { type: String, default: 'login' },
	loading: { type: Boolean, default: false },
	error: { type: String, default: '' },
	success: { type: String, default: '' },
	redirectPath: { type: String, default: '/checkout' },
	loginForm: { type: Object, required: true },
	registerForm: { type: Object, required: true },
});

const emit = defineEmits(['update:open', 'update:tab', 'login', 'register', 'clear-messages']);

const switchTab = (newTab) => {
	emit('update:tab', newTab);
	emit('clear-messages');
};
</script>

<template>
	<UModal
		:open="open"
		:dismissible="!loading"
		:close="false"
		:ui="{
			overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]',
			content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),40rem)]',
			header: '!p-0',
			body: '!p-0',
			footer: '!p-0',
		}"
		@update:open="emit('update:open', $event)">
		<template #body>
			<section class="sf-modal-content">
				<div class="sf-modal-header">
					<div class="sf-modal-header__main">
						<div class="sf-modal-icon" aria-hidden="true">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="w-[18px] h-[18px]"
								fill="none"
								stroke="currentColor"
								stroke-width="1.9"
								stroke-linecap="round"
								stroke-linejoin="round">
								<path d="M3 6h19l-2 8H8L6 4H3" />
								<circle cx="10" cy="19" r="1.6" />
								<circle cx="18" cy="19" r="1.6" />
							</svg>
						</div>
						<div>
							<span class="sf-section-kicker">Checkout</span>
							<h3 class="sf-modal-title">Continua senza perdere il carrello</h3>
							<p class="sf-modal-description">Accedi o registrati qui e prosegui direttamente al pagamento appena l’account è pronto.</p>
						</div>
					</div>
				</div>

				<div class="sf-modal-divider" />

				<div class="sf-modal-body">
					<div class="inline-flex rounded-[12px] bg-[#F2F4F5] p-[4px]">
						<button
							type="button"
							class="px-[14px] py-[8px] rounded-[10px] text-[0.8125rem] font-semibold transition cursor-pointer"
							:class="tab === 'login' ? 'bg-white text-[var(--color-brand-text)] shadow-sm' : 'text-[var(--color-brand-text-secondary)]'"
							@click="switchTab('login')">
							Accedi
						</button>
						<button
							type="button"
							class="px-[14px] py-[8px] rounded-[10px] text-[0.8125rem] font-semibold transition cursor-pointer"
							:class="tab === 'register' ? 'bg-white text-[var(--color-brand-text)] shadow-sm' : 'text-[var(--color-brand-text-secondary)]'"
							@click="switchTab('register')">
							Registrati
						</button>
					</div>

					<div v-if="tab === 'login'" class="grid gap-[12px]">
						<div>
							<label class="form-label">Email</label>
							<input v-model="loginForm.email" type="email" autocomplete="email" class="form-input" />
						</div>
						<div>
							<label class="form-label">Password</label>
							<input v-model="loginForm.password" type="password" autocomplete="current-password" class="form-input" />
						</div>
					</div>

					<div v-else class="grid gap-[12px]">
						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
							<div>
								<label class="form-label">Nome</label>
								<input v-model="registerForm.name" type="text" autocomplete="given-name" class="form-input" />
							</div>
							<div>
								<label class="form-label">Cognome</label>
								<input v-model="registerForm.surname" type="text" autocomplete="family-name" class="form-input" />
							</div>
						</div>

						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
							<div>
								<label class="form-label">Email</label>
								<input v-model="registerForm.email" type="email" autocomplete="email" class="form-input" />
							</div>
							<div>
								<label class="form-label">Conferma email</label>
								<input v-model="registerForm.email_confirmation" type="email" autocomplete="email" class="form-input" />
							</div>
						</div>

						<div class="grid grid-cols-1 tablet:grid-cols-[120px_1fr] gap-[10px]">
							<div>
								<label class="form-label">Prefisso</label>
								<input v-model="registerForm.prefix" type="text" class="form-input" />
							</div>
							<div>
								<label class="form-label">Telefono</label>
								<input v-model="registerForm.telephone_number" type="tel" autocomplete="tel" class="form-input" />
							</div>
						</div>

						<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[10px]">
							<div>
								<label class="form-label">Password</label>
								<input v-model="registerForm.password" type="password" autocomplete="new-password" class="form-input" />
							</div>
							<div>
								<label class="form-label">Conferma password</label>
								<input v-model="registerForm.password_confirmation" type="password" autocomplete="new-password" class="form-input" />
							</div>
						</div>
					</div>

					<div v-if="error" class="ux-alert ux-alert--critical">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon" fill="currentColor" aria-hidden="true">
							<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
						</svg>
						<div>{{ error }}</div>
					</div>

					<div v-if="success" class="ux-alert ux-alert--success">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon" fill="currentColor" aria-hidden="true">
							<path
								d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
						</svg>
						<div>{{ success }}</div>
					</div>

					<div v-if="error && error.toLowerCase().includes('verific')" class="text-[0.8125rem]">
						<NuxtLink
							:to="`/autenticazione?redirect=${encodeURIComponent(redirectPath)}`"
							class="text-[var(--color-brand-primary)] font-semibold hover:underline cursor-pointer">
							Apri verifica account
						</NuxtLink>
					</div>
				</div>
				<div class="sf-modal-divider" />
				<div class="sf-modal-actions">
					<button type="button" class="btn-secondary btn-compact" :disabled="loading" @click="emit('update:open', false)">Annulla</button>
					<button v-if="tab === 'login'" type="button" class="btn-cta btn-compact" :disabled="loading" @click="emit('login')">
						{{ loading ? 'Accesso...' : 'Accedi e continua' }}
					</button>
					<button v-else type="button" class="btn-cta btn-compact" :disabled="loading" @click="emit('register')">
						{{ loading ? 'Registrazione...' : 'Registrati e continua' }}
					</button>
				</div>
			</section>
		</template>
	</UModal>
</template>
