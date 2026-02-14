<!--
  FILE: pages/login.vue
  SCOPO: Redirect 301 a /autenticazione (compatibilita' vecchi link, preserva ?redirect).
  API: nessuna.
  ROUTE: /login (middleware sanctum:guest).
-->
<script setup>
// Solo utenti non autenticati
definePageMeta({
	middleware: ["sanctum:guest"],
});

// Redirect permanente alla pagina unificata di autenticazione
// Preserva il parametro redirect se presente nell'URL
const route = useRoute();
const redirectParam = route.query.redirect;
const target = redirectParam ? `/autenticazione?redirect=${encodeURIComponent(String(redirectParam))}` : '/autenticazione';
navigateTo(target, { redirectCode: 301 });
</script>

<template>
	<div></div>
</template>
