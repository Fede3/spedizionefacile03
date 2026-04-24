# Scripts

Questa cartella raccoglie script di supporto per sviluppo, bootstrap locale, diagnostica e manutenzione.

Regole:
- gli script canonici e riusabili restano qui
- i launcher locali specifici stanno in `local-tools/`
- i file di stato runtime locali stanno in `../output/runtime-state/`
- gli scratch temporanei stanno in `../output/scratch/`
- niente output, log o bundle temporanei dentro `scripts/`

Prima di aggiungere un nuovo script:
- verifica che non esista già uno script equivalente
- scegli un nome descrittivo e stabile
- documenta input e uso se non è immediato
