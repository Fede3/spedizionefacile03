<script setup>
defineProps({
	credentials: { type: Object, required: true },
	isLoading: { type: Boolean, default: false },
	showLoginPassword: { type: Boolean, default: false },
	messageError: { type: Object, default: null },
	messageLoading: { type: String, default: null },
	showResendVerification: { type: Boolean, default: false },
	resendLoading: { type: Boolean, default: false },
	resendMessage: { type: Object, default: null },
})

const emit = defineEmits([
	'submit',
	'update:showLoginPassword',
	'resend-verification',
])
</script>

<template>
	<div>
		<div v-if="showResendVerification" class="bg-amber-50 border border-amber-200 p-[16px] rounded-[50px] text-[#252B42] mt-[24px] mb-[12px]">
			<p class="text-[0.9375rem] font-medium">Email non confermata. Ti reinviamo subito una nuova email di verifica.</p>
			<button
				type="button"
				@click="emit('resend-verification')"
				:disabled="resendLoading"
				class="mt-[12px] px-[16px] py-[10px] rounded-[12px] bg-[#095866] text-white text-[0.875rem] font-semibold cursor-pointer hover:bg-[#074a56] disabled:opacity-60 disabled:cursor-not-allowed">
				{{ resendLoading ? 'Invio in corso...' : 'Invia nuova email di conferma' }}
			</button>
			<p v-if="resendMessage" class="text-[0.8125rem] mt-[10px]" :class="resendMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'">{{ resendMessage.text }}</p>
		</div>

		<form @submit.prevent="emit('submit')" class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42]">
			<div class="mb-[20px]">
				<label for="login_email" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Email</label>
				<input
					type="email"
					id="login_email"
					name="email"
					v-model="credentials.email"
					placeholder="La tua email"
					autocomplete="username"
					class="bg-[#F8F9FB] p-[12px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
					required />
			</div>

			<div class="mb-[20px]">
				<label for="login_password" class="block text-[0.875rem] font-medium text-[#252B42] mb-[6px]">Password</label>
				<div class="relative">
					<input
						:type="showLoginPassword ? 'text' : 'password'"
						id="login_password"
						name="password"
						v-model="credentials.password"
						placeholder="La tua password"
						autocomplete="current-password"
						class="bg-[#F8F9FB] p-[12px] pr-[44px] border border-[#E9EBEC] rounded-[12px] placeholder:text-[#A0A5AB] w-full text-[0.9375rem] focus:border-[#095866] focus:outline-none transition-colors"
						required />
					<button type="button" @click="emit('update:showLoginPassword', !showLoginPassword)" class="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#A0A5AB] hover:text-[#252B42] cursor-pointer transition-colors" tabindex="-1">
						<svg v-if="!showLoginPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						<svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
					</button>
				</div>
			</div>

			<p v-if="messageError?.email" role="alert" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px]">
				{{ Array.isArray(messageError.email) ? messageError.email[0] : messageError.email }}
			</p>

			<p v-if="messageError?.message" role="alert" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px]">
				{{ messageError.message }}
			</p>

			<div class="flex items-center gap-[10px] mb-[20px]">
				<input type="checkbox" id="remember" v-model="credentials.remember" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer shrink-0" />
				<label for="remember" class="text-[0.875rem] text-[#737373] cursor-pointer select-none">Ricordami</label>
			</div>

			<button
				type="submit"
				:disabled="isLoading"
				:class="[
					'w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] transition-[background-color,transform]',
					isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer',
				]">
				<span v-if="isLoading">Accesso in corso...</span>
				<span v-else>Accedi</span>
			</button>

			<p class="text-center mt-[20px] text-[0.8125rem] text-[#737373]">
				Hai dimenticato la password?
				<NuxtLink to="/recupera-password" class="text-[#095866] font-semibold hover:underline">Recupera Password</NuxtLink>
			</p>

			<p v-if="messageLoading" class="text-center mt-[16px] text-[0.875rem] text-[#095866]">
				{{ messageLoading }}
			</p>
		</form>
	</div>
</template>
