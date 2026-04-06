<script setup>
const buildGoogleReviewUrl = (review) => {
	const query = `SpediamoFacile recensione ${review.name} ${review.city}`;
	return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

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
];

const visibleReviews = reviews.map((review) => ({
	...review,
	googleUrl: buildGoogleReviewUrl(review),
}));
</script>

<template>
	<section class="hp-rev-section">
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
				<a
					v-for="(review, index) in visibleReviews"
					:key="`${review.name}-${index}`"
					class="hp-rev-card"
					:href="review.googleUrl"
					target="_blank"
					rel="noopener noreferrer nofollow"
					:aria-label="`Apri recensione Google di ${review.name}`">
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

					<p class="hp-rev-text">"{{ review.text }}"</p>

					<div class="hp-rev-foot">
						<span class="hp-rev-service">{{ review.service }}</span>
						<span class="hp-rev-open">
							Apri su Google
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
						</span>
					</div>
				</a>
			</div>
		</div>
	</section>
</template>

<!-- CSS in assets/css/recensioni.css -->
