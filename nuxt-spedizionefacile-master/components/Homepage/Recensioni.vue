<script setup>
const reviews = [
	{
		name: 'Marco P.',
		role: 'E-commerce',
		city: 'Milano',
		date: '03 Marzo 2026',
		text: 'Prezzo chiaro da subito e consegna puntuale. Il flusso resta veloce anche quando preparo più colli.',
		service: 'Spedizione standard',
	},
	{
		name: 'Giulia R.',
		role: 'Privato',
		city: 'Roma',
		date: '01 Marzo 2026',
		text: 'Senza etichetta è stato decisivo: nessuna stampante, ritiro prenotato in pochi minuti.',
		service: 'Senza etichetta',
	},
	{
		name: 'Alessandro T.',
		role: 'PMI',
		city: 'Torino',
		date: '26 Febbraio 2026',
		text: 'Uso spesso il contrassegno: riepilogo finale chiaro e zero sorprese al checkout.',
		service: 'Contrassegno',
	},
	{
		name: 'Sara M.',
		role: 'Artigiana',
		city: 'Bologna',
		date: '22 Febbraio 2026',
		text: 'Assistenza rapida e interfaccia ordinata. Finalmente un flusso spedizione comprensibile.',
		service: 'Assicurazione',
	},
	{
		name: 'Luca C.',
		role: 'Marketplace Seller',
		city: 'Napoli',
		date: '19 Febbraio 2026',
		text: 'Dal preventivo al pagamento tutto lineare. Mi fa risparmiare tempo ogni settimana.',
		service: 'Ritiro a domicilio',
	},
	{
		name: 'Francesca N.',
		role: 'Privato',
		city: 'Cagliari',
		date: '16 Febbraio 2026',
		text: 'Scelta del punto BRT semplice e chiara. Ho trovato subito il ritiro più vicino.',
		service: 'Punto BRT',
	},
];

const visibleReviews = reviews.slice(0, 3);
</script>

<template>
	<section class="hp-rev-section cv-auto">
		<div class="my-container font-montserrat">
			<header class="hp-rev-head">
				<p class="hp-rev-eyebrow">Recensioni</p>
				<div class="hp-rev-title-row">
					<h2 class="hp-rev-title">Cosa dicono i clienti</h2>
					<span class="hp-rev-score-badge" aria-label="Valutazione media 4.9 su 5">4.9/5 · Verificate</span>
				</div>
				<p class="hp-rev-subtitle">Feedback reali su prezzo, chiarezza del flusso e puntualità del ritiro.</p>
			</header>

				<div class="hp-rev-grid">
					<article
						v-for="(review, index) in visibleReviews"
						:key="`${review.name}-${index}`"
						class="hp-rev-card">
					<div class="hp-rev-card-head">
						<div class="hp-rev-person">
							<div class="hp-rev-avatar" aria-hidden="true">{{ review.name.charAt(0) }}</div>
							<div>
								<p class="hp-rev-name">{{ review.name }}</p>
								<p class="hp-rev-role">{{ review.role }} · {{ review.city }}</p>
							</div>
						</div>
						<span class="hp-rev-verified">Verificata</span>
					</div>

					<div class="hp-rev-rating-row">
						<span class="hp-rev-stars">★★★★★</span>
						<span class="hp-rev-date">{{ review.date }}</span>
					</div>

					<p class="hp-rev-text">“{{ review.text }}”</p>

					<div class="hp-rev-foot">
						<span class="hp-rev-service">{{ review.service }}</span>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>

<style scoped>
.hp-rev-section {
	margin-top: 0;
	padding: 64px 0 96px;
	background: #f3f8fb;
}

.hp-rev-head {
	max-width: 900px;
	margin-inline: auto;
	text-align: center;
}

.hp-rev-eyebrow {
	font-size: 0.8125rem;
	font-weight: 700;
	letter-spacing: 0.28px;
	text-transform: uppercase;
	color: #0c6674;
}

.hp-rev-title-row {
	margin-top: 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	flex-wrap: wrap;
}

.hp-rev-title {
	font-size: clamp(1.9rem, 3.5vw, 2.9rem);
	line-height: 1.08;
	letter-spacing: -0.02em;
	font-weight: 800;
	color: #1d2738;
}

.hp-rev-score-badge {
	height: 32px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0 12px;
	border-radius: 999px;
	font-size: 0.78rem;
	font-weight: 700;
	color: #0a5f6d;
	background: #e7f4f9;
	border: 1px solid #c7e1eb;
}

.hp-rev-subtitle {
	margin-top: 12px;
	font-size: 1rem;
	line-height: 1.6;
	color: #5f6f80;
}

.hp-rev-grid {
	margin-top: 32px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
}

.hp-rev-card {
	width: 100%;
	min-height: 228px;
	padding: 18px;
	border-radius: 20px;
	border: 1px solid #d7e4eb;
	background: #ffffff;
	box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05), 0 18px 30px rgba(15, 23, 42, 0.07);
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.hp-rev-card-head {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 10px;
}

.hp-rev-person {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.hp-rev-avatar {
	width: 34px;
	height: 34px;
	border-radius: 999px;
	background: linear-gradient(160deg, #0c6674 0%, #1e4f89 100%);
	color: #fff;
	font-size: 0.88rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.hp-rev-name {
	font-size: 1rem;
	font-weight: 760;
	color: #1f2937;
}

.hp-rev-role {
	margin-top: 1px;
	font-size: 0.82rem;
	color: #667789;
}

.hp-rev-verified {
	height: 24px;
	padding: 0 10px;
	border-radius: 999px;
	font-size: 0.69rem;
	font-weight: 700;
	background: #ecf8f2;
	border: 1px solid #c8e9d8;
	color: #0a7a53;
	white-space: nowrap;
}

.hp-rev-rating-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.hp-rev-stars {
	font-size: 0.85rem;
	letter-spacing: 1px;
	color: #e44203;
}

.hp-rev-date {
	font-size: 0.75rem;
	color: #78879a;
}

.hp-rev-text {
	font-size: 0.95rem;
	line-height: 1.58;
	color: #36465a;
	flex: 1;
}

.hp-rev-foot {
	margin-top: auto;
}

.hp-rev-service {
	height: 25px;
	display: inline-flex;
	align-items: center;
	padding: 0 10px;
	border-radius: 999px;
	font-size: 0.74rem;
	font-weight: 700;
	color: #0a5f6d;
	background: #ebf7fb;
	border: 1px solid #d0e4ec;
}

@media (min-width: 48rem) {
	.hp-rev-section {
		padding: 72px 0 104px;
	}

	.hp-rev-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
}

@media (max-width: 34rem) {
	.hp-rev-section {
		padding: 52px 0 78px;
	}

	.hp-rev-card {
		border-radius: 18px;
		padding: 16px;
	}

	.hp-rev-title-row {
		gap: 8px;
	}
}
</style>
