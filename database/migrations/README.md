# Database Migrations

> Questa cartella è **intenzionalmente vuota**.

## Perché non ci sono migration files?

Lo schema database è gestito tramite **Laravel 11 schema:dump** (pattern ufficiale).

La fonte di verità è `database/schema/sqlite-schema.sql` (872 LOC) — uno snapshot
consolidato dello schema completo con tutte le 65+ tabelle dell'applicazione.

## Come funziona

Quando esegui `php artisan migrate:fresh`:

1. Laravel droppa tutte le tabelle esistenti
2. Crea la tabella `migrations` (ledger Laravel)
3. **Carica `database/schema/sqlite-schema.sql`** (ricrea TUTTO lo schema in 1 query)
4. Esegue eventuali migration files in questa cartella (oggi: nessuna)

Vantaggi:
- `migrate:fresh` è **istantaneo** (1 file SQL invece di 60+ migration sequenziali)
- 333 test backend con `RefreshDatabase` partono in 1 secondo invece di 30+
- Schema deterministico e leggibile

## Quando aggiungere una migration nuova

Per ogni cambio schema FUTURO:

```bash
php artisan make:migration add_xxx_to_yyy_table
# scrivi up()/down()
php artisan migrate
# quando ne hai N (es. 10+), consolida:
php artisan schema:dump --prune
# elimina i migration files mergiati nello schema dump
```

## Riferimenti

- Laravel docs: <https://laravel.com/docs/11.x/migrations#squashing-migrations>
- Schema attuale: `database/schema/sqlite-schema.sql`
- Per vedere DDL di una tabella: `grep "CREATE TABLE \"users\"" database/schema/sqlite-schema.sql -A 20`
