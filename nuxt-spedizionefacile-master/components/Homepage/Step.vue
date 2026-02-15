<!--
	COMPONENTE PASSI HOMEPAGE (Homepage/Step.vue)

	Questo componente mostra la sezione "Spedisci in 4 semplici passi" nella homepage.
	Spiega all'utente come funziona il servizio in modo visivo e semplice.

	I 4 passi mostrati sono:
	1. Pacco e dimensioni - "Ti basta indicare quello che sai"
	2. Ritiro e consegna - "Scegli l'indirizzo e l'orario che preferisci"
	3. Personalizza i servizi - "Assicurazione, contrassegno, consegna express"
	4. Paga e stampa l'etichetta - "Un clic con carta o portafoglio interno"

	Ogni passo ha un'icona, un titolo e una breve descrizione.
	A sinistra c'e' un riquadro verde con il messaggio "Spedisci in 2 minuti"
	e un pulsante per andare alla pagina del preventivo.
-->
<script setup>
onMounted(() => {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('revealed');
				observer.unobserve(entry.target);
			}
		});
	}, { threshold: 0.15 });
	document.querySelectorAll('.reveal-step').forEach(el => observer.observe(el));
});

const steps = ref([
	{
		title: "Pacco & dimensioni",
		description: "Ti basta indicare quello che sai: niente dati inutili, niente sorprese sul prezzo.",
		icon: "/img/homepage/timeline/weight.png",
		width: 87,
		height: 87,
	},
	{
		title: "Ritiro & consegna",
		description: "Scegli l'indirizzo e l'orario che preferisci; pensiamo noi al resto.",
		icon: "/img/homepage/timeline/shipping.png",
		width: 86,
		height: 86,
	},
	{
		title: "Personalizza i servizi",
		description: "Assicurazione, contrassegno, consegna express: attiva solo ciò che ti serve.",
		icon: "/img/homepage/timeline/services.png",
		width: 80,
		height: 78,
	},
	{
		title: "Paga e stampa l'etichetta",
		description: "Un clic con carta o portafoglio interno, etichetta PDF subito pronta da attaccare.",
		icon: "/img/homepage/timeline/pay.png",
		width: 79,
		height: 79,
	},
]);
</script>

<template>
	<!-- Miglioramento UX: aggiunto sottotitolo per chiarire la proposta di valore -->
	<!-- content-visibility: auto — sezione below-the-fold, rendering differito -->
	<section class="mt-[80px] tablet:mt-[100px] desktop:mt-[140px] cv-auto">
		<div class="my-container font-montserrat">
			<h2 class="font-bold text-[1.25rem] tablet:text-[1.5rem] desktop:text-[2.5rem] leading-[28px] tablet:leading-[32px] text-[#252B42] text-center tracking-[0.2px]">Spedisci in 4 semplici passi</h2>
			<p class="text-[0.875rem] text-[#737373] text-center mt-[10px] max-w-[500px] mx-auto leading-[1.6] tracking-[0.2px]">Dal preventivo all'etichetta in meno di due minuti. Semplice, veloce, senza complicazioni.</p>

			<div class="desktop:flex desktop:items-start desktop-xl:items-center desktop-xl:justify-start desktop:mt-[48px] mt-[20px] relative desktop-xl:gap-x-[126px]">
				<div class="bg-green-400 w-full h-[240px] tablet:h-[300px] desktop:w-[554px] desktop:h-[629px] desktop:pl-[58px] desktop-xl:pl-0 rounded-[16px] tablet:rounded-none">
					<div class="flex items-center justify-center desktop-xl:justify-center h-full text-center desktop:text-left desktop:justify-start">
						<div class="px-[20px] desktop:px-0">
							<p class="text-white font-bold desktop:text-[2.5rem] desktop:max-w-[294px] desktop-xl:max-w-[420px] desktop:leading-[50px] tracking-[0.2px] mb-[24px] tablet:mb-[43px] desktop:mb-[78px] text-[1.125rem] tablet:text-[1.25rem]">
								Spedisci in 2 minuti Etichetta pronta subito
							</p>

							<NuxtLink to="/preventivo" class="mx-auto desktop:mx-0 block bg-[#095866] w-[202px] h-[52px] rounded-[12px] text-white text-[0.875rem] font-bold leading-[52px] text-center btn-hover hover:bg-[#074a56]">
								Calcola il prezzo
							</NuxtLink>
						</div>
					</div>
				</div>

				<ul
					class="mt-[50px] desktop:mt-0 w-full desktop:w-[541px] tablet:flex tablet:flex-wrap tablet:items-start desktop:block tablet:gap-x-[20px] desktop:gap-x-0 desktop:absolute desktop:right-0 desktop:bottom-0 desktop-xl:relative">
					<li
						v-for="(step, stepIndex) in steps"
						:key="stepIndex"
						class="bg-white mb-[30px] last:mb-0 p-[16px] tablet:p-[25px] desktop:py-0 flex items-center justify-between gap-x-[16px] tablet:gap-x-[24px] desktop:gap-x-[40px] tablet:w-[calc(50%-10px)] tablet:min-h-[204px] desktop:w-auto desktop:min-h-[132px] rounded-[4px] card-hover reveal-step"
						:style="{ transitionDelay: `${stepIndex * 100}ms` }">
						<!-- Ottimizzazione: decoding async per non bloccare il rendering -->
						<NuxtImg :src="step.icon" :alt="step.title" :width="step.width" :height="step.height" loading="lazy" decoding="async" class="w-[56px] h-[56px] tablet:w-[70px] tablet:h-[70px] desktop:w-auto desktop:h-auto object-contain shrink-0 step-icon" />
						<div>
							<h3 class="desktop:ml-[5px] desktop:max-w-[360px] text-[1.125rem] tablet:text-[1.25rem] desktop:text-[1.5rem] font-bold text-[#252B42] tracking-[0.1px] leading-[26px] tablet:leading-[32px]">{{ stepIndex + 1 }}. {{ step.title }}</h3>
							<p class="max-w-[350px] text-[0.875rem] text-[#737373] leading-[20px] tracking-[0.2px] mt-[10px] desktop:mt-[5px]">
								{{ step.description }}
							</p>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
	.reveal-step {
		opacity: 0;
		transform: translateX(-24px);
		transition: opacity 0.5s ease, transform 0.5s ease;
	}
	.reveal-step.revealed {
		opacity: 1;
		transform: translateX(0);
	}

	@keyframes subtlePulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.06); }
	}

	.reveal-step.revealed .step-icon {
		animation: subtlePulse 2s ease-in-out 0.6s 1;
	}
}
</style>
