<script setup lang="ts">
import { buildLegacyAuthOverlayRedirect } from '~/utils/auth';

definePageMeta({
	layout: false,
	middleware: ['guest-auth'],
});

useSeoMeta({
	title: 'Accesso | SpediamoFacile',
	robots: 'noindex, nofollow',
});

const route = useRoute();
const targetLocation = buildLegacyAuthOverlayRedirect(route, {
	allowRequestedMode: true,
	allowRequestedTab: true,
	defaultTab: 'login',
});

await navigateTo(targetLocation, { redirectCode: 302, replace: true });
</script>

<template>
	<div />
</template>
