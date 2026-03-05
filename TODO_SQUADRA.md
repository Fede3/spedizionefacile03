# TODO SQUADRA (Turni Sequenziali)

1. CAPO - Definire ambito, vincoli, piano turni e criteri di accettazione misurabili.
2. ARCHITETTURA - Mappare repository e flussi attuali: creazione spedizione, etichetta, integrazione API BRT PUDO, notifiche email/messaggi.
3. ARCHITETTURA - Produrre documento tecnico con gap analysis e proposta implementativa per:
   - ritiro a domicilio via API;
   - creazione bordero;
   - invio automatico documenti/admin+cliente;
   - notifiche referral per utente Pro con consenso esplicito.
4. INTERFACCIA - Implementare o aggiornare UI/UX per:
   - richiesta ritiro a domicilio nella spedizione;
   - visibilità stato bordero/documenti;
   - gestione consenso notifiche email/messaggio per referral;
   - area notifiche referral sul sito.
5. LOGICA - Implementare backend/business logic:
   - chiamate API ritiro e bordero;
   - generazione documenti allegati;
   - dispatch email a admin e cliente;
   - trigger notifiche referral condizionate da consenso.
6. REVISIONE - Eseguire verifica funzionale end-to-end e regressione minima; aprire bug list con severità.
7. CAPO - Validare criteri di accettazione, chiudere ciclo, pianificare eventuale iterazione successiva.

## Criteri Di Accettazione Verificabili

1. Flusso spedizione con opzione ritiro a domicilio completabile senza errori, con evidenza di richiesta ritiro salvata.
2. Bordero generato per spedizioni idonee e disponibile nel sistema (file o record verificabile).
3. Dopo generazione documenti, invio email riuscito sia ad admin sia al cliente, con log verificabile.
4. Utente Pro con consenso attivo riceve notifica referral su sito e su canale/i abilitato/i; senza consenso non riceve notifiche.
5. Ogni turno aggiorna `_SQUADRA_DIARIO.md` con: attività svolta, file toccati, procedura di verifica.
