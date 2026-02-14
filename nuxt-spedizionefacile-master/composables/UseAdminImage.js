/**
 * COMPOSABLE IMMAGINE ADMIN (useAdminImage)
 *
 * Questa e' una "funzione riutilizzabile" che carica l'immagine personalizzata
 * impostata dall'amministratore del sito.
 * I composable sono funzioni che si possono usare in piu' pagine del sito
 * senza dover riscrivere lo stesso codice ogni volta.
 *
 * L'immagine viene usata nell'header della homepage: se l'admin ha caricato
 * un'immagine dal pannello di amministrazione, viene mostrata quella.
 * Se non c'e' nessuna immagine personalizzata, il sito mostra l'immagine predefinita.
 *
 * Restituisce:
 * - data: i dati dell'immagine (contiene image_url con l'indirizzo dell'immagine)
 * - refresh: funzione per ricaricare l'immagine dal server
 * - status: lo stato della richiesta (caricamento, completato, errore)
 */
export const useAdminImage = () => {
	const { data, refresh, status } = useSanctumFetch("/api/public/homepage-image", {
		method: "GET",
	});

	return { data, refresh, status };
};
