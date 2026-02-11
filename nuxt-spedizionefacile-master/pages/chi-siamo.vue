<script setup>
/* useHead({
	htmlAttrs: {
		class: "scroll-smooth",
	},
}); */

const sections = [
	{
		title: "Cosa facciamo in concreto",
		description:
			"Ti aiutiamo a spedire senza stress. Dal pacco singolo alle esigenze ricorrenti di privati, professionisti e negozi online, offriamo soluzioni su misura con prezzi trasparenti e procedure snelle. Calcoliamo in tempo reale la tariffa più conveniente tra peso reale e peso-volume, applichiamo solo gli eventuali supplementi necessari e ti mostriamo subito il totale. A richiesta, gestiamo assicurazione, contrassegno e altre opzioni utili, in base alle necessità di recapito.",
		image: "",
	},
	{
		title: "La nostra visione",
		first_description:
			"Rendere ogni spedizione semplice e affidabile. Vogliamo che chiunque possa organizzare un ritiro, stampare l'etichetta o scegliere l'opzione senza stampante, seguire il tracciamento in tempo reale e ricevere supporto quando serve, tutto dallo stesso posto. Il risultato è un'esperienza lineare: meno passaggi, più controllo, zero complicazioni.",
		second_description:
			"Immaginiamo una logistica vicina alle persone: servizi chiari, costi comprensibili, assistenza rapida. Vogliamo essere il punto di riferimento per chi cerca qualità e convenienza insieme, con un servizio accessibile, inclusivo e senza barriere. Lavoriamo perché spedire diventi un'azione quotidiana, immediata e sicura.",
		image: "",
	},
	{
		title: "Come lavoriamo",
		description:
			"Mettiamo al centro i dati essenziali. Il preventivo nasce da pochi campi chiari, il sistema seleziona la combinazione più conveniente e ti guida passo dopo passo fino al pagamento e all'etichetta. Con il tracciamento puoi sapere sempre dove si trova il pacco e con l'assistenza interna puoi gestire richieste, giacenze, variazioni di indirizzo e rimborsi quando ne ricorrono i presupposti. È la stessa logica di immediatezza che il mercato premia nelle migliori piattaforme di spedizione online, dove chiarezza e rapidità sono determinanti per la fiducia dell'utente",
		image: "",
	},
	{
		title: "Cosa facciamo in concreto",
		description:
			"Ti aiutiamo a spedire senza stress. Dal pacco singolo alle esigenze ricorrenti di privati, professionisti e negozi online, offriamo soluzioni su misura con prezzi trasparenti e procedure snelle. Calcoliamo in tempo reale la tariffa più conveniente tra peso reale e peso-volume, applichiamo solo gli eventuali supplementi necessari e ti mostriamo subito il totale. A richiesta, gestiamo assicurazione, contrassegno e altre opzioni utili, in base alle necessità di recapito.",
		image: "",
	},
	{
		title: "Perchè sceglierci",
		description:
			"Prezzi chiari in tempo reale grazie al confronto automatico delle tariffe in base a peso e volume Ritiro a domicilio e consegna con corrieri nazionali e internazionali selezionati Servizi aggiuntivi su richiesta come assicurazione e contrassegno Assistenza che ti segue dal preventivo alla consegna con canali digitali e risposta rapida Area personale per gestire ordini, indirizzi, ricevute e storico spedizioni",
		image: "",
	},
];
</script>

<template>
	<section id="chi-siamo">
		<div class="my-container mt-[32px]">
			<p class="text-[0.875rem] desktop-xl:text-[1.25rem] font-medium text-[rgba(0,0,0,.6)] tracking-[1.8px] border-[#C4C4C4] border-b-[1px] pb-[30px] desktop:text-[1.25rem]">Chi siamo</p>

			<p
				class="font-[General_Sans] text-[1.25rem] desktop-xl:text-[2.5rem] leading-[160%] tracking-[-0.48px] desktop:tracking-[-0.96px] text-[#222222] mt-[32px] border-[#C4C4C4] border-b-[1px] pb-[32px] desktop:text-[1.75rem]">
				Siamo SpedizioneFacile, la piattaforma che rende semplice e accessibile la spedizione di pacchi in Italia e all'estero. Mettiamo insieme tecnologia, esperienza nei trasporti e assistenza umana
				per trasformare un'attività complessa in un servizio chiaro, veloce e affidabile. Il nostro obiettivo è farti risparmiare tempo ed energie: inserisci i dati essenziali, scegli il ritiro,
				ricevi l'etichetta in pochi minuti, segui il pacco fino alla consegna.
			</p>

			<div
				v-for="(section, sectionIndex) in sections"
				:key="sectionIndex"
				class="flex items-center justify-center desktop:gap-x-[56px] flex-wrap odd:desktop:flex-nowrap before:content-[''] before:bg-red-400 before:block desktop:before:w-[519px] desktop:before:h-[607px] mt-[40px] desktop:mt-[70px] first:mt-0 even:desktop:before:mx-auto even:desktop:before:w-[928px] even:desktop:before:h-[441px] before:mt-[20px] desktop:even:before:mt-[37px] group before:w-[337px] before:h-[191px] last:border-b-0 before:rounded-[18px] desktop:before:rounded-[38px] tablet:before:w-[700px] tablet:before:h-[300px] tablet:before:mt-[32px] after:content-[''] after:border-[#C4C4C4] after:absolute after:border-b-[1px] after:block pb-[40px] desktop:pb-[70px] after:w-full desktop:after:w-[685px] desktop-xl:after:w-[1082px] relative after:bottom-0 even:desktop:before:order-2 odd:desktop:before:order-[-1] before:order-2">
				<!--  -->
				<div class="group-odd:desktop:max-w-[361px] group-odd:desktop-xl:max-w-[596px] group-even:desktop:px-[50px] group-even:text-center text-center desktop:text-left">
					<!-- <h2 v-if="sectionIndex === 0" class="mb-[32px] desktop:text-[1.25rem] tracking-[1.8px] text-[rgba(0,0,0,.6)] font-medium text-[0.9375rem]">COSA FACCIAMO</h2> -->

					<h2
						class="desktop:text-[3rem] desktop-xl:group-odd:text-[4rem] group-odd:tracking-[-1.536px] font-medium text-[#222222] leading-[110%] group-odd:mb-[40px] group-even:desktop-xl:text-[3rem] group-even:tracking-[-1.152px] group-even:text-center group-even:mb-[32px] text-[2.25rem]">
						{{ section.title }}
					</h2>

					<!-- <p v-if="section.second_title" class="text-[4rem] tracking-[-1.536px] font-medium text-[#222222] leading-[110%] mt-[32px] mb-[40px]">
						{{ section.second_title }}
					</p> -->

					<p
						v-if="section.first_description && section.second_description"
						class="desktop:text-[1.25rem] desktop-xl:text-[1.5rem] leading-[160%] tracking-[-0.336px] font-medium text-[#404040] text-[1.125rem]">
						<span>{{ section.first_description }}</span>
						<span v-if="section.second_description" class="block mt-[30px]">
							{{ section.second_description }}
						</span>
					</p>

					<p v-if="section.description" class="desktop:text-[1.25rem] desktop-xl:text-[1.5rem] leading-[160%] tracking-[-0.336px] font-medium text-[#404040] text-[1.125rem]">
						{{ section.description }}
					</p>
				</div>
			</div>
		</div>
	</section>
</template>
