import type { AccountIconKey } from './accountNavigation'

export type AccountNavTone = 'admin' | 'pro' | 'client'

export interface AccountNavItem {
	label: string
	to: string
	iconKey: AccountIconKey
	exact?: boolean
	badge?: number | string
}

export interface AccountNavGroup {
	key?: string
	title?: string
	tone: AccountNavTone
	items: AccountNavItem[]
}

export const adminNavGroups: AccountNavGroup[] = [
	{
		key: 'dashboard',
		tone: 'admin',
		items: [
			{ label: 'Dashboard', to: '/account', iconKey: 'chart-box', exact: true },
		],
	},
	{
		key: 'operativo',
		title: 'Operativo',
		tone: 'admin',
		items: [
			{ label: 'Ordini', to: '/account/amministrazione/ordini', iconKey: 'clipboard-list' },
			{ label: 'Spedizioni', to: '/account/amministrazione/spedizioni', iconKey: 'truck-delivery' },
			{ label: 'Bonifici', to: '/account/amministrazione/bonifici', iconKey: 'bank-transfer' },
		],
	},
	{
		key: 'clienti',
		title: 'Clienti',
		tone: 'client',
		items: [
			{ label: 'Utenti', to: '/account/amministrazione/utenti', iconKey: 'account-group' },
		],
	},
	{
		key: 'finanza',
		title: 'Finanza',
		tone: 'pro',
		items: [
			{ label: 'Prezzi', to: '/account/amministrazione/prezzi', iconKey: 'tag-multiple' },
		],
	},
	{
		key: 'contenuti',
		title: 'Contenuti',
		tone: 'admin',
		items: [
			{ label: 'Servizi', to: '/account/amministrazione/servizi', iconKey: 'services-cog' },
		],
	},
	{
		key: 'sistema',
		title: 'Sistema',
		tone: 'admin',
		items: [
			{ label: 'Impostazioni', to: '/account/amministrazione/impostazioni', iconKey: 'cog-outline' },
		],
	},
	{
		key: 'account-personale',
		title: 'Il tuo account',
		tone: 'admin',
		items: [
			{ label: 'Profilo', to: '/account/profilo', iconKey: 'account' },
			{ label: 'Indirizzi', to: '/account/indirizzi', iconKey: 'map-marker' },
			{ label: 'Portafoglio', to: '/account/portafoglio', iconKey: 'wallet' },
			{ label: 'Carte', to: '/account/carte', iconKey: 'credit-card' },
			{ label: 'Assistenza', to: '/account/assistenza', iconKey: 'headset' },
		],
	},
]

export const clientNavGroups: AccountNavGroup[] = [
	{
		tone: 'client',
		items: [
			{ label: 'Dashboard', to: '/account', iconKey: 'chart-box', exact: true },
			{ label: 'Spedizioni', to: '/account/spedizioni', iconKey: 'truck-fast' },
			{ label: 'Fatture', to: '/account/fatture', iconKey: 'clipboard-list' },
			{ label: 'Portafoglio', to: '/account/portafoglio', iconKey: 'wallet' },
			{ label: 'Carte', to: '/account/carte', iconKey: 'credit-card' },
			{ label: 'Profilo', to: '/account/profilo', iconKey: 'account' },
			{ label: 'Indirizzi', to: '/account/indirizzi', iconKey: 'map-marker' },
			{ label: 'Assistenza', to: '/account/assistenza', iconKey: 'headset' },
		],
	},
]

export const proNavGroups: AccountNavGroup[] = [
	{
		tone: 'client',
		items: [
			{ label: 'Dashboard', to: '/account', iconKey: 'chart-box', exact: true },
			{ label: 'Spedizioni', to: '/account/spedizioni', iconKey: 'truck-fast' },
			{ label: 'Fatture', to: '/account/fatture', iconKey: 'clipboard-list' },
			{ label: 'Portafoglio', to: '/account/portafoglio', iconKey: 'wallet' },
			{ label: 'Carte', to: '/account/carte', iconKey: 'credit-card' },
			{ label: 'Profilo', to: '/account/profilo', iconKey: 'account' },
			{ label: 'Indirizzi', to: '/account/indirizzi', iconKey: 'map-marker' },
			{ label: 'Assistenza', to: '/account/assistenza', iconKey: 'headset' },
		],
	},
	{
		title: 'Strumenti Pro',
		tone: 'pro',
		items: [
			{ label: 'Partner Pro', to: '/account/account-pro', iconKey: 'share-variant' },
		],
	},
]
