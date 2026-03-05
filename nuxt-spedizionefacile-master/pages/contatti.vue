<!--
  PAGINA: Contatti (contatti.vue)
  Form di contatto per richiedere assistenza o informazioni.
  Invia i dati del form (nome, cognome, email, telefono, indirizzo, messaggio)
  all'endpoint /api/contact del backend. Mostra feedback di successo o errore.
  Include dati strutturati JSON-LD per il SEO (ContactPage).
-->
<script setup>
// Meta tag SEO
useSeoMeta({
	title: 'Contatti | SpediamoFacile - Assistenza e Supporto',
	ogTitle: 'Contatti | SpediamoFacile',
	description: 'Hai bisogno di aiuto? Contatta il team di SpediamoFacile per assistenza sulle tue spedizioni, preventivi personalizzati o informazioni sui nostri servizi.',
	ogDescription: 'Contatta SpediamoFacile per assistenza e supporto sulle tue spedizioni.',
});

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'ContactPage',
				name: 'Contatti SpediamoFacile',
				url: 'https://spediamofacile.it/contatti',
				mainEntity: {
					'@type': 'Organization',
					name: 'SpediamoFacile',
					url: 'https://spediamofacile.it',
					contactPoint: {
						'@type': 'ContactPoint',
						contactType: 'customer service',
						availableLanguage: 'Italian',
					},
				},
			}),
		},
	],
});

const sanctum = useSanctumClient();

// Dati del form di contatto
const contactForm = ref({
	name: "",
	surname: "",
	email: "",
	telephone_number: "",
	address: "",
	message: "",
});

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref(null);

// Invia il form di contatto al backend, prima recuperando il cookie CSRF per la sicurezza
const handleSubmit = async () => {
	submitError.value = null;
	isSubmitting.value = true;

	try {
		await sanctum("/sanctum/csrf-cookie");
		await sanctum("/api/contact", {
			method: "POST",
			body: contactForm.value,
		});
		submitSuccess.value = true;
		contactForm.value = {
			name: "",
			surname: "",
			email: "",
			telephone_number: "",
			address: "",
			message: "",
		};
	} catch (error) {
		const data = error?.response?._data || error?.data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			submitError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			submitError.value = data?.message || "Errore durante l'invio. Riprova.";
		}
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<section>
		<div class="my-container">
			<h2 class="mt-[50px] desktop:mt-[80px] text-[1.875rem] leading-[110%] font-medium tracking-[-0.72px] text-[#222222] max-w-[279px] mb-[8px] desktop:text-[3rem] desktop:max-w-[411px]">
				Raccontaci cosa ti serve
			</h2>

			<!-- Success state -->
			<div v-if="submitSuccess" class="mt-[30px] bg-emerald-50 border border-emerald-200 rounded-[16px] p-[32px] text-center mb-[120px]">
				<!-- Icona successo con MDI -->
				<div class="w-[64px] h-[64px] mx-auto mb-[16px] bg-emerald-100 rounded-full flex items-center justify-center">
					<Icon name="mdi:check-circle-outline" class="text-[32px] text-emerald-500" />
				</div>
				<h3 class="text-[1.25rem] font-bold text-[#252B42] mb-[8px]">Messaggio inviato!</h3>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6] mb-[20px]">Grazie per averci contattato. Ti risponderemo il prima possibile.</p>
				<button @click="submitSuccess = false" class="px-[24px] py-[12px] bg-[#095866] text-white rounded-[50px] font-semibold text-[0.9375rem] hover:bg-[#074a56] transition cursor-pointer">
					Invia un altro messaggio
				</button>
			</div>

			<form v-else @submit.prevent="handleSubmit">
				<label for="name" class="sr-only">Nome *</label>
				<input type="text" v-model="contactForm.name" id="name" placeholder="Nome..." class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors desktop:inline-block desktop:w-[50%]" required />

				<label for="surname" class="sr-only">Cognome *</label>
				<input type="text" v-model="contactForm.surname" id="surname" placeholder="Cognome..." class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors desktop:inline-block desktop:w-[calc(50%-24px)] desktop:ml-[24px]" required />

				<label for="email" class="sr-only">E-mail *</label>
				<input type="email" v-model="contactForm.email" id="email" placeholder="E-mail..." class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors" required />

				<label for="telephone_number" class="sr-only">Numero di telefono</label>
				<input type="tel" v-model="contactForm.telephone_number" id="telephone_number" placeholder="Numero di telefono..." class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors" />

				<label for="address" class="sr-only">Indirizzo *</label>
				<input type="text" v-model="contactForm.address" id="address" placeholder="Indirizzo..." class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[60px] px-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] mt-[20px] focus:border-[#095866] focus:outline-none transition-colors" required />

				<label for="message" class="sr-only">Come possiamo aiutarti? *</label>
				<div class="relative mt-[20px]">
					<textarea
						v-model="contactForm.message"
						id="message"
						placeholder="Come possiamo aiutarti?"
						maxlength="2000"
						class="w-full bg-white border border-[#D0D0D0] rounded-[20px] h-[335px] px-[24px] pt-[24px] text-[0.9375rem] text-[#252B42] placeholder:text-[#A0A5AB] focus:border-[#095866] focus:outline-none transition-colors leading-[160%] resize-none"
						required></textarea>
					<span class="absolute bottom-[12px] right-[16px] text-[0.75rem] text-[#A0A5AB]">{{ contactForm.message.length }}/2000</span>
				</div>

				<p v-if="submitError" class="text-red-500 text-[0.875rem] mt-[12px] bg-red-50 p-[12px] rounded-[50px] border border-red-200">{{ submitError }}</p>

				<!-- Miglioramento UX: btn-hover per effetto hover piu' evidente, target touch minimo 44px gia' rispettato -->
			<button
					type="submit"
					:disabled="isSubmitting"
					:class="isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'"
					class="bg-[#E44203] h-[84px] w-full text-center text-white rounded-[50px] font-semibold text-[1.25rem] tracking-[-0.48px] mt-[40px] mb-[167px] desktop-xl:mb-[165px] desktop:mb-[206px] btn-hover after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:align-[-1px]">
					{{ isSubmitting ? 'Invio in corso...' : 'Invia il messaggio' }}
				</button>
			</form>
		</div>
	</section>
</template>
