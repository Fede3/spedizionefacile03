<!--
	COMPONENTE LOGHI PARTNER (Homepage/LoghiPartner.vue)

	Questo componente mostra una striscia scorrevole (marquee) con i loghi dei partner.
	La striscia scorre automaticamente da destra a sinistra e si ferma quando
	l'utente ci passa sopra con il mouse.

	Attualmente usa icone segnaposto (GitHub, Discord, X, Instagram, LinkedIn, Facebook).
	In futuro le icone andranno sostituite con i loghi reali dei corrieri
	e dei partner commerciali di SpedizioneFacile.
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
