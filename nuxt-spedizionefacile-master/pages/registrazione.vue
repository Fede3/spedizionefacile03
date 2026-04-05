<!--
  FILE: pages/registrazione.vue
  SCOPO: Redirect permanente a /autenticazione (compatibilita' vecchi link).
  API: nessuna.
  ROUTE: /registrazione (middleware sanctum:guest).
-->
<script setup>
// Solo utenti non autenticati
definePageMeta({
	middleware: ["guest-auth"],
});

// Redirect alla pagina unificata di autenticazione
navigateTo("/autenticazione");
</script>

<template>
	<div></div>
</template>
