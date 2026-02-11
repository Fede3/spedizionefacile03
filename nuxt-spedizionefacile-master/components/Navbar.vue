<script setup>
const navLinks = [
	{ page: "/servizi", text: "Servizi" },
	{ page: "/", text: "Preventivo Rapido" },
	{ page: "/", text: "Guide" },
	{ page: "/checkout", text: "Checkout" },
	{ page: "/contatti", text: "Contatti" },
];

const productCategories = [
	{
		title: "Prodotti Linea Caldo",
		groups: [
			{
				title: "Cottura",
				items: ["Cottura a contatto", "Fry Top", "Piastre elettriche", "Piastre a induzione", "Pietra lavica", "Friggitrici Professionali", "Cuocipasta", "Sous-vide (cottura sottovuoto a bassa temperatura)", "Forni professionali", "Forni per pizza", "Forni a convezione", "Fornetti elettrici", "Microonde professionale", "Cucina professionale", "Cucine"],
			},
			{
				title: "Mantenimento e accessori",
				items: ["Mantenimento temperatura", "Vasche bagnomaria", "Carrelli riscaldati", "Vetrinette riscaldate", "Piani caldi", "Tavole calde", "Distributori bevande calde", "Chafing Dish (scaldavivande da buffet)", "Gastronorm", "Teglie da forno", "Griglie per forno", "Lievitazione", "Lievitatori per forni gastronomia"],
			},
		],
	},
	{
		title: "Linea Freddo",
		groups: [
			{ title: "Refrigerazione", items: ["Frigoriferi professionali", "Congelatori professionali", "Abbattitori", "Vetrine refrigerate", "Espositori freddi", "Tavoli refrigerati", "Tavoli frigo", "Tavoli congelatori", "Portaingredienti", "Saladette", "Banchi pizza"] },
			{ title: "Carrelli e vasche refrigerate", items: ["Carrelli refrigerati", "Vasche refrigerate", "Bacinelle e contenitori", "Gastronorm", "Vaschette gelato"] },
		],
	},
	{
		title: "Preparazione",
		groups: [
			{ title: "Carne e formaggio", items: ["Tritacarne", "Tritacarne e grattugia", "Grattugia", "Presshamburger", "Impastatrici per carne", "Segaossi"] },
			{ title: "Mixer, pasta e conservazione", items: ["Mixer", "Pelapatate", "Sfogliatrici stendipizza", "Impastatrice a spirale", "Sottovuoto a campana", "Sottovuoto a barra", "Buste per sottovuoto", "Termosigillatrici", "Contenitori asporto e delivery"] },
		],
	},
	{
		title: "Carrelli e Mobili",
		groups: [
			{ title: "Servizio", items: ["Carrelli neutri", "Carrelli di servizio", "Carrelli per dolci, formaggi e antipasti", "Portavassoi", "Portateglie", "Porta piatti, bicchieri e cestelli"] },
			{ title: "Carrelli Caldi e Freddi", items: ["Carrelli caldi", "Espositori riscaldati", "Scalda piatti, teglie e bicchieri", "Carrelli refrigerati portateglie e piatti", "Flambè", "Carrelli per hotel", "Carrelli porta cestelli", "Carrelli per colazione"] },
		],
	},
	{
		title: "Hotellerie",
		groups: [
			{ title: "Camera e bagno", items: ["Bollitori", "Minibar", "Reti", "Casseforti", "Guanciali", "Fasciatoi", "Stiro e grucce", "Linea cortesia", "Dispenser a muro", "Asciugacapelli (phon)", "Supporti a muro", "Ricariche", "Distributori di carta"] },
			{ title: "Tavola", items: ["Secchielli per ghiaccio"] },
		],
	},
	{
		title: "Igiene e Pulizia",
		groups: [
			{ title: "Sanificazione", items: ["Macchinari per sanificazione", "Pulizia e vapore", "Detergenza Professionale", "Detersivi piatti", "Detersivi bucato", "Detergenti speciali", "Sgrassatori e anticalcare"] },
			{ title: "Linee dedicate", items: ["Carrelli", "Linea Stiro"] },
		],
	},
	{
		title: "RICAMBI",
		groups: [
			{ title: "Ricambi Linea Caldo", items: ["(ricambi per) Cottura a contatto", "(ricambi per) Forni professionali", "(ricambi per) Mantenimento temperatura", "(ricambi per) Cottura per immersione", "(ricambi per) Cucine professionali"] },
			{ title: "Ricambi altre linee", items: ["Ricambi Preparazione", "Lavorazione carne e formaggio", "Mixer, pelatura e taglio", "Lavorazione pasta", "Conservazione", "Ricambi Linea Freddo", "Ricambi Sanificazione e Pulizia", "Ricambi Carrelli e Arredo", "Ricambi Senza Esploso"] },
		],
	},
];

const { isAuthenticated, user } = useSanctumAuth();
const { cart, status } = useCart();

</script>

<template>
	<div class="relative w-full">
		<div class="h-[4px] w-full bg-[#E44203] rounded-full mb-2"></div>
		<div class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 desktop:h-[65px] tablet:h-[50px] h-[38px] relative z-2">
			<NuxtLink to="/" class="flex items-center h-full outline-none">
				<Logo :is-navbar="true" />
			</NuxtLink>

			<nav class="desktop-xl:text-[1.25rem] desktop:text-[1rem] hidden mid-desktop-navbar:flex justify-center">
				<ul class="flex items-center justify-center desktop-xl:gap-x-[40px] mid-desktop-navbar:gap-x-[22px] text-[rgba(64,64,64,.67)] tracking-[-0.48px]">
					<li>
						<UPopover mode="hover">
							<button type="button" class="font-semibold text-[#095866] hover:text-[#E44203] cursor-pointer">Categorie</button>
							<template #content>
								<div class="w-[min(1100px,92vw)] max-h-[70vh] overflow-auto p-4 bg-white rounded-[12px] shadow-lg border border-[#e5e7eb]">
									<div class="grid desktop:grid-cols-3 gap-4">
										<div v-for="(section, sectionIndex) in productCategories" :key="sectionIndex" class="rounded-[10px] bg-[#f7f8fa] p-3">
											<h4 class="text-[#E44203] font-bold mb-2">{{ section.title }}</h4>
											<div v-for="(group, groupIndex) in section.groups" :key="groupIndex" class="mb-2">
												<p class="text-[#095866] font-semibold text-[0.9rem]">{{ group.title }}</p>
												<ul class="list-disc pl-5 text-[0.82rem] text-[#374151]">
													<li v-for="(item, itemIndex) in group.items" :key="itemIndex">{{ item }}</li>
												</ul>
											</div>
										</div>
									</div>
								</div>
							</template>
						</UPopover>
					</li>
					<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
						<NuxtLink :to="nav.page">
							{{ nav.text }}
						</NuxtLink>
					</li>
				</ul>
			</nav>

			<nav class="mid-desktop-navbar:hidden justify-self-end">
				<UDropdownMenu :items="navLinks" :modal="false">
					<button type="button" class="cursor-pointer">
						<NuxtImg src="/img/hamburger.png" alt="Menù Hamburger" width="24" height="16" />
					</button>
					<template #item="{ item }">
						<NuxtLink :to="item.page" class="block w-full text-left">{{ item.text }}</NuxtLink>
					</template>
				</UDropdownMenu>
			</nav>

			<NuxtLink
				:to="isAuthenticated ? '/account' : '/autenticazione'"
				class="hidden mid-desktop-navbar:inline-block bg-[#E44203] desktop-xl:w-[143px] mid-desktop-navbar:w-[91px] mid-desktop-navbar:h-[41px] desktop-xl:h-full mid-desktop-navbar:leading-[41px] desktop-xl:leading-[65px] text-center text-white rounded-[50px] font-semibold desktop-xl:text-[1.25rem] desktop:text-[0.875rem] tracking-[-0.48px]">
				<span v-if="isAuthenticated">Ciao {{ user?.name }}</span>
				<span v-else>Accedi!</span>
			</NuxtLink>

			<NuxtLink to="/carrello" class="inline-block bg-[#E44203] px-[30px] h-[48px] leading-[48px] text-center text-white rounded-[24px] font-semibold">
				<Icon name="mdi:cart-outline" />
				<span v-if="status === 'success'">{{ cart?.data?.length || 0 }}</span>
				<span v-if="status === 'pending'">...</span>
			</NuxtLink>
		</div>
		<div class="h-[4px] w-full bg-[#095866] rounded-full mt-2"></div>
	</div>
</template>
