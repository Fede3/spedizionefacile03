<script setup>
const props = defineProps({
	registerForm: { type: Object, required: true },
	isLoading: { type: Boolean, default: false },
	showRegPassword: { type: Boolean, default: false },
	showRegPasswordConfirm: { type: Boolean, default: false },
	messageError: { type: Object, default: null },
	messageLoading: { type: String, default: null },
	passwordChecks: { type: Object, required: true },
	passwordStrength: { type: Number, default: 0 },
	submitHandler: { type: Function, default: null },
})

const emit = defineEmits([
	'update:showRegPassword',
	'update:showRegPasswordConfirm',
])

const submitRegister = () => {
	props.submitHandler?.()
}

const getPasswordMeterClass = (index) => {
	if (!props.registerForm.password || props.passwordStrength < index) {
		return 'auth-password-meter__bar'
	}

	if (props.passwordStrength <= 2) return 'auth-password-meter__bar auth-password-meter__bar--weak'
	if (props.passwordStrength <= 3) return 'auth-password-meter__bar auth-password-meter__bar--medium'
	return 'auth-password-meter__bar auth-password-meter__bar--strong'
}

const getPasswordCheckClass = (passed) => (
	passed ? 'auth-password-checklist__item auth-password-checklist__item--good' : 'auth-password-checklist__item'
)

const getPasswordCheckMark = (passed) => (passed ? '✓' : '•')
</script>

<template>
	<form method="post" @submit.prevent="submitRegister" class="auth-overlay-form auth-page-form">
		<fieldset class="auth-choice-group">
			<legend class="auth-choice-group__label">Profilo</legend>
			<div class="auth-segmented-row auth-register-segmented--role" role="radiogroup" aria-label="Ruolo account">
				<label
					:class="[
						'auth-segment',
						registerForm.role === 'Cliente'
							? 'auth-segment--active'
							: '',
					]">
					<input type="radio" value="Cliente" v-model="registerForm.role" class="sr-only" />
					Cliente
				</label>
				<label
					:class="[
						'auth-segment',
						registerForm.role === 'Partner Pro'
							? 'auth-segment--active'
							: '',
					]">
					<input type="radio" value="Partner Pro" v-model="registerForm.role" class="sr-only" />
					Partner Pro
				</label>
			</div>
		</fieldset>

		<fieldset class="auth-choice-group">
			<legend class="auth-choice-group__label">Tipo account</legend>
			<div class="auth-segmented-row" role="radiogroup" aria-label="Tipo account">
				<label
					:class="[
						'auth-segment',
						registerForm.user_type === 'privato'
							? 'auth-segment--active'
							: '',
					]">
					<input type="radio" value="privato" v-model="registerForm.user_type" class="sr-only" />
					Privato
				</label>
				<label
					:class="[
						'auth-segment',
						registerForm.user_type === 'commerciante'
							? 'auth-segment--active'
							: '',
					]">
					<input type="radio" value="commerciante" v-model="registerForm.user_type" class="sr-only" />
					Azienda
				</label>
			</div>
		</fieldset>

		<div class="auth-grid-two">
					<div class="auth-field-group">
						<label for="reg_name" class="auth-field-label">Nome *</label>
						<input
							type="text"
							id="reg_name"
							v-model="registerForm.name"
							placeholder="Il tuo nome"
							autocomplete="given-name"
							class="form-input"
							required />
					</div>
			<div class="auth-field-group">
				<label for="reg_surname" class="auth-field-label">Cognome *</label>
						<input
							type="text"
							id="reg_surname"
							v-model="registerForm.surname"
							placeholder="Il tuo cognome"
							autocomplete="family-name"
							class="form-input"
							required />
			</div>
		</div>

		<p v-if="messageError?.name" role="alert" class="auth-feedback auth-feedback--error">{{ messageError.name[0] }}</p>
		<p v-if="messageError?.surname" role="alert" class="auth-feedback auth-feedback--error">{{ messageError.surname[0] }}</p>

		<div class="auth-field-group">
			<label for="reg_telephone" class="auth-field-label">Telefono *</label>
			<div class="auth-grid-phone">
					<select v-model="registerForm.prefix" id="reg_prefix" class="form-input auth-field-select" autocomplete="tel-country-code">
					<option value="+39">+39 IT</option>
					<option value="+49">+49 DE</option>
				</select>
				<input
						type="tel"
						id="reg_telephone"
						placeholder="Numero di telefono"
						v-model="registerForm.telephone_number"
						autocomplete="tel-national"
						class="form-input"
						required />
			</div>
		</div>

		<p v-if="messageError?.telephone_number" role="alert" class="auth-feedback auth-feedback--error">{{ messageError.telephone_number[0] }}</p>

		<div class="auth-field-group">
			<label for="reg_email" class="auth-field-label">Email *</label>
					<input
						type="email"
						id="reg_email"
						placeholder="La tua email"
						v-model="registerForm.email"
						autocomplete="email"
						class="form-input"
						required />
		</div>

		<div class="auth-field-group">
			<label for="reg_email_confirmation" class="auth-field-label">Conferma email *</label>
					<input
						type="email"
						id="reg_email_confirmation"
						placeholder="Conferma la tua email"
						v-model="registerForm.email_confirmation"
						autocomplete="email"
						class="form-input"
						required />
		</div>

		<p v-if="messageError?.email" role="alert" class="auth-feedback auth-feedback--error">
			{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
		</p>

		<div class="auth-field-group">
			<label for="reg_password" class="auth-field-label">Password *</label>
			<div class="auth-password-wrap">
						<input
							:type="showRegPassword ? 'text' : 'password'"
							id="reg_password"
							placeholder="Minimo 8 caratteri"
							v-model="registerForm.password"
							autocomplete="new-password"
							class="form-input auth-field-input--password"
							minlength="8"
							required />
				<button type="button" @click="emit('update:showRegPassword', !showRegPassword)" class="auth-password-toggle" tabindex="-1">
					<svg v-if="!showRegPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
					<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
				</button>
			</div>
			<div v-if="registerForm.password" class="auth-password-meter" aria-hidden="true">
				<div v-for="i in 5" :key="i" :class="getPasswordMeterClass(i)" />
			</div>
			<ul v-if="registerForm.password" class="auth-password-checklist">
				<li :class="getPasswordCheckClass(passwordChecks.minLength)">
					<span>{{ getPasswordCheckMark(passwordChecks.minLength) }}</span> Minimo 8 caratteri
				</li>
				<li :class="getPasswordCheckClass(passwordChecks.hasLower)">
					<span>{{ getPasswordCheckMark(passwordChecks.hasLower) }}</span> Una lettera minuscola
				</li>
				<li :class="getPasswordCheckClass(passwordChecks.hasUpper)">
					<span>{{ getPasswordCheckMark(passwordChecks.hasUpper) }}</span> Una lettera maiuscola
				</li>
				<li :class="getPasswordCheckClass(passwordChecks.hasNumber)">
					<span>{{ getPasswordCheckMark(passwordChecks.hasNumber) }}</span> Un numero
				</li>
				<li :class="getPasswordCheckClass(passwordChecks.hasSymbol)">
					<span>{{ getPasswordCheckMark(passwordChecks.hasSymbol) }}</span> Un simbolo speciale (es. @!#.-_)
				</li>
			</ul>
		</div>

		<div class="auth-field-group">
			<label for="reg_password_confirmation" class="auth-field-label">Conferma password *</label>
			<div class="auth-password-wrap">
						<input
							:type="showRegPasswordConfirm ? 'text' : 'password'"
							id="reg_password_confirmation"
							placeholder="Ripeti la password"
							v-model="registerForm.password_confirmation"
							autocomplete="new-password"
							class="form-input auth-field-input--password"
							minlength="8"
							required />
				<button type="button" @click="emit('update:showRegPasswordConfirm', !showRegPasswordConfirm)" class="auth-password-toggle" tabindex="-1">
					<svg v-if="!showRegPasswordConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
					<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
				</button>
			</div>
		</div>

		<p v-if="messageError?.password" role="alert" class="auth-feedback auth-feedback--error">
			<span v-for="(error, index) in messageError.password" :key="index" class="block">
				{{ error }}
			</span>
		</p>

		<div v-if="registerForm.referred_by" class="auth-feedback auth-feedback--success">
			<p class="font-semibold">Codice referral applicato: <strong>{{ registerForm.referred_by }}</strong></p>
			<p>Riceverai uno sconto del 5% su tutte le spedizioni.</p>
		</div>
		<p v-if="messageError?.referred_by" role="alert" class="auth-feedback auth-feedback--error">{{ messageError.referred_by[0] }}</p>

			<button
				type="submit"
				:disabled="isLoading"
				:class="['btn-cta', 'btn-compact', 'w-full', 'inline-flex', 'items-center', 'justify-center', 'gap-[8px]', isLoading ? 'opacity-70 cursor-not-allowed' : '']">
				<span v-if="isLoading">Registrazione in corso...</span>
				<span v-else>Registrati e continua</span>
			</button>

		<p v-if="messageLoading" class="auth-login-status">
			{{ messageLoading }}
		</p>
	</form>
</template>
