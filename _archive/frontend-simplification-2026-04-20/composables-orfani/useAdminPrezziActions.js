/**
 * COMPOSABLE: useAdminPrezziActions (useAdminPrezziActions.js)
 * SCOPO: Azioni CRUD su fasce, supplementi, servizi, regole Europa e ladder.
 *        Estratto da useAdminPrezzi.js per ridurre la complessita'.
 *
 * DOVE SI USA: Importato internamente da useAdminPrezzi.js — non usare direttamente.
 */

// ────────────────────────────────────────────────────────────
// Actions factory
// ────────────────────────────────────────────────────────────

/**
 * Crea tutte le azioni per editing fasce, supplementi, servizi ed Europa.
 * @param {Object} deps - Dipendenze iniettate dal composable principale.
 * @param {Object} deps.state - Stato reattivo da useAdminPrezziState.
 * @param {Function} deps.euroToCents - Conversione euro -> centesimi.
 * @param {Function} deps.showError - Mostra errore via useAdmin.
 * @param {Function} deps.normalizeLadderForPayload - Normalizza ladder rows.
 * @returns {Object} Oggetto con tutte le azioni.
 */
export function useAdminPrezziActions(deps) {
	const {
		state,
		euroToCents,
		showError,
		normalizeLadderForPayload,
	} = deps;

	const {
		weightBands, volumeBands,
		extraRules, supplementRules,
		editingCell, editValue,
	} = state;

	// ── Utility ───────────────────────────────────────
	const incrementCentsToEuro = (value) => (Number(value || 0) / 100).toFixed(2).replace('.', ',');

	const updateLadderIncrementFromEuro = (row, rawValue) => {
		const cents = euroToCents(rawValue);
		row.increment_cents = Math.max(0, cents ?? 0);
	};

	// ── Ladder helpers ────────────────────────────────
	const ladderRowsFor = (kind) => {
		return kind === 'weight' ? extraRules.value.weight_increment_ladder : extraRules.value.volume_increment_ladder;
	};

	const addLadderRow = (kind) => {
		const rows = ladderRowsFor(kind);
		const payloadRows = normalizeLadderForPayload(rows, extraRules.value.increment_cents);
		const last = payloadRows[payloadRows.length - 1] || { from_step: 1, to_step: null, increment_cents: Number(extraRules.value.increment_cents || 0) };
		const fromStep = last.to_step == null ? (last.from_step + 1) : (last.to_step + 1);
		rows.push({
			from_step: fromStep,
			to_step: null,
			increment_cents: Number(last.increment_cents || extraRules.value.increment_cents || 0),
		});
	};

	const removeLadderRow = (kind, idx) => {
		const rows = ladderRowsFor(kind);
		if (rows.length <= 1) {
			showError(null, 'Deve rimanere almeno uno scaglione incremento.');
			return;
		}
		rows.splice(idx, 1);
	};

	const ensureLadderContinuity = (kind) => {
		const rows = ladderRowsFor(kind);
		const normalized = normalizeLadderForPayload(rows, extraRules.value.increment_cents);
		const rebuilt = normalized.map((row, idx) => ({
			from_step: idx === 0 ? 1 : normalized[idx - 1].to_step + 1,
			to_step: idx === normalized.length - 1 ? null : (row.to_step ?? row.from_step),
			increment_cents: row.increment_cents,
		}));
		if (kind === 'weight') {
			extraRules.value.weight_increment_ladder = rebuilt;
		} else {
			extraRules.value.volume_increment_ladder = rebuilt;
		}
	};

	// ── Band edit actions ─────────────────────────────
	const startEdit = (type, idx, field) => {
		const key = `${type}-${idx}-${field}`;
		editingCell.value = key;
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const cents = bands[idx][field];
		editValue.value = cents != null ? (Number(cents) / 100).toFixed(2).replace('.', ',') : '';
		nextTick(() => {
			const input = document.getElementById(`edit-${key}`);
			if (input) { input.focus(); input.select(); }
		});
	};

	const confirmEdit = (type, idx, field) => {
		const key = `${type}-${idx}-${field}`;
		if (editingCell.value !== key) return;
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const newCents = euroToCents(editValue.value);
		if (newCents !== null && newCents < 0) {
			showError(null, "Il prezzo non può essere negativo.");
			editingCell.value = null;
			editValue.value = '';
			return;
		}
		bands[idx][field] = newCents;
		editingCell.value = null;
		editValue.value = '';
	};

	const cancelEdit = () => {
		editingCell.value = null;
		editValue.value = '';
	};

	const toggleShowDiscount = (type, idx) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		bands[idx].show_discount = !bands[idx].show_discount;
	};

	const addBand = (type) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const last = bands[bands.length - 1];
		const min = last ? Number(last.max_value) : 0;
		const max = Number((min + (type === 'weight' ? 50 : 0.2)).toFixed(3));
		bands.push({
			id: `${type}-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			type,
			min_value: Number(min.toFixed(3)),
			max_value: max,
			base_price: last ? Number(last.base_price || 0) : 0,
			discount_price: null,
			show_discount: true,
			sort_order: bands.length + 1,
		});
	};

	const removeBand = (type, idx) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		if (bands.length <= 1) {
			showError(null, "Deve rimanere almeno una fascia.");
			return;
		}
		bands.splice(idx, 1);
	};

	const moveBand = (type, idx, direction) => {
		const bands = type === 'weight' ? weightBands.value : volumeBands.value;
		const target = idx + direction;
		if (target < 0 || target >= bands.length) return;
		[bands[idx], bands[target]] = [bands[target], bands[idx]];
	};

	// ── Supplement actions ─────────────────────────────
	const addSupplement = () => {
		supplementRules.value.push({
			id: `supplement-${Date.now()}`,
			prefix: '',
			amount_cents: 0,
			apply_to: 'both',
			enabled: true,
		});
	};

	const removeSupplement = (idx) => {
		supplementRules.value.splice(idx, 1);
	};

	const supplementAmountToEuro = (rule) => {
		const cents = Number(rule?.amount_cents || 0);
		return (cents / 100).toFixed(2).replace('.', ',');
	};

	const updateSupplementAmountFromEuro = (rule, rawValue) => {
		const cleaned = String(rawValue || '').replace(/[€\s]/g, '').replace(',', '.');
		const value = Number.parseFloat(cleaned);
		if (!Number.isFinite(value) || value < 0) {
			rule.amount_cents = 0;
			return;
		}
		rule.amount_cents = Math.round(value * 100);
	};

	// ── Service / keyed rule helpers ──────────────────
	const keyedRuleAmountToEuro = (rule) => (Number(rule?.price_cents || 0) / 100).toFixed(2).replace('.', ',');

	const updateKeyedRuleAmountFromEuro = (rule, rawValue) => {
		const cents = euroToCents(rawValue);
		rule.price_cents = Math.max(0, cents ?? 0);
	};

	const keyedRuleMinFeeToEuro = (rule) => (Number(rule?.min_fee_cents || 0) / 100).toFixed(2).replace('.', ',');

	const updateKeyedRuleMinFeeFromEuro = (rule, rawValue) => {
		const cents = euroToCents(rawValue);
		rule.min_fee_cents = Math.max(0, cents ?? 0);
	};

	const normalizeArrayFieldInput = (rawValue, { uppercase = false } = {}) =>
		String(rawValue || '')
			.split(',')
			.map((item) => String(item || '').trim())
			.filter(Boolean)
			.map((item) => uppercase ? item.toUpperCase() : item.toLowerCase());

	const updateArrayField = (rule, field, rawValue, { uppercase = false } = {}) => {
		rule[field] = normalizeArrayFieldInput(rawValue, { uppercase });
	};

	const addTierRow = (rule) => {
		const last = Array.isArray(rule.tiers) && rule.tiers.length ? rule.tiers[rule.tiers.length - 1] : null;
		rule.tiers = Array.isArray(rule.tiers) ? rule.tiers : [];
		rule.tiers.push({
			up_to_kg: last?.up_to_kg != null ? Number(last.up_to_kg) + 5 : null,
			price_cents: Number(last?.price_cents || 0),
		});
	};

	const removeTierRow = (rule, idx) => {
		if (!Array.isArray(rule.tiers) || rule.tiers.length <= 1) {
			showError(null, 'Serve almeno uno scaglione per la regola selezionata.');
			return;
		}
		rule.tiers.splice(idx, 1);
	};

	// ── Europe rate helpers ───────────────────────────
	const updateEuropeRateAmountFromEuro = (rate, rawValue) => {
		const cents = euroToCents(rawValue);
		rate.price_cents = cents == null ? null : Math.max(0, cents);
	};

	const toggleEuropeRateQuote = (rate) => {
		rate.quote_required = !rate.quote_required;
		if (rate.quote_required) {
			rate.price_cents = null;
		}
	};

	return {
		// Utility
		incrementCentsToEuro, updateLadderIncrementFromEuro,
		// Ladder
		ladderRowsFor, addLadderRow, removeLadderRow, ensureLadderContinuity,
		// Band actions
		startEdit, confirmEdit, cancelEdit, toggleShowDiscount,
		addBand, removeBand, moveBand,
		// Supplement actions
		addSupplement, removeSupplement, supplementAmountToEuro, updateSupplementAmountFromEuro,
		// Service/keyed rule helpers
		keyedRuleAmountToEuro, updateKeyedRuleAmountFromEuro,
		keyedRuleMinFeeToEuro, updateKeyedRuleMinFeeFromEuro,
		updateArrayField, addTierRow, removeTierRow,
		// Europe helpers
		updateEuropeRateAmountFromEuro, toggleEuropeRateQuote,
	};
}
