<script setup>
defineProps({
	email: { type: String, required: true },
	verificationCode: { type: Array, required: true },
	verificationCodeHint: { type: String, default: null },
	verificationError: { type: String, default: '' },
	verificationSuccess: { type: String, default: '' },
	verificationLoading: { type: Boolean, default: false },
})

const emit = defineEmits([
	'input',
	'keydown',
	'paste',
	'verify',
	'resend',
	'back',
])
</script>

<template>
	<div class="auth-overlay-form auth-overlay-form--verification auth-page-verify">
		<div class="auth-page-verify__head">
			<div class="auth-page-verify__icon" aria-hidden="true">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			</div>
			<div class="auth-page-verify__copy">
				<h3 class="auth-panel-title">Verifica il tuo account</h3>
				<p class="auth-panel-copy">Inserisci il codice a 6 cifre per verificare <strong>{{ email }}</strong>.</p>
			</div>
			<div v-if="verificationCodeHint" class="auth-feedback auth-feedback--muted auth-page-verify__hint">
				<p class="auth-panel-copy">Il tuo codice di verifica</p>
				<p class="auth-page-verify__hint-code">{{ verificationCodeHint }}</p>
			</div>
		</div>
		<div class="auth-page-verify__digits" @paste="emit('paste', $event)">
			<input
				v-for="(digit, index) in verificationCode"
				:key="index"
				type="text"
				maxlength="1"
				inputmode="numeric"
				:value="verificationCode[index]"
				@input="emit('input', index, $event)"
				@keydown="emit('keydown', index, $event)"
				class="verification-digit"
			/>
		</div>
		<p v-if="verificationError" class="auth-feedback auth-feedback--error text-center">{{ verificationError }}</p>
		<p v-if="verificationSuccess" class="auth-feedback auth-feedback--success text-center">{{ verificationSuccess }}</p>
			<button
				type="button"
				@click="emit('verify')"
				:disabled="verificationLoading"
				:class="['btn-cta', 'btn-compact', 'w-full', 'inline-flex', 'items-center', 'justify-center', 'gap-[8px]', verificationLoading ? 'opacity-70 cursor-not-allowed' : '']">
				<span v-if="verificationLoading">Verifica in corso...</span>
				<span v-else>Verifica Account</span>
			</button>
		<div class="auth-page-verify__actions">
			<button type="button" @click="emit('resend')" :disabled="verificationLoading" class="auth-text-link">Invia nuovo codice</button>
			<button type="button" @click="emit('back')" class="auth-text-link auth-text-link--muted">Torna al login</button>
		</div>
	</div>
</template>
