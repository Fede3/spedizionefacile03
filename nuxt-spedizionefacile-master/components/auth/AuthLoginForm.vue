<script setup>
const props = defineProps({
	credentials: { type: Object, required: true },
	isLoading: { type: Boolean, default: false },
	showLoginPassword: { type: Boolean, default: false },
	messageError: { type: Object, default: null },
	messageLoading: { type: String, default: null },
	showResendVerification: { type: Boolean, default: false },
	resendLoading: { type: Boolean, default: false },
	resendMessage: { type: Object, default: null },
	submitHandler: { type: Function, default: null },
})

const emit = defineEmits([
	'update:showLoginPassword',
	'resend-verification',
])

const submitLogin = () => {
	props.submitHandler?.()
}
</script>

<template>
	<div>
		<div v-if="showResendVerification" class="auth-feedback auth-feedback--muted">
			<p class="auth-panel-copy auth-login-resend__copy">Email non confermata. Ti reinviamo subito una nuova email di verifica.</p>
			<button
				type="button"
				@click="emit('resend-verification')"
				:disabled="resendLoading"
				class="btn-secondary btn-compact inline-flex items-center justify-center">
				{{ resendLoading ? 'Invio in corso...' : 'Invia nuova email di conferma' }}
			</button>
			<p v-if="resendMessage" class="auth-feedback" :class="resendMessage.type === 'success' ? 'auth-feedback--success' : 'auth-feedback--error'">
				{{ resendMessage.text }}
			</p>
		</div>

		<form
			method="post"
			@submit.prevent="submitLogin"
			class="auth-overlay-form auth-page-form">
			<div class="auth-field-group">
				<label for="login_email" class="auth-field-label">Email</label>
				<div class="auth-input-wrap">
					<span class="auth-input-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="5" width="18" height="14" rx="2"/>
							<path d="m4 7 8 6 8-6"/>
						</svg>
					</span>
					<input
						type="email"
						id="login_email"
						name="email"
						v-model="credentials.email"
						placeholder="nome@email.com"
						autocomplete="username"
						class="form-input auth-field-input--with-icon"
						required />
				</div>
			</div>

			<div class="auth-field-group">
				<label for="login_password" class="auth-field-label">Password</label>
				<div class="auth-password-wrap auth-input-wrap">
					<span class="auth-input-icon" aria-hidden="true">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
							<rect x="4" y="11" width="16" height="9" rx="2"/>
							<path d="M8 11V8a4 4 0 1 1 8 0v3"/>
						</svg>
					</span>
					<input
						:type="showLoginPassword ? 'text' : 'password'"
						id="login_password"
						name="password"
						v-model="credentials.password"
						placeholder="••••••••"
						autocomplete="current-password"
						class="form-input auth-field-input--password auth-field-input--with-icon"
						required />
					<button type="button" @click="emit('update:showLoginPassword', !showLoginPassword)" class="auth-password-toggle" tabindex="-1">
						<svg v-if="!showLoginPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
					</button>
				</div>
			</div>

			<p v-if="messageError?.email" role="alert" class="auth-feedback auth-feedback--error">
				{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
			</p>

			<p v-if="messageError?.message" role="alert" class="auth-feedback auth-feedback--error">
				{{ messageError.message }}
			</p>

			<div class="auth-login-actions">
				<NuxtLink to="/recupera-password" class="auth-text-link">Password dimenticata?</NuxtLink>
			</div>

			<button
				type="submit"
				:disabled="isLoading"
				:class="['btn-cta', 'btn-compact', 'w-full', 'inline-flex', 'items-center', 'justify-center', 'gap-[8px]', isLoading ? 'opacity-70 cursor-not-allowed' : '']">
				<span v-if="isLoading">Accesso in corso...</span>
				<span v-else class="inline-flex items-center justify-center gap-[8px]">
					<span>Accedi</span>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 12h14"/>
						<path d="m13 5 7 7-7 7"/>
					</svg>
				</span>
			</button>

			<p v-if="messageLoading" class="auth-login-status">
				{{ messageLoading }}
			</p>
		</form>
	</div>
</template>
