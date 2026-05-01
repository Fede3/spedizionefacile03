<script setup>
// Newsletter sezione: form iscrizione (decorativa) + CTA preventivo finale.
</script>

<template>
	<div>
		<section class="py-12 md:py-16 bg-gradient-to-br from-brand-primary to-brand-primary-hover">
			<div class="max-w-4xl mx-auto px-4">
				<div class="grid md:grid-cols-2 gap-8 items-center text-white">
					<div class="space-y-3">
						<h2 class="font-display text-2xl md:text-3xl font-bold leading-tight">
							Ricevi le guide via email
						</h2>
						<p class="text-white/80 leading-relaxed">
							Iscriviti per ricevere nuove guide, consigli e aggiornamenti direttamente nella tua casella di posta.
						</p>
					</div>
					<form class="flex flex-col sm:flex-row gap-2" @submit.prevent>
						<input
							type="email"
							placeholder="La tua email..."
							class="flex-1 h-11 px-4 rounded-control bg-white/10 border border-white/20 text-white placeholder:text-white/60 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition"
						>
						<button
							type="submit"
							class="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-control bg-brand-accent text-white font-bold transition hover:bg-brand-accent-hover focus-visible:ring-2 focus-visible:ring-white"
						>
							Iscriviti
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M5 12h14" />
								<path d="m12 5 7 7-7 7" />
							</svg>
						</button>
					</form>
				</div>
			</div>
		</section>

		<section class="py-10 text-center">
			<NuxtLink
				to="/preventivo"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-pill bg-brand-accent text-white font-bold text-base shadow-sf transition hover:bg-brand-accent-hover hover:-translate-y-0.5 hover:shadow-sf-lg"
			>
				Calcola preventivo
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</NuxtLink>
		</section>
	</div>
</template>
