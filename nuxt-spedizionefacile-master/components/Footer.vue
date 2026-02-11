<script setup>
const socials = ref([
	{ icon: "fa:twitter", link: "", ariaLabel: "", class: "twitter" },
	{ icon: "fa:facebook", link: "", ariaLabel: "", class: "facebook" },
	{ icon: "fa:instagram", link: "", ariaLabel: "", class: "instagram" },
]);

const links = ref([
	{
		title: "Informazioni",
		pages: [
			{
				text: "Spedizione",
				url: "/",
			},
			{
				text: "Nostri Servizi",
				url: "/",
			},
			{
				text: "Tariffe",
				url: "/",
			},
			{
				text: "Senza etichetta",
				url: "/",
			},
		],
	},
	{
		title: "Informazioni",
		pages: [
			{
				text: "Spedizione",
				url: "/",
			},
			{
				text: "Nostri Servizi",
				url: "/",
			},
			{
				text: "Tariffe",
				url: "/",
			},
			{
				text: "Senza etichetta",
				url: "/",
			},
		],
	},
	{
		title: "Chi Siamo",
		pages: [
			{
				text: "Recensione",
				url: "/",
			},
			{
				text: "Partner",
				url: "/",
			},
			{
				text: "Nostro Team",
				url: "/",
			},
			{
				text: "Nostri Clienti",
				url: "/",
			},
		],
	},
	{
		title: "Documenti legali",
		pages: [
			{
				text: "Termini di trasporto",
				url: "/",
			},
			{
				text: "3495345123",
				url: "/",
			},
			{
				text: "070 34534",
				url: "/",
			},
		],
	},
]);
</script>

<template>
	<footer class="bg-[#E5E5E5] pt-[121px] pb-[105px]">
		<div class="my-container">
			<div class="flex items-start flex-wrap desktop:justify-between desktop:flex-nowrap">
				<div>
					<div class="flex items-center desktop-xl:h-[65px] tablet:h-[50px] h-[38px]">
						<Logo :is-navbar="false" />
					</div>

					<ul class="flex items-center gap-x-[24px] mt-[23px] desktop:mt-[54px]">
						<li
							v-for="(social, socialIndex) in socials"
							:key="socialIndex"
							class="tablet:w-[40px] tablet:h-[40px] w-[24px] h-[24px] tablet:rounded-[40px] rounded-[24px] border-[rgba(228,66,3,.12)] border-[1px] text-[#E44203]">
							<a
								:aria-label="social.ariaLabel"
								:href="social.link"
								target="_blank"
								rel="noopener noreferrer"
								class="h-full w-full flex items-center justify-center tablet:rounded-[40px] rounded-[24px]">
								<Icon :name="social.icon" aria-hidden="true" class="text-[10px]" :class="{ 'tablet:text-[15px]': socialIndex === 0, ' tablet:text-[20px]': socialIndex !== 0 }" />
							</a>
						</li>
					</ul>
				</div>

				<div class="flex flex-wrap justify-between mt-[43px] desktop:mt-0 w-full desktop:w-auto">
					<div
						v-for="(link, linkIndex) in links"
						:key="linkIndex"
						class="w-[50%] tablet:w-auto desktop:w-[50%] first:mb-[72px] nth-of-type-[2]:mb-[72px] flex flex-col even:items-end tablet:block desktop:flex">
						<h2 class="tablet:text-[1.25rem] text-[1.125rem] font-semibold tracking-[-0.48px] text-black mb-[29px]">
							{{ link.title }}
						</h2>

						<ul>
							<li v-for="(page, pageIndex) in link.pages" :key="pageIndex" class="text-[#404040] tracking-[-0.384px] mt-[16px] first:mt-0 text-[0.9375rem] tablet:text-[1rem]">
								<NuxtLink :to="page.url">
									{{ page.text }}
								</NuxtLink>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</footer>
</template>

<style scoped>
.twitter {
	width: 16px;
	height: 13px;
}

.facebook {
	width: 9px;
	height: 17px;
}

.instagram {
	width: 19px;
	height: 19px;
}
</style>
