<!--
  FILE: components/shipment/StepPickupDate.vue
  SCOPO: Sezione data di ritiro con carosello Swiper — estratta da [step].vue.
-->
<script setup>
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import "swiper/css/navigation";
import { Navigation } from "swiper/modules";

defineProps({
	dateError: { type: String, default: null },
	daysInMonth: { type: Array, required: true },
	services: { type: Object, required: true },
});

defineEmits(["choose-date"]);
</script>

<template>
	<div class="scroll-mt-[120px] w-full">
		<div
			v-if="dateError"
			data-pickup-date-alert
			class="mb-[14px] rounded-[14px] border border-[#F0D28E] bg-[#FFF7E2] px-[16px] py-[14px] text-[#8A5E2E] shadow-[0_8px_18px_rgba(184,134,51,0.08)]"
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
				<p class="pickup-date-card__note sf-section-description">Scegli il ritiro.</p>
			</div>

			<ClientOnly>
				<div class="pickup-date-slider-shell sf-section-block__body py-[12px]">
					<div class="pickup-date-slider-track relative px-[8px] tablet:px-[35px]">
						<Swiper
							class="my-swiper h-[96px] tablet:h-[108px]"
							:modules="[Navigation]"
							:slides-per-view="3.8"
							:breakpoints="{
								320: { slidesPerView: 3.4, spaceBetween: 8 },
								375: { slidesPerView: 4.1, spaceBetween: 10 },
								520: { slidesPerView: 4.9, spaceBetween: 12 },
								720: { slidesPerView: 5.8, spaceBetween: 14 },
								1024: { slidesPerView: 7, spaceBetween: 14 }
							}"
							space-between="8"
							:navigation="{
								nextEl: '.custom-next',
								prevEl: '.custom-prev',
							}">
							<SwiperSlide v-for="(day, index) in daysInMonth" :key="index">
								<label
									:key="day.date.toISOString()"
									class="pickup-date-option sf-choice-tile"
									:class="{
										'sf-choice-tile--selected': services.date == day.formattedDate,
										'is-selected': services.date == day.formattedDate,
										'is-available': services.date != day.formattedDate && day.weekday !== 'Sab' && day.weekday !== 'Dom',
										'is-disabled': day.weekday === 'Sab' || day.weekday === 'Dom'
									}">
									<span class="pickup-date-option__weekday">
										{{ day.weekday }}
									</span>
									<div class="pickup-date-option__body">
										<span class="pickup-date-option__day">{{ day.dayNumber }}</span>
										<span class="pickup-date-option__month">{{ day.monthAbbr }}</span>
									</div>
									<input
										type="checkbox"
										v-if="day.weekday !== 'Sab' && day.weekday !== 'Dom'"
										@input="$emit('choose-date', day)"
										class="opacity-0 pointer-events-none absolute bottom-0"
										:id="`date-${day.dayNumber}-${day.monthAbbr}`"
										:checked="services.date == day.formattedDate" />
								</label>
							</SwiperSlide>
						</Swiper>

						<button class="pickup-date-nav custom-prev absolute top-1/2 left-[8px] -translate-y-1/2 cursor-pointer bg-white rounded-[50px] px-[14px] py-[10px] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#D0D0D0] hover:border-[#6da8b4]">
							<NuxtImg src="/img/quote/second-step/arrow-left.png" alt="Precedente" width="11" height="19" loading="lazy" decoding="async" />
						</button>
						<button class="pickup-date-nav custom-next absolute top-1/2 right-[8px] -translate-y-1/2 cursor-pointer bg-white rounded-[50px] px-[14px] py-[10px] flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-300 z-10 border border-[#D0D0D0] hover:border-[#6da8b4]">
							<NuxtImg src="/img/quote/second-step/arrow-right.png" alt="Successivo" width="11" height="19" loading="lazy" decoding="async" />
						</button>
					</div>
				</div>
			</ClientOnly>
		</div>
	</div>
</template>
