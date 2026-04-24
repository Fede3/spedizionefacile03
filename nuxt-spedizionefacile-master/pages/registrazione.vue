<script setup lang="ts">
import '~/assets/css/autenticazione.css';
import { buildLegacyAuthOverlayRedirect } from '~/utils/auth';

definePageMeta({
	layout: false,
	middleware: ['guest-auth'],
});

const route = useRoute();

useSeoMeta({
	title: 'Registrati | SpediamoFacile',
	description: 'Crea il tuo account SpediamoFacile e inizia a spedire con BRT a prezzi vantaggiosi.',
	robots: 'noindex, nofollow',
});

await navigateTo(
	buildLegacyAuthOverlayRedirect(route, { defaultTab: 'register' }),
	{ redirectCode: 302, replace: true },
);
</script>

<template>
	<div />
</template>
