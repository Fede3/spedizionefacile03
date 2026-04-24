<script setup>
definePageMeta({ middleware: ['app-auth'] });

const route = useRoute();

const canonicalDetailLocation = computed(() => {
	const orderId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;

	return {
		path: orderId ? `/account/spedizioni/${orderId}` : '/account/spedizioni',
		query: route.query,
		hash: route.hash,
	};
});

const redirectToCanonicalDetail = async () => {
	await navigateTo(canonicalDetailLocation.value, { replace: true });
};

if (import.meta.server) {
	await redirectToCanonicalDetail();
} else {
	watch(
		() => route.fullPath,
		async () => {
			await redirectToCanonicalDetail();
		},
		{ immediate: true },
	);
}
</script>

<template>
	<span class="sr-only">Reindirizzamento al dettaglio spedizione</span>
</template>
