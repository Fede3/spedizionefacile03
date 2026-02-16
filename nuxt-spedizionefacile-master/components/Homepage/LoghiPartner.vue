<!--
	COMPONENTE: LoghiPartner (Homepage/LoghiPartner.vue)
	SCOPO: Striscia scorrevole (marquee) con i loghi dei partner nella homepage.

	DOVE SI USA: pages/index.vue (homepage)
	PROPS: nessuna
	EMITS: nessuno

	DATI IN INGRESSO: nessuno (icone statiche)
	DATI IN USCITA: nessuno (solo visualizzazione)

	VINCOLI: usa UMarquee di Nuxt UI — si ferma automaticamente al passaggio del mouse
	PUNTI DI MODIFICA SICURI: sostituire le icone segnaposto con i loghi reali dei partner
	COLLEGAMENTI: nessuno

	NOTA: attualmente usa icone segnaposto (GitHub, Discord, X, ecc.).
	Da sostituire con i loghi reali dei corrieri e partner commerciali.
-->
<template>
	<section class="mt-[94px]">
		<UMarquee pause-on-hover :overlay="false">
			<UIcon name="i-simple-icons-github" class="shrink-0 text-[40px] desktop:text-[90px]" />
			<UIcon name="i-simple-icons-discord" class="shrink-0 text-[40px] desktop:text-[90px]" />
			<UIcon name="i-simple-icons-x" class="shrink-0 text-[40px] desktop:text-[90px]" />
			<UIcon name="i-simple-icons-instagram" class="shrink-0 text-[40px] desktop:text-[90px]" />
			<UIcon name="i-simple-icons-linkedin" class="shrink-0 text-[40px] desktop:text-[90px]" />
			<UIcon name="i-simple-icons-facebook" class="shrink-0 text-[40px] desktop:text-[90px]" />
		</UMarquee>
	</section>
</template>
