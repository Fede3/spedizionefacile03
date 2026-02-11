<script setup>
const contactForm = ref({
	name: "",
	surname: "",
	email: "",
	telephone_number: "",
	address: "",
	message: "",
});
</script>

<template>
	<section>
		<div class="my-container">
			<h2 class="mt-[50px] desktop:mt-[80px] text-[1.875rem] leading-[110%] font-medium tracking-[-0.72px] text-[#222222] max-w-[279px] mb-[8px] desktop:text-[3rem] desktop:max-w-[411px]">
				Raccontaci cosa ti serve
			</h2>

			<form @submit.prevent="">
				<label for="name" class="sr-only">Nome *</label>
				<input type="text" v-model="contactForm.name" id="name" placeholder="Nome..." class="input-contatti desktop:inline-block desktop:w-[50%]" required />

				<label for="surname" class="sr-only">Cognome *</label>
				<input type="text" v-model="contactForm.surname" id="surname" placeholder="Cognome..." class="input-contatti desktop:inline-block desktop:w-[calc(50%-24px)] desktop:ml-[24px]" required />

				<label for="email" class="sr-only">E-mail *</label>
				<input type="email" v-model="contactForm.email" id="email" placeholder="E-mail..." class="input-contatti" required />

				<label for="telephone_number" class="sr-only">Numero di telefono</label>
				<input type="tel" v-model="contactForm.telephone_number" id="telephone_number" placeholder="Numero di telefono..." class="input-contatti bg-none" />

				<label for="address" class="sr-only">Indirizzo *</label>
				<input type="text" v-model="contactForm.address" id="address" placeholder="Indirizzo..." class="input-contatti" required />

				<label for="message" class="sr-only">Come possiamo aiutarti? *</label>
				<textarea
					v-model="contactForm.message"
					id="message"
					placeholder="Come possiamo aiutarti?"
					class="input-contatti h-[335px] leading-[160%] pt-[24px] bg-[100%_-11px] resize-none"
					required></textarea>

				<button
					type="submit"
					class="bg-[#E44203] h-[84px] w-full text-center text-white rounded-[50px] font-semibold text-[1.25rem] tracking-[-0.48px] mt-[40px] mb-[167px] desktop-xl:mb-[165px] desktop:mb-[206px] after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:align-[-1px]">
					Invia il messaggio
					<!-- <NuxtImg src="/img/arrow-down.svg" aria-hidden="true" width="16" height="16" alt="" class="size-[16px]" /> -->
				</button>
			</form>
		</div>
	</section>
</template>
