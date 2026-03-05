<!--
  FILE: pages/account/index.vue
  SCOPO: Dashboard account — griglia card con link a tutte le sezioni (spedizioni, pagamenti, profilo, admin).

  API: nessuna chiamata diretta (usa useSanctumAuth per dati utente e ruolo).
  COMPONENTI: nessuno di esterno (solo NuxtLink per navigazione).
  ROUTE: /account (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (legge il ruolo utente da useSanctumAuth).
  DATI IN USCITA: navigazione alle sotto-pagine account.

  VINCOLI: le icone SVG sono inline (NON usare componente Icon) per rendering garantito.
           Le sezioni admin sono filtrate in base al ruolo (isAdmin computed).
  ERRORI TIPICI: aggiungere una pagina senza impostare visible correttamente.
  PUNTI DI MODIFICA SICURI: aggiungere/rimuovere card in sections[], testi, icone SVG.
  COLLEGAMENTI: tutte le sotto-pagine /account/*, composables/useSanctumAuth.
-->
<script setup>
/* Richiede che l'utente sia autenticato per accedere a questa pagina */
definePageMeta({
	middleware: ["sanctum:auth"],
});

/* Recupera i dati dell'utente loggato e la funzione per fare logout */
const { user, logout } = useSanctumAuth();

const isAdmin = computed(() => user.value?.role === "Admin");
const isProOrAdmin = computed(() => user.value?.role === "Partner Pro" || user.value?.role === "Admin");

/**
 * Icone SVG inline per ogni card della dashboard.
 * Usiamo SVG inline per garantire che siano sempre visibili senza
 * dipendere dal modulo @nuxt/icon o dal CDN Iconify.
 * Ogni SVG e' un path Material Design Icons a 24x24 viewBox.
 */
const cardIcons = {
	/* Truck fast - Le mie spedizioni */
	"truck-fast": '<path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/>',
	/* Package variant closed - Spedizioni configurate */
	"package": '<path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/>',
	/* Credit card outline - Carte e pagamenti */
	"credit-card": '<path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>',
	/* Wallet outline - Portafoglio */
	"wallet": '<path d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V16.72C21.59,16.37 22,15.74 22,15V9C22,8.26 21.59,7.63 21,7.28V5A2,2 0 0,0 19,3H5M5,5H19V7H13A2,2 0 0,0 11,9V15A2,2 0 0,0 13,17H19V19H5V5M13,9H20V15H13V9M16,10.5A1.5,1.5 0 0,0 14.5,12A1.5,1.5 0 0,0 16,13.5A1.5,1.5 0 0,0 17.5,12A1.5,1.5 0 0,0 16,10.5Z"/>',
	/* Bank transfer out - Prelievi */
	"bank-transfer": '<path d="M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z"/>',
	/* Account outline - Profilo e dati */
	"account": '<path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M12,13C14.67,13 20,14.33 20,17V20H4V17C4,14.33 9.33,13 12,13M12,14.9C9.03,14.9 5.9,16.36 5.9,17V18.1H18.1V17C18.1,16.36 14.97,14.9 12,14.9Z"/>',
	/* Map marker outline - Indirizzi */
	"map-marker": '<path d="M12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,10 7,12 12,18.71C17,12 17,10 17,9A5,5 0 0,0 12,4Z"/>',
	/* Headset - Assistenza */
	"headset": '<path d="M12,1C7,1 3,5 3,10V17A3,3 0 0,0 6,20H9V12H5V10A7,7 0 0,1 12,3A7,7 0 0,1 19,10V12H15V20H18A3,3 0 0,0 21,17V10C21,5 16.97,1 12,1Z"/>',
	/* Chart box outline - Dashboard */
	"chart-box": '<path d="M9,17H7V10H9M13,17H11V7H13M17,17H15V13H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>',
	/* Clipboard list outline - Ordini */
	"clipboard-list": '<path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/>',
	/* Truck delivery outline - Spedizioni BRT */
	"truck-delivery": '<path d="M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z"/>',
	/* Account group outline - Utenti */
	"account-group": '<path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>',
	/* Admin wallet */
	"admin-wallet": '<path d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V16.72C21.59,16.37 22,15.74 22,15V9C22,8.26 21.59,7.63 21,7.28V5A2,2 0 0,0 19,3H5M5,5H19V7H13A2,2 0 0,0 11,9V15A2,2 0 0,0 13,17H19V19H5V5M13,9H20V15H13V9M16,10.5A1.5,1.5 0 0,0 14.5,12A1.5,1.5 0 0,0 16,13.5A1.5,1.5 0 0,0 17.5,12A1.5,1.5 0 0,0 16,10.5Z"/>',
	/* Admin bank transfer */
	"admin-bank": '<path d="M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z"/>',
	/* Share variant - Referral */
	"share-variant": '<path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"/>',
	/* Book open outline - Guide */
	"book-open": '<path d="M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M3,19V6H11V19H3M21,19H13V6H21V19M14,9.5H20V11H14V9.5M14,12H20V13.5H14V12M14,14.5H20V16H14V14.5Z"/>',
	/* Cog outline - Servizi */
	"services-cog": '<path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>',
	/* Image outline - Immagine homepage */
	"image": '<path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>',
	/* Tag multiple outline - Prezzi e fasce */
	"tag-multiple": '<path d="M5.5,9A1.5,1.5 0 0,0 7,7.5A1.5,1.5 0 0,0 5.5,6A1.5,1.5 0 0,0 4,7.5A1.5,1.5 0 0,0 5.5,9M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.77 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58M13.54,5.71L14.54,4.71L21.41,11.58C21.78,11.94 22,12.45 22,13C22,13.55 21.78,14.05 21.42,14.41L16.04,19.79L15.04,18.79L20.75,13L13.54,5.71Z"/>',
	/* Email outline - Messaggi */
	"email": '<path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>',
	/* Cog outline - Impostazioni */
	"cog-outline": '<path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97C4.53,12.65 4.5,12.33 4.5,12C4.5,11.67 4.53,11.34 4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11C19.47,11.34 19.5,11.67 19.5,12C19.5,12.33 19.47,12.65 19.43,12.97L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.94C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10Z"/>',
	/* Bug outline - Test BRT */
	"bug": '<path d="M14,12H10V10H14M14,16H10V14H14M20,8H17.19C16.74,7.22 16.12,6.55 15.37,6.04L17,4.41L15.59,3L13.42,5.17C12.96,5.06 12.5,5 12,5C11.5,5 11.04,5.06 10.59,5.17L8.41,3L7,4.41L8.62,6.04C7.88,6.55 7.26,7.22 6.81,8H4V10H6.09C6.04,10.33 6,10.66 6,11V12H4V14H6V15C6,15.34 6.04,15.67 6.09,16H4V18H6.81C7.85,19.79 9.78,21 12,21C14.22,21 16.15,19.79 17.19,18H20V16H17.91C17.96,15.67 18,15.34 18,15V14H20V12H18V11C18,10.66 17.96,10.33 17.91,10H20V8Z"/>',
};

/**
 * Sezioni della dashboard account, ognuna con un titolo, descrizione
 * e una lista di pagine. Le pagine hanno un flag "visible" per filtrare
 * in base al ruolo dell'utente.
 * Le icone usano chiavi che mappano a SVG inline (oggetto cardIcons sopra)
 * per garantire rendering immediato senza dipendenze esterne.
 */
const sections = computed(() => [
	{
		title: "Gestione operativa",
		description: "Dashboard, ordini, spedizioni e gestione utenti.",
		adminOnly: true,
		pages: [
			{
				title: "Dashboard",
				description: "Panoramica generale del sistema: statistiche, ordini recenti e attivita'.",
				url: "/amministrazione",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "chart-box",
				iconColor: "#7c3aed",
			},
			{
				title: "Ordini",
				description: "Visualizza e gestisci tutti gli ordini. Controlla stati e dettagli.",
				url: "/amministrazione/ordini",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "clipboard-list",
				iconColor: "#7c3aed",
			},
			{
				title: "Spedizioni BRT",
				description: "Monitora le spedizioni BRT. Genera etichette e controlla i tracking.",
				url: "/amministrazione/spedizioni",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "truck-delivery",
				iconColor: "#7c3aed",
			},
			{
				title: "Utenti",
				description: "Gestisci gli utenti registrati. Ruoli, stati e informazioni account.",
				url: "/amministrazione/utenti",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "account-group",
				iconColor: "#7c3aed",
			},
		],
	},
	{
		title: "Finanze admin",
		description: "Portafogli utenti, prelievi e programma referral.",
		adminOnly: true,
		pages: [
			{
				title: "Portafogli",
				description: "Controlla i saldi e i movimenti dei portafogli di tutti gli utenti.",
				url: "/amministrazione/portafogli",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "admin-wallet",
				iconColor: "#7c3aed",
			},
			{
				title: "Prelievi",
				description: "Gestisci le richieste di prelievo. Approva o rifiuta gli accrediti.",
				url: "/amministrazione/prelievi",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "admin-bank",
				iconColor: "#7c3aed",
			},
			{
				title: "Referral",
				description: "Monitora il programma referral. Statistiche e utilizzo codici.",
				url: "/amministrazione/referral",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "share-variant",
				iconColor: "#7c3aed",
			},
		],
	},
	{
		title: "Contenuti sito",
		description: "Guide, servizi, immagini e configurazione prezzi.",
		adminOnly: true,
		pages: [
			{
				title: "Guide",
				description: "Crea e modifica le guide del sito per gli utenti.",
				url: "/amministrazione/guide",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "book-open",
				iconColor: "#7c3aed",
			},
			{
				title: "Servizi",
				description: "Configura i servizi disponibili sul sito e le relative descrizioni.",
				url: "/amministrazione/servizi",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "services-cog",
				iconColor: "#7c3aed",
			},
			{
				title: "Immagine homepage",
				description: "Gestisci l'immagine principale della homepage del sito.",
				url: "/amministrazione/immagine-homepage",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "image",
				iconColor: "#7c3aed",
			},
			{
				title: "Prezzi e fasce",
				description: "Configura le fasce di prezzo per peso e volume delle spedizioni.",
				url: "/amministrazione/prezzi",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "tag-multiple",
				iconColor: "#7c3aed",
			},
			{
				title: "Coupon e sconti",
				description: "Crea e gestisci codici sconto per i clienti.",
				url: "/amministrazione/coupon",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "tag-multiple",
				iconColor: "#7c3aed",
			},
		],
	},
	{
		title: "Sistema",
		description: "Messaggi, impostazioni generali e strumenti di test.",
		adminOnly: true,
		pages: [
			{
				title: "Messaggi",
				description: "Visualizza i messaggi di contatto ricevuti dagli utenti.",
				url: "/amministrazione/messaggi",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "email",
				iconColor: "#7c3aed",
			},
			{
				title: "Impostazioni",
				description: "Configura le impostazioni generali del sito e del sistema.",
				url: "/amministrazione/impostazioni",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "cog-outline",
				iconColor: "#7c3aed",
			},
			{
				title: "Test BRT",
				description: "Strumenti di test per l'integrazione con il corriere BRT.",
				url: "/amministrazione/test-brt",
				visible: isAdmin.value,
				iconBg: "bg-[#f3e8ff]",
				iconKey: "bug",
				iconColor: "#7c3aed",
			},
		],
	},
	{
		title: "Spedizioni",
		description: "Gestisci le tue spedizioni e i pacchi configurati.",
		pages: [
			{
				title: "Le mie spedizioni",
				description: "Crea una nuova spedizione o riprendi una bozza. Controlla stato, etichetta e tracking.",
				url: "/spedizioni",
				visible: true,
				iconBg: "bg-[#e8f4fb]",
				iconKey: "truck-fast",
				iconColor: "#1a7fba",
			},
			{
				title: "Spedizioni configurate",
				description: "Visualizza le spedizioni configurate nel carrello pronte per il pagamento.",
				url: "/spedizioni-configurate",
				visible: true,
				iconBg: "bg-[#e6f7f5]",
				iconKey: "package",
				iconColor: "#0a8a7a",
			},
		],
	},
	{
		title: "Pagamenti",
		description: "Metodi di pagamento, portafoglio e prelievi.",
		pages: [
			{
				title: "Carte e pagamenti",
				description: "Gestisci i metodi di pagamento e le preferenze. Visualizza lo storico dei pagamenti.",
				url: "/carte",
				visible: true,
				iconBg: "bg-[#e8f4fb]",
				iconKey: "credit-card",
				iconColor: "#1a7fba",
			},
			{
				title: "Portafoglio",
				description: "Ricarica il portafoglio e paga piu' velocemente le spedizioni. Consulta saldo e movimenti.",
				url: "/portafoglio",
				visible: true,
				iconBg: "bg-[#e6f7f5]",
				iconKey: "wallet",
				iconColor: "#0a8a7a",
			},
			{
				title: "Prelievi",
				description: "Richiedi l'accredito del saldo disponibile. Controlla stato e tempi di pagamento.",
				url: "/prelievi",
				visible: isProOrAdmin.value,
				iconBg: "bg-[#e8f4fb]",
				iconKey: "bank-transfer",
				iconColor: "#1a7fba",
			},
		],
	},
	{
		title: "Profilo",
		description: "Dati personali, indirizzi salvati e supporto.",
		pages: [
			{
				title: "Profilo e dati",
				description: "Aggiorna i tuoi dati personali e di fatturazione. Modifica email e password in sicurezza.",
				url: "/profilo",
				visible: true,
				iconBg: "bg-[#e8f4fb]",
				iconKey: "account",
				iconColor: "#1a7fba",
			},
			{
				title: "Indirizzi",
				description: "Salva mittenti e destinatari. Riutilizza indirizzi e rendi piu' veloce ogni ordine.",
				url: "/indirizzi",
				visible: true,
				iconBg: "bg-[#e6f7f5]",
				iconKey: "map-marker",
				iconColor: "#0a8a7a",
			},
			{
				title: "Assistenza",
				description: "Apri un ticket o contattaci. Segui risposte e aggiornamenti sulle tue richieste.",
				url: "/assistenza",
				visible: true,
				iconBg: "bg-[#e8f4fb]",
				iconKey: "headset",
				iconColor: "#1a7fba",
			},
		],
	},
]);

/* Filtra le sezioni: mostra solo quelle che hanno almeno una pagina visibile.
   Le sezioni admin appaiono dopo le sezioni utente. */
const visibleSections = computed(() => {
	return sections.value
		.map(section => ({
			...section,
			pages: section.pages.filter(page => page.visible),
		}))
		.filter(section => section.pages.length > 0);
});

/* Indica se il logout e' in corso (per mostrare "Uscita..." sul bottone) */
const isLoggingOut = ref(false);

/* Funzione chiamata quando l'utente clicca "Esci" per uscire dall'account */
const handleLogout = async () => {
	isLoggingOut.value = true;
	try {
		await logout();
	} finally {
		isLoggingOut.value = false;
	}
};
</script>

<template>
	<!-- Header with wave background -->
	<div class="relative bg-gradient-to-br from-[#d5dde0] via-[#e2e7ea] to-[#d8dfe3] pt-[40px] pb-[60px] desktop:pt-[50px] desktop:pb-[70px] overflow-hidden">
		<!-- Decorative wave shapes -->
		<div class="absolute inset-0 opacity-30">
			<svg class="absolute top-0 left-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
				<path fill="rgba(255,255,255,0.4)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
			</svg>
			<svg class="absolute top-[20px] left-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
				<path fill="rgba(255,255,255,0.25)" d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,138.7C960,117,1056,107,1152,117.3C1248,128,1344,160,1392,176L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
			</svg>
		</div>
		<div class="my-container relative z-10">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-[1.75rem] desktop:text-[2.25rem] font-bold text-[#252B42] tracking-tight">
						Il tuo account
					</h1>
					<p class="text-[0.875rem] text-[#555] mt-[4px]">
						<span v-if="user?.role === 'Partner Pro'" class="inline-block px-[8px] py-[2px] rounded-full bg-[#095866]/10 text-[#095866] text-[0.75rem] font-medium mr-[6px]">Partner Pro</span>
						<span v-else-if="user?.role === 'Admin'" class="inline-block px-[8px] py-[2px] rounded-full bg-purple-100 text-purple-700 text-[0.75rem] font-medium mr-[6px]">Admin</span>
						Ciao, {{ user?.name }} {{ user?.surname }}
					</p>
				</div>
				<button
					@click="handleLogout"
					:disabled="isLoggingOut"
					class="px-[20px] py-[10px] bg-white/70 backdrop-blur-sm border border-[#d0d0d0] rounded-[12px] text-[0.875rem] text-[#555] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-[color,border-color,background-color] cursor-pointer">
					{{ isLoggingOut ? "Uscita..." : "Esci" }}
				</button>
			</div>
		</div>
	</div>

	<!-- Quick actions -->
	<div class="my-container -mt-[28px] relative z-20">
		<div class="flex flex-wrap gap-[10px]">
			<NuxtLink
				to="/preventivo"
				class="inline-flex items-center gap-[8px] px-[20px] py-[12px] bg-[#095866] text-white rounded-[12px] text-[0.875rem] font-semibold hover:bg-[#074a56] transition-[background-color] shadow-sm btn-hover">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
				Nuova spedizione
			</NuxtLink>
			<NuxtLink
				to="/carrello"
				class="inline-flex items-center gap-[8px] px-[20px] py-[12px] bg-white text-[#252B42] rounded-[12px] text-[0.875rem] font-medium border border-[#E9EBEC] hover:border-[#095866] hover:text-[#095866] transition-[border-color,color] shadow-sm">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z"/></svg>
				Vai al carrello
			</NuxtLink>
			<NuxtLink
				to="/traccia-spedizione"
				class="inline-flex items-center gap-[8px] px-[20px] py-[12px] bg-white text-[#252B42] rounded-[12px] text-[0.875rem] font-medium border border-[#E9EBEC] hover:border-[#095866] hover:text-[#095866] transition-[border-color,color] shadow-sm">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18C3,16.69 3.83,15.58 5,15.17V7.83C3.83,7.42 3,6.31 3,5A3,3 0 0,1 6,2A3,3 0 0,1 9,5C9,6.31 8.17,7.42 7,7.83V15.17C8.17,15.58 9,16.69 9,18M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M6,4A1,1 0 0,0 5,5A1,1 0 0,0 6,6A1,1 0 0,0 7,5A1,1 0 0,0 6,4M12,11V13H9.09C9.27,12.37 9.55,11.78 9.91,11.22L12,11M18,9A3,3 0 0,1 21,12H19C19,11.45 18.55,11 18,11A1,1 0 0,0 17,12V13H15V12A3,3 0 0,1 18,9Z"/></svg>
				Traccia spedizione
			</NuxtLink>
		</div>
	</div>

	<!-- Sections -->
	<section class="py-[32px] desktop:py-[48px]">
		<div class="my-container">
			<div
				v-for="(section, sectionIndex) in visibleSections"
				:key="sectionIndex"
				:class="[
					'mb-[40px] last:mb-0',
					sectionIndex > 0 ? 'pt-[32px]' : '',
				]">
				<!-- Linea separatrice colorata tra le sezioni -->
				<div v-if="sectionIndex > 0" :class="['h-[3px] rounded-full mb-[28px]', section.adminOnly ? 'bg-purple-300' : 'bg-[#095866]/30']"></div>
				<!-- Titolo sezione centrato -->
				<div class="mb-[20px] text-center">
					<h2 :class="[
						'text-[1.125rem] desktop:text-[1.25rem] font-bold tracking-tight',
						section.adminOnly ? 'text-purple-700' : 'text-[#252B42]',
					]">
						{{ section.title }}
					</h2>
					<p class="text-[0.8125rem] text-[#737373] mt-[2px]">{{ section.description }}</p>
				</div>

				<!-- Cards grid - justify-center per centrare le card quando non riempiono la riga -->
				<ul class="grid grid-cols-1 account-pages:grid-cols-2 desktop:grid-cols-3 gap-[16px] desktop:gap-[20px] justify-items-center">
					<li
						v-for="(page, pageIndex) in section.pages"
						:key="pageIndex"
						class="w-full max-w-[360px]">
						<NuxtLink
							:to="`/account${page.url}`"
							:class="[
								'account-card flex flex-col items-center text-center h-full min-h-[200px] desktop:min-h-[220px] rounded-[16px] p-[24px] desktop:p-[28px] transition-[transform,box-shadow,background-color] duration-200 group hover:-translate-y-[2px] border contain-content',
								section.adminOnly
									? 'bg-purple-50/60 border-purple-100 hover:bg-purple-50 hover:shadow-[0_6px_20px_rgba(124,58,237,0.1)]'
									: 'bg-white border-[#E9EBEC] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
							]">
							<!-- Icon (SVG inline per rendering garantito senza dipendenze esterne) -->
							<div :class="['w-[56px] h-[56px] rounded-full flex items-center justify-center mb-[14px]', page.iconBg]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" :fill="page.iconColor" v-html="cardIcons[page.iconKey]"></svg>
							</div>
							<!-- Title -->
							<h3 :class="[
								'text-[0.9375rem] desktop:text-[1.0625rem] font-bold tracking-[0.1px] transition-colors',
								section.adminOnly
									? 'text-purple-900 group-hover:text-purple-700'
									: 'text-[#252B42] group-hover:text-[#095866]',
							]">
								{{ page.title }}
							</h3>
							<!-- Description -->
							<p class="text-[#737373] text-[0.8125rem] tracking-[0.2px] leading-[1.6] mt-[6px] flex-1">
								{{ page.description }}
							</p>
						</NuxtLink>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
