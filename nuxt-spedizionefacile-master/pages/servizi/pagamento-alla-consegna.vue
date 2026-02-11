<script setup>
/*useHead({
	htmlAttrs: {
		class: "scroll-smooth",
	},
});*/

const faqs = [
	{
		title: "Il pagamento alla consegna è solo in contanti?",
		text: "Per i servizi nazionali è normalmente in contanti; alcune reti offrono varianti o servizi correlati. Verifica sempre le condizioni del vettore scelto.",
	},
	{
		title: "Come scelgo come ricevere i soldi incassati?",
		text: "Al momento dell'ordine selezioni la modalità di riversamento resa disponibile dal vettore; per esempio accredito su conto corrente.",
	},
	{
		title: "Posso far pagare solo le spese di spedizione e non la merce?",
		text: "Sì: alcuni corrieri hanno servizi in cui il destinatario paga solo il trasporto; GLS lo chiama “Destination Pay”. È diverso dal contrassegno merce.",
	},
	{
		title: "Cosa devo scrivere sui documenti?",
		text: "Possono esserci limiti legati al vettore e alla normativa sui contanti, soglie soggette ad aggiornamenti. Controlla sempre le condizioni ufficiali prima della spedizione. ",
	},
];
</script>

<template>
	<section id="pagamento-alla-consegna">
		<div class="my-container">
			<p
				class="desktop-xl:text-[4rem] font-medium tracking-[-1.536px] text-center text-[#222222] mt-[61px] mb-[40px] desktop-xl:mb-[88px] text-[2.5rem] leading-[110%] desktop:mt-[72px] desktop-xl:mt-[141px]">
				Pagamento alla consegna
			</p>

			<div
				class="desktop:flex desktop:items-start desktop-xl:items-center desktop:justify-between before:content-[''] before:block desktop-xl:before:w-[519px] desktop-xl:before:h-[550px] desktop:before:rounded-[40px] before:bg-green-500 desktop:before:h-[681px] desktop:before:w-[446px] before:w-[335px] before:h-[320px] before:rounded-[24px] before:mx-auto desktop:before:mx-0">
				<div class="desktop-xl:max-w-[669px] desktop:max-w-[430px]">
					<h3 class="text-[1.5rem] font-medium tracking-[-0.576px] text-[#222222] mb-[16px] mt-[40px] desktop:mt-0">Cosa è?</h3>
					<p class="desktop-xl:text-[1.125rem] leading-[160%] tracking-[-0.252px] text-[#737373] text-[0.875rem] desktop:text-[1rem]">
						Il pagamento alla consegna è un servizio accessorio con cui il corriere ritira dal destinatario l'importo indicato dal mittente al momento della consegna e lo riversa al mittente con la
						modalità scelta. Per i vettori nazionali il pagamento avviene di norma in contanti e l'importo da incassare deve essere indicato chiaramente sulla spedizione; il riversamento può avvenire
						con accredito su conto o altre modalità rese disponibili dal vettore.
					</p>

					<h3 class="text-[1.5rem] font-medium tracking-[-0.576px] text-[#222222] mt-[40px] desktop:mt-[65px] mb-[16px]">Quando usarlo</h3>
					<div class="desktop-xl:text-[1.125rem] leading-[160%] tracking-[-0.252px] text-[#737373] text-[0.875rem] desktop:text-[1rem]">
						<ul class="list-disc list-inside [&>li]:mb-[20px] [&>li]:ml-[15px]">
							<li>Quando vuoi spedire merce senza esporre il cliente a pagamenti anticipati.</li>
							<li>Quando vendi fuori canale e-commerce tradizionale o in aree dove i pagamenti elettronici sono poco usati.</li>

							<li>Quando vuoi combinare consegna e incasso in un'unica operazione, con evidenza dell'importo in etichetta e nei documenti di trasporto.</li>
						</ul>

						<p>Molti corrieri italiani offrono servizi di incasso alla consegna in contanti; ad esempio il servizio “Contanti GLS” prevede la riscossione in contanti a domicilio.</p>
					</div>
				</div>
			</div>

			<div class="desktop:text-[1.25rem] leading-[160%] tracking-[-0.252px] text-[#737373] text-[0.875rem]">
				<div class="mt-[70px]">
					<div class="desktop:flex desktop:items-start desktop:justify-between">
						<div class="desktop-xl:max-w-[655px] desktop:max-w-[505px] mr-auto">
							<h3 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] text-[1.875rem] mb-[20px]">Come funziona con SpedizioneFacile</h3>

							<h4>1. Impostazione in checkout</h4>

							<p>Nel modulo di spedizione attivi “Pagamento alla consegna” e inserisci:</p>

							<ul class="list-disc list-inside [&>li]:mb-[5px] [&>li]:ml-[5px]">
								<li>importo da incassare</li>
								<li>descrizione breve per ricevuta del destinatario</li>

								<li>
									modalità di riversamento preferita (accredito su conto, rimessa su portafoglio interno, altra opzione disponibile). Il sistema stampa l'indicazione del contrassegno sull'etichetta e
									nei documenti che accompagnano il collo. Nei servizi postali come Poste Delivery Standard l'importo deve essere riportato in modo chiaro; il pagamento è in contanti.
								</li>
							</ul>
						</div>

						<div
							class="desktop-xl:w-[519px] desktop-xl:h-[397px] rounded-[32px] bg-green-500 w-[335px] h-[320px] mx-auto desktop:mx-0 mt-[30px] desktop:mt-0 desktop:h-[553px] desktop:w-[380px]"></div>
					</div>

					<h4 class="mt-[30px]">2. Ritiro e consegna</h4>

					<p>
						Il corriere ritira il collo e lo porta in consegna. Alla porta incassa l'importo indicato. Se il destinatario non paga o rifiuta, la spedizione non viene consegnata e rientra al mittente
						secondo la prassi del vettore. La natura “incasso alla consegna” è un servizio accessorio previsto nelle condizioni generali dei principali corrieri nazionali. irp-cdn.multiscreensite.com
					</p>

					<h4 class="mt-[30px]">3. Riversamento dell'incasso</h4>

					<p>
						Dopo l'incasso, l'importo viene riversato al mittente con la modalità selezionata al momento dell'ordine. Nelle soluzioni postali è possibile farsi accreditare su conto o tramite altre
						forme di rimessa indicate dal vettore; la preferenza si imposta in fase di spedizione.
					</p>

					<h4 class="mt-[30px]">4. Tracciamento e quietanze</h4>

					<p>
						Nel tuo profilo vedi lo stato “incasso in corso”, “incasso eseguito”, “riversato”. Puoi scaricare la quietanza di incasso e la distinta di riversamento. Validazione Sono stati descritti
						tutti i passaggi: impostazione, consegna con incasso, riversamento, tracciamento. Sì.
					</p>
				</div>

				<h3 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] desktop:mt-[70px] text-[1.875rem] mb-[20px] mt-[40px]">
					Requisiti, limiti e buone pratiche
				</h3>

				<ul class="list-disc list-inside [&>li]:mb-[5px] [&>li]:ml-[5px]">
					<li>
						Importo in cifre ben visibile in etichetta e documenti; dove richiesto, riportalo anche in lettere. Nelle specifiche dei servizi postali l'importo del contrassegno è parte integrante
						dell'ordine e il pagamento avviene in contanti.
					</li>
					<li>Pagamento tipicamente in contanti alla consegna. Alcuni vettori offrono varianti o servizi correlati; GLS indica esplicitamente il servizio “Contanti GLS”.</li>
					<li>
						Importi elevati: verifica sempre eventuali limiti o soglie del vettore e la normativa corrente sui pagamenti in contanti; i limiti possono variare nel tempo. Le pagine ufficiali dei
						vettori e le condizioni aggiornate prevalgono. irp-cdn.multiscreensite.com
					</li>
					<li>Dati del destinatario completi e reperibilità telefonica: riduce i tentativi di consegna a vuoto.</li>
					<li>Imballo robusto e prova di valore: se vendi merce costosa, valuta assicurazione e foto di pre-imballo.</li>
					<li>In caso di mancato pagamento il collo non viene consegnato e può tornare al mittente; pianifica la gestione resi e i costi collegati.</li>

					<li>
						Validazione
						<span class="block ml-[10px]">Coperti requisiti operativi, metodo di pagamento, note su limiti, gestione rifiuti. Sì.</span>
					</li>
				</ul>

				<h3 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] desktop:mt-[70px] text-[1.875rem] mb-[20px] mt-[40px]">Costi</h3>
				<ul class="list-disc list-inside [&>li]:mb-[5px] [&>li]:ml-[5px]">
					<li>
						Il pagamento alla consegna comporta un sovrapprezzo rispetto alla spedizione standard, in quanto il corriere svolge un servizio di incasso e riversamento. L'importo del sovrapprezzo
						dipende dal vettore e dalle condizioni applicate. La pagina informativa Paccofacile chiarisce che il contrassegno è un servizio accessorio con costi dedicati; la tariffa esatta viene
						mostrata nel preventivo prima dell'acquisto.
					</li>
					<li>
						Validazione
						<span class="block ml-[10px]">Spiegato che esiste un sovrapprezzo e dove viene mostrato. Sì.</span>
					</li>
				</ul>

				<h3 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] desktop:mt-[70px] text-[1.875rem] mb-[20px] mt-[40px]">
					Dati richiesti e controlli nel checkout
				</h3>
				<ul class="list-disc list-inside [&>li]:mb-[5px] [&>li]:ml-[5px]">
					<li>campo importo contrassegno</li>
					<li>campo descrizione per ricevuta</li>
					<li>scelta riversamento: accredito su conto o portafoglio</li>
					<li>consenso esplicito del mittente ai termini del servizio accessorio contrassegno</li>
					<li>avviso chiaro al destinatario nell'email/SMS di pre-consegna: “consegna con incasso X € in contanti”</li>
					Aggiornamento sintetico
					<span class="block ml-[10px]">Le specifiche del modulo ordine sono definite e pronte per lo sviluppo UI.</span>
				</ul>

				<h3 class="desktop:text-[2.5rem] font-medium leading-[110%] tracking-[-0.96px] desktop:mb-[30px] text-[#222222] desktop:mt-[70px] text-[1.875rem] mb-[20px] mt-[40px]">Cosa succede se…</h3>
				<ul class="list-disc list-inside [&>li]:mb-[5px] [&>li]:ml-[5px] mb-[30px]">
					<li>
						Il destinatario non paga o non è presente
						<span class="block ml-[10px]">
							La consegna non avviene; la spedizione può essere messa in giacenza con nuove istruzioni o rientrare al mittente. Il servizio resta dovuto secondo condizioni del vettore.
							irp-cdn.multiscreensite.com
						</span>
					</li>
					<li>
						L'incasso è avvenuto ma non vedi subito l'accredito
						<span class="block ml-[10px]">
							I tempi di riversamento dipendono dal vettore e dalla modalità selezionata; nelle soluzioni postali è prevista la rimessa secondo l'opzione scelta al momento della spedizione
						</span>
					</li>
					<li>
						Vuoi fatturare al destinatario
						<span class="block ml-[10px]">
							La fattura resta di competenza del mittente; il corriere incassa per tuo conto. Indica l'importo esatto e conserva la quietanza di incasso per la riconciliazione.
						</span>
					</li>
					<li>
						Validazione
						<span class="block ml-[10px]">Coperti i principali casi critici: rifiuto, tempi di rimessa, fattura. Sì.</span>
					</li>
				</ul>
			</div>

			<h2
				class="desktop-xl:text-[4rem] font-medium tracking-[-1.536px] text-left text-[#222222]text-[2.5rem] leading-[110%] after:content-[''] after:bg-red-500 after:w-[335px] after:mx-auto desktop:after:w-full after:h-[320px] desktop:after:h-[484px] after:rounded-[32px] after:block desktop:after:my-[48px] after:my-[20px] desktop:mt-[70px] mt-[30px] text-[1.875rem]">
				Domande frequenti
			</h2>

			<div class="desktop:flex desktop:items-start desktop:justify-between desktop:flex-wrap desktop:gap-x-[24px] desktop:gap-y-[40px] gap-y-[20px] desktop:mb-[62px] mb-[30px]">
				<div v-for="(faq, faqIndex) in faqs" :key="faqIndex" class="desktop:w-[calc(50%-20px)]">
					<h3 class="desktop:text-[1.875rem] text-[1.5rem] font-medium tracking-[-0.72px] leading-[110%] text-[#222222] mb-[16px] mt-[30px] desktop:mt-0">
						{{ faq.title }}
					</h3>
					<p class="desktop:text-[1.125rem] tracking-[-0.252px] leading-[160%] text-[rgba(82,82,82,.6)]">
						{{ faq.text }}
					</p>
				</div>
			</div>
		</div>
	</section>
</template>
