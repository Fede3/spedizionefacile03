# Launcher Claude Locali

Questa cartella raccoglie utility locali di continuita' sessione per Claude/Codex
che non fanno parte del runtime del prodotto.

Regole:
- tenerle qui, non in root
- non usarle come fonte documentale
- se diventano obsolete, archiviarle o rimuoverle

Contenuto:
- `RIPRENDI_CLAUDE_ATTUALE.cmd` - riapre la sessione Claude piu' recente nota
- `RIPRENDI_CLAUDE_COMPLETO.cmd` - usa il recovery launcher completo
- `claude-recover.cmd` - recovery locale con resume/continue e fallback
- `claude-session-snapshot.ps1` - snapshot metadati sessione per il recovery
