<script setup>
definePageMeta({
	middleware: ["sanctum:guest"],
});
navigateTo("/autenticazione");
</script>

<template>
	<div></div>
</template>
