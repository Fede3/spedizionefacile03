<script setup>
import { Swiper, SwiperSlide } from "swiper/vue";

import "swiper/css";

const reviews = ref([
	{
		avatar: "",
		name: "Carlo",
		text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolore corporis dicta facilis cupiditate accusantium. Ex atque quisquam nobis fugit numquam, culpa quidem tempore fuga aliquam, cupiditate nemo exercitationem sit id. Inventore porro quas earum enim eius, eum nemo, voluptatem autem reprehenderit voluptas, eos ut nihil harum voluptate excepturi. Provident corporis et laborum nemo ab neque reiciendis, molestias ipsam sunt mollitia! Molestiae at, cupiditate quibusdam eligendi dolore numquam rerum est obcaecati? Quos vel ea odit eveniet commodi doloribus, rem veniam nemo. Qui hic aliquam mollitia sit aliquid voluptate tenetur, modi assumenda. Eaque aspernatur quam quia cumque mollitia corporis laborum architecto, incidunt dicta a officiis laboriosam tenetur aperiam, odio at sunt ut reprehenderit nesciunt ex dolorem. Aut obcaecati sapiente nesciunt quibusdam hic? Saepe necessitatibus ab quidem nihil officia architecto autem molestias quaerat, maiores reprehenderit inventore consequatur deleniti, iure blanditiis reiciendis, nisi sunt distinctio modi laudantium atque iusto fugiat repudiandae? Minus, ipsum dolorum. Velit, repellendus quos deleniti officia, voluptas ab aut sunt optio ut commodi quae excepturi ullam corporis ducimus necessitatibus quas id similique harum, tempore et odit accusantium. Asperiores quidem voluptatibus temporibus?  Fugiat quod atque eum accusamus. Tenetur explicabo ducimus, neque consequatur repellendus deserunt nobis temporibus veritatis possimus, libero in voluptates iure eos illum rem, iste culpa? Nihil, mollitia expedita? Praesentium, perferendis?  Facilis quis quibusdam debitis nemo quisquam est perspiciatis tempore odit consectetur voluptate nostrum fuga enim sequi nobis, libero quam. Nihil laborum, illo unde aspernatur eveniet doloribus dolorem enim quo eaque? Animi tenetur iusto laborum excepturi eius accusamus reprehenderit dolor similique nobis nisi tempora accusantium saepe repellat hic, natus eaque est. Non laborum rem ab deleniti voluptatibus libero aliquam doloremque incidunt! Ullam ad error architecto molestiae, maiores sint accusantium, numquam sit possimus modi facilis et! Asperiores voluptatum eius ullam quod maxime, illum fugit numquam dicta quidem veniam est magnam ipsa voluptatibus.",
		occupation: "Dottore",
		nation: "Italia",
		city: "Milano",
		service: "Spedizione senza etichetta",
	},

	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Johnny",
		text: "Ciao!",
		occupation: "Tennista",
		nation: "Italia",
		city: "Cagliari",
		service: "Spedizione con etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
	{
		avatar: "",
		name: "Francesca",
		text: "Servizio eccezionale! Il pacco è arrivato in perfette condizioni e il team è stato incredibilmente efficiente. Tornerò sicuramente a trovarvi!",
		occupation: "Imprenditrice",
		nation: "Italia",
		city: "Roma",
		service: "Spedizione senza etichetta",
	},
]);

// import required modules
import { Scrollbar } from "swiper/modules";
</script>

<template>
	<section class="mt-[136px]">
		<div class="my-container">
			<h2 class="text-center text-[rgba(0,0,0,.6)] font-medium desktop:text-[1.25rem] tracking-[1.8px]">Recensioni</h2>

			<p class="text-center text-[#222222] text-[1.875rem] desktop:text-[4rem] font-medium tracking-[-0.576px] desktop:tracking-[-1.536px] mt-[24px] desktop:mt-[40px] leading-[32px]">
				Cosa dicono i nostri clienti
			</p>
		</div>

		<ClientOnly>
			<div class="mobile:px-[20px] tablet:px-[40px] desktop:px-0">
				<Swiper
					class="my-swiper h-[376px] desktop:h-[276px] mt-[32px] desktop:mt-[60px] w-full"
					:modules="[Scrollbar]"
					:slides-per-view="3"
					space-between="24"
					:scrollbar="{ draggable: true, dragSize: 25, el: '.my-scrollbar' }"
					:breakpoints="{
						375: {
							slidesPerView: 1,
						},
						800: {
							slidesPerView: 2,
							scrollbar: {
								dragSize: 50,
							},
						},
						1024: {
							slidesPerView: 2,
							scrollbar: {
								dragSize: 72,
							},
						},
						1420: {
							slidesPerView: 3,
							scrollbar: {
								dragSize: 72,
							},
							/* spaceBetween: 24, */
						},
					}">
					<SwiperSlide v-for="(review, index) in reviews" :key="index">
						<UUser
							:name="review.name"
							:description="review.occupation"
							:avatar="{
								src: 'https://i.pravatar.cc/150?u=john-doe',
								icon: 'i-lucide-image',
							}" />

						<p class="text-[1.25rem] leading-[160%] tracking-[-0.28px] my-[20px] desktop:my-0 w-full desktop:h-[96px] overflow-y-auto">"{{ review.text }}"</p>

						<div class="text-[#E44203] desktop:flex desktop:items-center desktop:gap-x-[20px]">
							<div class="mb-[20px] desktop:mb-0 flex items-center gap-x-[12px]">
								<p class="flex items-center gap-x-[5px]">
									<!-- <Icon name="proicons:location" class="mr-[5px]" /> -->
									<NuxtImg src="/img/homepage/reviews/location-marker.svg" alt="" width="16" height="16" class="size-[16px]" />
									<span>
										{{ review.nation }}
									</span>
								</p>
								<!-- <Icon name="heroicons-solid:arrow-narrow-right" /> -->
								<NuxtImg src="/img/homepage/reviews/arrow-right.svg" aria-hidden="true" alt="" width="12" height="8" class="w-[12px] h-[8px]" />
								<p>
									{{ review.city }}
								</p>
							</div>
							<span class="text-white bg-[#474747] rounded-[21px] text-center p-[6px_15px] tracking-[-0.384px]">{{ review.service }}</span>
						</div>
					</SwiperSlide>
				</Swiper>
			</div>

			<div class="my-container mt-[32px] tablet:mt-[60px] desktop:mt-[102px]">
				<div class="my-scrollbar"></div>
			</div>
		</ClientOnly>
	</section>
</template>

<style scoped>
.swiper-slide {
	background: white;
	border-radius: 32px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding: 32px;
}

.my-scrollbar {
	background-color: #e8e8e8;
	width: 100%;
	height: 6px;
	border-radius: 10px;
}

.my-scrollbar > * {
	background-color: #e44203;
	height: 6px;
	border-radius: 10px;
}
</style>
