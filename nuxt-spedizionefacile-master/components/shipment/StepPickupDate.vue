<!--
  FILE: components/shipment/StepPickupDate.vue
  SCOPO: Sezione data di ritiro con carosello orizzontale — estratta da [step].vue.
-->
<script setup>
const pickupTrackRef = ref(null);

defineProps({
	dateError: { type: String, default: null },
	daysInMonth: { type: Array, required: true },
	services: { type: Object, required: true },
});

const emit = defineEmits(["choose-date"]);

const scrollPickupDates = (direction) => {
	const track = pickupTrackRef.value;
	if (!track) return;

	const delta = Math.max(240, Math.round(track.clientWidth * 0.78));
	track.scrollBy({
		left: direction === "next" ? delta : -delta,
		behavior: "smooth",
	});
};
</script>

<template>
	<div class="scroll-mt-[120px] w-full">
		<div
			v-if="dateError"
			data-pickup-date-alert
			class="mb-[14px] rounded-[12px] border border-[#F0D28E] bg-[#FFF7E2] px-[16px] py-[14px] text-[#8A5E2E] shadow-[0_8px_18px_rgba(184,134,51,0.08)]"
			role="alert"
			aria-live="polite">
			<div class="flex items-start gap-[10px]">
				<svg xmlns="http://www.w3.org/2000/svg" class="mt-[1px] h-[18px] w-[18px] shrink-0 text-[#C28122]" viewBox="0 0 24 24">
					<path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z"/><path fill="currentColor" d="M1 21h22L12 2z"/>
				</svg>
				<div class="min-w-0">
					<p class="text-[0.9375rem] font-bold leading-[1.2]">Imposta il giorno di ritiro</p>
					<p class="mt-[4px] text-[0.875rem] leading-[1.45]">{{ dateError }}</p>
				</div>
			</div>
		</div>
		<div class="pickup-date-card flow-section-shell sf-section-block">
			<div class="pickup-date-card__header sf-section-block__header">
				<h2 class="pickup-date-card__heading sf-section-title text-[#252B42] font-bold font-montserrat tracking-[0.1px]">
					<span>Imposta giorno di ritiro</span>
				</h2>
				<p class="pickup-date-card__note sf-section-description">Scegli il primo giorno utile per il ritiro.</p>
			</div>

			<div class="pickup-date-slider-shell sf-section-block__body py-[12px]">
				<div class="pickup-date-slider-track relative px-[8px] tablet:px-[35px]">
					<button
						type="button"
						class="pickup-date-nav custom-prev no-radius absolute top-1/2 left-[8px] -translate-y-1/2 cursor-pointer bg-white rounded-[12px] w-[44px] h-[44px] px-0 py-0 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#E9EBEC] hover:border-[#6da8b4]"
						aria-label="Mostra giorni precedenti"
						@click="scrollPickupDates('prev')">
						<NuxtImg src="/img/quote/second-step/arrow-left.png" alt="" width="11" height="19" loading="lazy" decoding="async" />
					</button>

					<div ref="pickupTrackRef" class="pickup-date-track" aria-label="Giorni disponibili per il ritiro">
						<div class="pickup-date-track__list">
							<button
								v-for="day in daysInMonth"
								:key="day.date.toISOString()"
								type="button"
								class="pickup-date-option no-radius"
								:class="{
									'is-selected': services.date == day.formattedDate,
									'is-available': services.date != day.formattedDate && day.weekday !== 'Sab' && day.weekday !== 'Dom',
									'is-disabled': day.weekday === 'Sab' || day.weekday === 'Dom'
								}"
								:aria-pressed="services.date == day.formattedDate ? 'true' : 'false'"
								:disabled="day.weekday === 'Sab' || day.weekday === 'Dom'"
								:aria-label="`Seleziona ${day.weekday} ${day.dayNumber} ${day.monthAbbr}`"
								@click="emit('choose-date', day)">
								<span class="pickup-date-option__weekday">
									{{ day.weekday }}
								</span>
								<div class="pickup-date-option__body">
									<span class="pickup-date-option__day">{{ day.dayNumber }}</span>
									<span class="pickup-date-option__month">{{ day.monthAbbr }}</span>
								</div>
							</button>
						</div>
					</div>

					<button
						type="button"
						class="pickup-date-nav custom-next no-radius absolute top-1/2 right-[8px] -translate-y-1/2 cursor-pointer bg-white rounded-[12px] w-[44px] h-[44px] px-0 py-0 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#E9EBEC] hover:border-[#6da8b4]"
						aria-label="Mostra giorni successivi"
						@click="scrollPickupDates('next')">
						<NuxtImg src="/img/quote/second-step/arrow-right.png" alt="" width="11" height="19" loading="lazy" decoding="async" />
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
