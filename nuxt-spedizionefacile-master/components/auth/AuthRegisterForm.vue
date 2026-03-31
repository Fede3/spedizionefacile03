<script setup>
defineProps({
	registerForm: { type: Object, required: true },
	isLoading: { type: Boolean, default: false },
	showRegPassword: { type: Boolean, default: false },
	showRegPasswordConfirm: { type: Boolean, default: false },
	messageError: { type: Object, default: null },
	messageLoading: { type: String, default: null },
	passwordChecks: { type: Object, required: true },
	passwordStrength: { type: Number, default: 0 },
})

const emit = defineEmits([
	'submit',
	'update:showRegPassword',
	'update:showRegPasswordConfirm',
])
</script>

<template>
	<UForm :state="registerForm" @submit.prevent="emit('submit')">
		<!-- Role selector -->
		<div class="flex items-center gap-[12px] justify-center mb-[20px]">
			<label
				:class="[
					'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium',
					registerForm.role === 'Cliente'
						? 'bg-[#095866] text-white border-[#095866] shadow-sm'
						: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
				]">
				<input type="radio" value="Cliente" v-model="registerForm.role" class="sr-only" />
				Cliente
			</label>
			<label
				:class="[
					'flex items-center gap-[8px] px-[20px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium',
					registerForm.role === 'Partner Pro'
						? 'bg-[#095866] text-white border-[#095866] shadow-sm'
						: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
				]">
				<input type="radio" value="Partner Pro" v-model="registerForm.role" class="sr-only" />
				Partner Pro
			</label>
		</div>

		<div class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC]">
			<!-- Tipo account: Privato o Azienda -->
			<div class="flex items-center gap-[12px] mb-[20px]">
				<label
					:class="[
						'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium text-center',
						registerForm.user_type === 'privato'
							? 'bg-[#095866] text-white border-[#095866] shadow-sm'
							: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
					]">
					<input type="radio" value="privato" v-model="registerForm.user_type" class="sr-only" />
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>
					Privato
				</label>
				<label
					:class="[
						'flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[50px] cursor-pointer border transition-[background-color,color,border-color] text-[0.9375rem] font-medium text-center',
						registerForm.user_type === 'commerciante'
							? 'bg-[#095866] text-white border-[#095866] shadow-sm'
							: 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]',
					]">
					<input type="radio" value="commerciante" v-model="registerForm.user_type" class="sr-only" />
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M18,15H16V17H18M18,11H16V13H18M20,19H12V17H14V15H12V13H14V11H12V9H20M10,7H8V5H10M10,11H8V9H10M10,15H8V13H10M10,19H8V17H10M6,7H4V5H6M6,11H4V9H6M6,15H4V13H6M6,19H4V17H6M12,7V3H2V21H22V7H12Z"/></svg>
					Azienda
				</label>
			</div>

			<div class="grid grid-cols-1 mobile:grid-cols-2 gap-[12px] mb-[16px]">
				<div>
					<label for="reg_name" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Nome *</label>
					<input
						type="text"
						id="reg_name"
						v-model="registerForm.name"
						placeholder="Il tuo nome"
						class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						required />
				</div>
				<div>
					<label for="reg_surname" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Cognome *</label>
					<input
						type="text"
						id="reg_surname"
						v-model="registerForm.surname"
						placeholder="Il tuo cognome"
						class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						required />
				</div>
			</div>

			<p v-if="messageError?.name" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.name[0] }}</p>
			<p v-if="messageError?.surname" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.surname[0] }}</p>

			<div class="mb-[16px]">
				<label for="reg_telephone" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Telefono *</label>
				<div class="flex gap-[8px]">
					<select v-model="registerForm.prefix" id="reg_prefix" class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] text-[0.9375rem] w-[120px] focus:border-[#095866] focus:outline-none">
						<option value="+39">+39 IT</option>
						<option value="+49">+49 DE</option>
					</select>
					<input
						type="tel"
						id="reg_telephone"
						placeholder="Numero di telefono"
						v-model="registerForm.telephone_number"
						class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] flex-1 text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						required />
				</div>
			</div>

			<p v-if="messageError?.telephone_number" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.telephone_number[0] }}</p>

			<div class="mb-[16px]">
				<label for="reg_email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email *</label>
				<input
					type="email"
					id="reg_email"
					placeholder="La tua email"
					v-model="registerForm.email"
					class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
					required />
			</div>

			<div class="mb-[16px]">
				<label for="reg_email_confirmation" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Conferma Email *</label>
				<input
					type="email"
					id="reg_email_confirmation"
					placeholder="Conferma la tua email"
					v-model="registerForm.email_confirmation"
					class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
					required />
			</div>

			<p v-if="messageError?.email" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px] bg-red-50 p-[8px] rounded-[6px]">
				{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
			</p>

			<div class="mb-[16px]">
				<label for="reg_password" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Password *</label>
				<div class="relative">
					<input
						:type="showRegPassword ? 'text' : 'password'"
						id="reg_password"
						placeholder="Minimo 8 caratteri"
						v-model="registerForm.password"
						@change="registerForm.password = $event.target.value"
						autocomplete="new-password"
						class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						minlength="8"
						required />
					<button type="button" @click="emit('update:showRegPassword', !showRegPassword)" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
						<svg v-if="!showRegPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
					</button>
				</div>
				<!-- Password strength indicator -->
				<div v-if="registerForm.password" class="mt-[8px]">
					<div class="flex gap-[4px] mb-[6px]">
						<div v-for="i in 5" :key="i" class="h-[3px] flex-1 rounded-full transition-[background-color]" :class="passwordStrength >= i ? (passwordStrength <= 2 ? 'bg-red-400' : passwordStrength <= 3 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-[#E9EBEC]'"></div>
					</div>
					<ul class="space-y-[2px]">
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.minLength ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.minLength ? '\u2713' : '\u2022' }}</span> Minimo 8 caratteri
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasLower ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasLower ? '\u2713' : '\u2022' }}</span> Una lettera minuscola
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasUpper ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasUpper ? '\u2713' : '\u2022' }}</span> Una lettera maiuscola
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasNumber ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasNumber ? '\u2713' : '\u2022' }}</span> Un numero
						</li>
						<li class="text-[0.75rem] flex items-center gap-[4px]" :class="passwordChecks.hasSymbol ? 'text-emerald-600' : 'text-[#A0A5AB]'">
							<span>{{ passwordChecks.hasSymbol ? '\u2713' : '\u2022' }}</span> Un simbolo speciale (es. @!#.-_)
						</li>
					</ul>
				</div>
			</div>

			<div class="mb-[8px]">
				<label for="reg_password_confirmation" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Conferma Password *</label>
				<div class="relative">
					<input
						:type="showRegPasswordConfirm ? 'text' : 'password'"
						id="reg_password_confirmation"
						placeholder="Ripeti la password"
						v-model="registerForm.password_confirmation"
						@change="registerForm.password_confirmation = $event.target.value"
						autocomplete="new-password"
						class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						minlength="8"
						required />
					<button type="button" @click="emit('update:showRegPasswordConfirm', !showRegPasswordConfirm)" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
						<svg v-if="!showRegPasswordConfirm" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
					</button>
				</div>
			</div>

			<p v-if="messageError?.password" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px] bg-red-50 p-[8px] rounded-[6px]">
				<span v-for="(error, index) in messageError.password" :key="index" class="block">
					{{ error }}
				</span>
			</p>

			<!-- Referral code -->
			<div v-if="registerForm.referred_by" class="bg-emerald-50 border border-emerald-200 p-[12px] rounded-[12px] mt-[8px]">
				<p class="text-[0.8125rem] text-emerald-700 font-medium">Codice referral applicato: <strong>{{ registerForm.referred_by }}</strong></p>
				<p class="text-[0.75rem] text-emerald-600 mt-[4px]">Riceverai uno sconto del 5% su tutte le spedizioni!</p>
			</div>
			<p v-if="messageError?.referred_by" role="alert" class="text-red-500 text-[0.8125rem] mb-[8px]">{{ messageError.referred_by[0] }}</p>
		</div>

		<button
			type="submit"
			:disabled="isLoading"
			:class="[
				'w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] mt-[20px] transition-[background-color,transform]',
				isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer',
			]">
			<span v-if="isLoading">Registrazione in corso...</span>
			<span v-else>Crea Account</span>
		</button>

		<p v-if="messageLoading" class="text-center mt-[12px] text-[0.875rem] text-[#095866]">
			{{ messageLoading }}
		</p>
	</UForm>
</template>
