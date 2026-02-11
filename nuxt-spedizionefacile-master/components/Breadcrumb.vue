<script setup>
const props = defineProps({
	items: Array,
});
</script>

<template>
	<UBreadcrumb :items="items" />
</template>
