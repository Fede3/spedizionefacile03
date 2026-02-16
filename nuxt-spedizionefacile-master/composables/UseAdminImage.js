/**
 * COMPOSABLE: useAdminImage (UseAdminImage.js)
 * SCOPO: Carica l'immagine hero personalizzata impostata dall'admin del sito.
 *
 * DOVE SI USA: components/ContenutoHeader.vue (immagine hero della homepage)
 *
 * COSA RESTITUISCE:
 *   - data: ref con i dati dell'immagine ({image_url: "https://..."} o null)
 *   - refresh: funzione per ricaricare l'immagine dal server
 *   - status: stato della richiesta ("idle", "pending", "success", "error")
 * ESEMPIO D'USO: const { data } = useAdminImage()
 *                → data.value?.image_url (URL immagine, o null = usa immagine predefinita)
 *
 * VINCOLI: l'API e' pubblica (non richiede autenticazione)
 * ERRORI TIPICI: non gestire il caso data.value = null (nessuna immagine caricata)
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Http/Controllers/HomepageImageController.php,
 *               pages/account/amministrazione/immagine-homepage.vue (pannello admin per caricare)
 */
export const useAdminImage = () => {
	const { data, refresh, status } = useSanctumFetch("/api/public/homepage-image", {
		method: "GET",
		key: "admin-homepage-image",
		lazy: true,
		dedupe: "defer",
	});

	return { data, refresh, status };
};
