<script setup>
/* useHead({
	htmlAttrs: {
		class: "scroll-smooth",
	},
}); */

const services = [
	{
		title: "Pagamento alla consegna",
		description:
			"Il pagamento alla consegna è utile quando vuoi far pagare il destinatario al momento del ritiro del pacco. Il corriere incassa per tuo conto e poi riversa l'importo al mittente secondo le tempistiche previste dal servizio. È una soluzione comoda per vendite occasionali o quando il cliente finale preferisce pagare solo alla consegna. La logica è semplice: tu spedisci, il corriere riscuote e noi accreditiamo. Il servizio può prevedere limiti d'importo e specifiche sul mezzo d'incasso, tipicamente contanti o POS dove disponibile. Per ridurre gli errori, nelle note dell'ordine indichiamo sempre l'importo esatto da riscuotere e il riferimento dell'ordine. È la via più lineare per vendere senza e-commerce o gateway di pagamento, con una tutela pratica sulla mancata consegna. Fonti di riferimento sul funzionamento del contrassegno nei corrieri espressi chiariscono la dinamica incasso-riversamento e i metodi di pagamento gestiti dal vettore.",
		image: "https://www.viridea.it/wp-content/uploads/2008/04/Golden-Retriever.jpg",
		button: "/servizi/pagamento-alla-consegna",
	},
	{
		title: "Documenti con prova di consegna",
		description:
			"Quando servono tracciabilità puntuale e prova legale dell'avvenuta consegna, proponiamo una spedizione documentale con ricevuta di ritorno, pensata per comunicazioni formali e contrattuali. Il flusso prevede tracciatura, consegna al destinatario e restituzione della ricevuta firmata. È la scelta indicata per invii che richiedono presunzione legale di consegna. Il riferimento operativo è l'impostazione della “raccomandata con avviso di ricevimento”:è il modello di prova che ci ispira per impostare SLA e ricevute nei nostri partner postali.",
		image: "https://www.zooplus.it/magazine/wp-content/uploads/2018/12/cane-corso-nero.webp",
		button: "/",
	},
	{
		title: "Corriere nazionale",
		description:
			"Per spedizioni in Italia offriamo rete capillare, ritiro a domicilio e tempi rapidi sulle tratte principali. Il vantaggio pratico è la gestione digitale del processo, con etichetta elettronica dove disponibile e pagamenti rapidi. La consegna standard, sulla gran parte delle tratte nazionali, si muove tipicamente nell'arco di uno o due giorni lavorativi, variando per distanza e tipologia di servizio. L'adozione dell'etichetta digitale semplifica la preparazione: se spedisci da punti convenzionati non serve stampare.",
		image: "https://img.poweredcache.net/www.quattrozampeinfamiglia.it/wp-content/uploads/2024/10/cani-da-riporto.jpg?rs=fit&w=900&h=600&ssl=1&format=webp",
		button: "/",
	},
];
</script>

<template>
	<section id="servizi">
		<div class="my-container">
			<div
				class="flex items-center flex-wrap justify-center mid-desktop:justify-between desktop:first:mt-[93px] first:mt-[59px] last:mb-[27px] desktop:last:mb-[159px] mt-[88px] group mid-desktop:before:w-[45%] desktop:before:w-[446px] desktop-xl:before:w-[519px] desktop-xl:before:h-[483px] before:bg-[image:var(--service-image)] before:bg-cover before:w-[335px] before:h-[320px] before:mb-[72px] desktop:before:mb-0 even:mid-desktop:before:order-2 odd:desktop:before:h-[821px] even:desktop:before:h-[415px] before:content-[''] before:block odd:desktop-xl:before:h-[483px] even:desktop-xl:before:h-[483px] desktop-xl:justify-start even:desktop-xl:justify-end desktop-xl:gap-x-[96px] before:rounded-[20px] desktop:before:rounded-[38px] desktop-xl:mt-[121px]"
				v-for="(service, serviceIndex) in services"
				:key="serviceIndex"
				:style="{ '--service-image': `url(${service.image})` }">
				<!-- <div
					class="mid-desktop:before:w-[45%] desktop:before:w-[446px] desktop-xl:before:w-[519px] desktop-xl:before:h-[483px] before:bg-green-500 before:w-[335px] before:h-[320px] before:mb-[72px] desktop:before:mb-0 group-even:mid-desktop:before:order-2 group-odd:desktop:before:h-[821px] group-even:desktop:before:h-[415px] before:content-[''] before:block"></div> -->

				<!-- <div
					class="mid-desktop:w-[45%] desktop:w-[446px] desktop-xl:w-[519px] desktop-xl:h-[483px] bg-green-500 w-[335px] h-[320px] mb-[72px] desktop:mb-0 mid-desktop:group-even:order-2 desktop:group-odd:h-[821px] group-even:desktop:h-[415px]"></div> -->

				<!--  desktop:before:w-[446px] desktop-xl:before:w-[519px] desktop-xl:before:h-[483px] before:bg-green-500 before:w-[335px] before:h-[320px] before:mb-[72px] desktop:before:mb-0 before:block before:content-[''] -->

				<div
					class="mid-desktop:max-w-[42%] desktop-xl:max-w-[596px] mid-desktop:before:w-[45%] group-even:mid-desktop:order-1 group-odd:desktop:min-h-[821px] group-odd:desktop-xl:min-h-auto group-odd:desktop:flex group-odd:desktop:flex-col group-odd:desktop:justify-between group-odd:desktop-xl:block">
					<h2 class="text-[1.875rem] desktop:text-[3rem] font-medium tracking-[-1.152px] text-[#222222] leading-[110%] desktop:max-w-[385px] desktop-xl:max-w-full">
						{{ service.title }}
					</h2>

					<p class="text-[0.875rem] desktop:text-[1.125rem] text-[#737373] leading-[160%] tracking-[-0.252px] mt-[20px] mb-[40px]">
						{{ service.description }}
					</p>

					<NuxtLink :to="service.button" class="block w-[77px] h-[42px] rounded-[35px] bg-[#E44203] leading-[42px] text-center text-white font-semibold tracking-[-0.336px] text-[0.875rem]">
						Leggi
					</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>
