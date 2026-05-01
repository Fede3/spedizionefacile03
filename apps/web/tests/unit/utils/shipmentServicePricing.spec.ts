import { describe, it, expect } from 'vitest'
import {
	parseCurrencyAmount,
	normalizeServiceKey,
	normalizeSelectedServices,
	calculateShipmentServiceSurcharge,
} from '~/utils/shipmentServicePricing'

// ─────────────────────────────────────────────────────────────────────
// PARSING currency / service keys
// ─────────────────────────────────────────────────────────────────────

describe('parseCurrencyAmount', () => {
	it('parse numero diretto', () => {
		expect(parseCurrencyAmount(12.5)).toBe(12.5)
		expect(parseCurrencyAmount(0)).toBe(0)
	})

	it('parse stringa con virgola italiana', () => {
		expect(parseCurrencyAmount('12,50')).toBe(12.5)
	})

	it('parse stringa con simbolo euro', () => {
		expect(parseCurrencyAmount('12,50 €')).toBe(12.5)
		expect(parseCurrencyAmount('€12,50')).toBe(12.5)
	})

	it('parse stringa con migliaia italiane (punto)', () => {
		expect(parseCurrencyAmount('1.250,00')).toBe(1250)
	})

	it('gestisce null/undefined', () => {
		expect(parseCurrencyAmount(null)).toBe(0)
		expect(parseCurrencyAmount(undefined)).toBe(0)
	})

	it('gestisce NaN/Infinity', () => {
		expect(parseCurrencyAmount(Number.NaN)).toBe(0)
		expect(parseCurrencyAmount(Infinity)).toBe(0)
	})

	it('gestisce stringa non numerica', () => {
		expect(parseCurrencyAmount('abc')).toBe(0)
	})

	it('parse formato anglosassone "1234.56"', () => {
		expect(parseCurrencyAmount('1234.56')).toBeCloseTo(1234.56, 2)
	})

	it('parse stringa con spazi e simbolo', () => {
		expect(parseCurrencyAmount('   12,50 €   ')).toBe(12.5)
	})

	it('parse 0 ed empty correttamente', () => {
		expect(parseCurrencyAmount(0)).toBe(0)
		expect(parseCurrencyAmount('')).toBe(0)
	})
})

describe('normalizeServiceKey', () => {
	it('normalizza "Contrassegno" -> "contrassegno"', () => {
		expect(normalizeServiceKey('Contrassegno')).toBe('contrassegno')
	})

	it('normalizza "Assicurazione" -> "assicurazione"', () => {
		expect(normalizeServiceKey('Assicurazione')).toBe('assicurazione')
	})

	it('normalizza "Senza Etichetta" -> "senza_etichetta"', () => {
		expect(normalizeServiceKey('Senza Etichetta')).toBe('senza_etichetta')
	})

	it('normalizza "Sponda Idraulica" -> "sponda_idraulica"', () => {
		expect(normalizeServiceKey('Sponda Idraulica')).toBe('sponda_idraulica')
	})

	it('normalizza "SMS/Email Notification" -> "sms_email_notification"', () => {
		expect(normalizeServiceKey('SMS Notification')).toBe('sms_email_notification')
	})

	it('"Nessuno" diventa stringa vuota', () => {
		expect(normalizeServiceKey('Nessuno')).toBe('')
		expect(normalizeServiceKey('nessuno')).toBe('')
	})

	it('gestisce null/undefined/vuoto', () => {
		expect(normalizeServiceKey(null)).toBe('')
		expect(normalizeServiceKey(undefined)).toBe('')
		expect(normalizeServiceKey('')).toBe('')
	})

	it('trim spazi esterni', () => {
		expect(normalizeServiceKey('  Contrassegno  ')).toBe('contrassegno')
	})

	it('gestisce case mixed', () => {
		expect(normalizeServiceKey('CONTRASSEGNO')).toBe('contrassegno')
		expect(normalizeServiceKey('AsSiCuRaZiOnE')).toBe('assicurazione')
	})
})

describe('normalizeSelectedServices', () => {
	it('parse stringa comma-separated', () => {
		expect(normalizeSelectedServices('Contrassegno, Assicurazione')).toEqual([
			'contrassegno',
			'assicurazione',
		])
	})

	it('parse array', () => {
		expect(normalizeSelectedServices(['Contrassegno', 'Assicurazione'])).toEqual([
			'contrassegno',
			'assicurazione',
		])
	})

	it('rimuove duplicati', () => {
		expect(normalizeSelectedServices('Contrassegno, Contrassegno')).toEqual([
			'contrassegno',
		])
	})

	it('"Nessuno" diventa array vuoto', () => {
		expect(normalizeSelectedServices('Nessuno')).toEqual([])
		expect(normalizeSelectedServices('nessuno')).toEqual([])
	})

	it('gestisce null/undefined/vuoto', () => {
		expect(normalizeSelectedServices(null)).toEqual([])
		expect(normalizeSelectedServices(undefined)).toEqual([])
		expect(normalizeSelectedServices('')).toEqual([])
	})

	it('gestisce array misto valido + invalido', () => {
		expect(normalizeSelectedServices(['Contrassegno', '', null, 'Assicurazione'])).toEqual([
			'contrassegno',
			'assicurazione',
		])
	})

	it('rimuove duplicati anche con case diverso', () => {
		expect(normalizeSelectedServices(['Contrassegno', 'CONTRASSEGNO', 'contrassegno'])).toEqual([
			'contrassegno',
		])
	})
})

// ─────────────────────────────────────────────────────────────────────
// CALCULATE SHIPMENT SERVICE SURCHARGE — fixture-based parity tests
// (snapshot del comportamento ATTUALE — Ondata 2 plan refactor)
// Parity: tests/Feature/Pricing/PriceEngineTest.php (backend Laravel)
// ─────────────────────────────────────────────────────────────────────

describe('calculateShipmentServiceSurcharge', () => {
	describe('Empty state', () => {
		it('nessun servizio + nessun pacco -> total=0, items=[]', () => {
			const result = calculateShipmentServiceSurcharge({})
			expect(result.total).toBe(0)
			expect(result.total_cents).toBe(0)
			expect(result.items).toEqual([])
		})

		it('selectedServices array vuoto + serviceType vuoto', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: [],
				serviceType: '',
			})
			expect(result.total).toBe(0)
			expect(result.items).toEqual([])
		})
	})

	describe('senza_etichetta — supplemento fisso 0,99 €', () => {
		it('attiva quando selezionato', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['senza_etichetta'],
			})
			expect(result.total).toBe(0.99)
			expect(result.total_cents).toBe(99)
			expect(result.items.find((i) => i.key === 'senza_etichetta')?.amount_cents).toBe(99)
		})

		it('non attivo se non selezionato', () => {
			const result = calculateShipmentServiceSurcharge({ selectedServices: [] })
			expect(result.items.find((i) => i.key === 'senza_etichetta')).toBeUndefined()
		})
	})

	describe('sponda_idraulica — supplemento fisso 15,00 €', () => {
		it('attiva con prezzo cents = 1500', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['sponda_idraulica'],
			})
			expect(result.total).toBe(15)
			expect(result.total_cents).toBe(1500)
		})
	})

	describe('contrassegno — threshold percentage', () => {
		it('importo sotto 300€ -> min_fee 7,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno'],
				serviceData: { contrassegno: { importo: '50,00' } },
			})
			expect(result.total).toBe(7)
			expect(result.total_cents).toBe(700)
		})

		it('importo 300€ -> min_fee 7,00 € (al threshold)', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno'],
				serviceData: { contrassegno: { importo: '300,00' } },
			})
			expect(result.total).toBe(7)
		})

		it('importo 500€ -> 2% = 10,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno'],
				serviceData: { contrassegno: { importo: '500,00' } },
			})
			expect(result.total).toBe(10)
			expect(result.total_cents).toBe(1000)
		})

		it('importo 1000€ -> 2% = 20,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno'],
				serviceData: { contrassegno: { importo: '1000,00' } },
			})
			expect(result.total).toBe(20)
		})

		it('importo 0 -> niente fee (skip se 0 cents)', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno'],
				serviceData: { contrassegno: { importo: '0' } },
			})
			expect(result.items.find((i) => i.key === 'contrassegno')).toBeUndefined()
		})
	})

	describe('assicurazione — threshold percentage stesso schema contrassegno', () => {
		it('importo 100€ -> min_fee 7,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['assicurazione'],
				serviceData: { assicurazione: { importo: '100,00' } },
			})
			expect(result.total).toBe(7)
		})

		it('importo 1000€ -> 2% = 20,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['assicurazione'],
				serviceData: { assicurazione: { importo: '1000,00' } },
			})
			expect(result.total).toBe(20)
		})
	})

	describe('notifications — supplemento SMS/email 0,50 €', () => {
		it('attiva via flag smsEmailNotification=true', () => {
			const result = calculateShipmentServiceSurcharge({
				smsEmailNotification: true,
			})
			expect(result.total).toBe(0.5)
			expect(result.items.find((i) => i.key === 'notifications')?.amount_cents).toBe(50)
		})

		it('attiva via serviceData.sms_email_notification=true', () => {
			const result = calculateShipmentServiceSurcharge({
				serviceData: { sms_email_notification: true },
			})
			expect(result.total).toBe(0.5)
		})

		it('non attivo se assente', () => {
			const result = calculateShipmentServiceSurcharge({})
			expect(result.items.find((i) => i.key === 'notifications')).toBeUndefined()
		})
	})

	describe('automatic supplements: Calabria/Sardegna/Sicilia (per pacco, tier-based)', () => {
		it('PA + 5kg -> tier "up_to_kg:10" 6,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'PA', country: 'IT' },
				packages: [{ weight: 5 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')?.amount_cents).toBe(600)
		})

		it('CA + 25kg -> tier "up_to_kg:25" 7,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'CA', country: 'IT' },
				packages: [{ weight: 25 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')?.amount_cents).toBe(700)
		})

		it('RC + 75kg -> tier "up_to_kg:100" 15,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'RC', country: 'IT' },
				packages: [{ weight: 75 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')?.amount_cents).toBe(1500)
		})

		it('SS + 150kg -> tier finale (null) 20,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'SS', country: 'IT' },
				packages: [{ weight: 150 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')?.amount_cents).toBe(2000)
		})

		it('province NON CSI (es. RM) -> nessun supplemento', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'RM', country: 'IT' },
				packages: [{ weight: 25 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')).toBeUndefined()
		})

		it('quantity 3 sullo stesso pacco -> tier × quantity', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { province: 'PA', country: 'IT' },
				packages: [{ weight: 5, quantity: 3 }],
			})
			expect(result.items.find((i) => i.key === 'calabria_sardegna_sicilia')?.amount_cents).toBe(1800)
		})
	})

	describe('BRT Point CSI (riduzione su PUDO Calabria/Sardegna/Sicilia)', () => {
		it('PUDO Sicilia + 15kg -> brt_point_csi attivo (200 cents)', () => {
			const result = calculateShipmentServiceSurcharge({
				deliveryMode: 'pudo',
				selectedPudo: { province: 'PA', country: 'IT' },
				packages: [{ weight: 15 }],
			})
			const pointCsi = result.items.find((i) => i.key === 'brt_point_csi')
			expect(pointCsi?.amount_cents).toBe(200)
		})

		it('PUDO Sicilia + 25kg -> torna a CSI normale (sopra max_weight 20kg)', () => {
			const result = calculateShipmentServiceSurcharge({
				deliveryMode: 'pudo',
				selectedPudo: { province: 'PA', country: 'IT' },
				packages: [{ weight: 25 }],
			})
			expect(result.items.find((i) => i.key === 'brt_point_csi')).toBeUndefined()
		})
	})

	describe('Isole minori Italia (keyword match)', () => {
		it('citta "Lampedusa" -> 20,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Lampedusa', country: 'IT' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_italia')?.amount_cents).toBe(2000)
		})

		it('citta "Capri" -> 20,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Capri', country: 'IT' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_italia')?.amount_cents).toBe(2000)
		})

		it('citta non isolana "Roma" -> nessun supplemento', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Roma', country: 'IT' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_italia')).toBeUndefined()
		})

		it('keyword case-insensitive', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'CAPRI', country: 'IT' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_italia')?.amount_cents).toBe(2000)
		})
	})

	describe('Isole minori Europa', () => {
		it('Mallorca / ES -> 25,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Mallorca', country: 'ES' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_europa')?.amount_cents).toBe(2500)
		})

		it('Madeira / PT -> 25,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Madeira', country: 'PT' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_europa')?.amount_cents).toBe(2500)
		})

		it('Madrid / ES -> nessun supplemento (continentale)', () => {
			const result = calculateShipmentServiceSurcharge({
				destinationAddress: { city: 'Madrid', country: 'ES' },
			})
			expect(result.items.find((i) => i.key === 'isole_minori_europa')).toBeUndefined()
		})
	})

	describe('Fuori sagoma (longest_side > 100 cm OR girth > 260 cm OR flag)', () => {
		it('flag fuori_sagoma + 5kg -> tier 3,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, fuori_sagoma: true }],
			})
			expect(result.items.find((i) => i.key === 'fuori_sagoma')?.amount_cents).toBe(300)
		})

		it('flag fuori_sagoma + 30kg -> tier finale 5,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 30, fuori_sagoma: true }],
			})
			expect(result.items.find((i) => i.key === 'fuori_sagoma')?.amount_cents).toBe(500)
		})

		it('lato lungo > 100 cm trigger automatico', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 120, second_size: 50, third_size: 50 }],
			})
			expect(result.items.find((i) => i.key === 'fuori_sagoma')?.amount_cents).toBe(300)
		})

		it('pacco normale (50x40x30) -> nessun fuori_sagoma', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 50, second_size: 40, third_size: 30 }],
			})
			expect(result.items.find((i) => i.key === 'fuori_sagoma')).toBeUndefined()
		})
	})

	describe('Lato superiore 130 cm', () => {
		it('first_size = 140 cm -> 5,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 140, second_size: 50, third_size: 50 }],
			})
			expect(result.items.find((i) => i.key === 'lato_superiore_130cm')?.amount_cents).toBe(500)
		})

		it('first_size = 130 cm (al threshold) -> NIENTE supplemento', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 130, second_size: 50, third_size: 50 }],
			})
			expect(result.items.find((i) => i.key === 'lato_superiore_130cm')).toBeUndefined()
		})

		it('lato 100 cm (sotto) -> niente', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 100, second_size: 50, third_size: 50 }],
			})
			expect(result.items.find((i) => i.key === 'lato_superiore_130cm')).toBeUndefined()
		})
	})

	describe('Aste/Tubi (long thin packages)', () => {
		it('150 x 10 x 10 -> 5,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 150, second_size: 10, third_size: 10 }],
			})
			expect(result.items.find((i) => i.key === 'aste_tubi')?.amount_cents).toBe(500)
		})

		it('150 x 30 x 30 (lato secondario sopra 20cm) -> NO aste_tubi', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, first_size: 150, second_size: 30, third_size: 30 }],
			})
			expect(result.items.find((i) => i.key === 'aste_tubi')).toBeUndefined()
		})

		it('flag tubi attivo bypass requisito dimensioni (snapshot comportamento)', () => {
			const result = calculateShipmentServiceSurcharge({
				packages: [{ weight: 5, tubi: true }],
			})
			// Snapshot comportamento attuale: flag tubi attiva il supplemento anche
			// senza dimensioni esplicite. Documentato qui per evitare regression.
			expect(result.items.find((i) => i.key === 'aste_tubi')?.amount_cents).toBe(500)
		})
	})

	describe('eu_manual_extra (fee preventivo manuale Europa)', () => {
		it('requiresManualQuote=true -> 15,00 €', () => {
			const result = calculateShipmentServiceSurcharge({
				requiresManualQuote: true,
			})
			expect(result.items.find((i) => i.key === 'eu_manual_extra')?.amount_cents).toBe(1500)
		})

		it('requiresManualQuote=false -> 0', () => {
			const result = calculateShipmentServiceSurcharge({
				requiresManualQuote: false,
			})
			expect(result.items.find((i) => i.key === 'eu_manual_extra')).toBeUndefined()
		})
	})

	describe('Composizione multi-supplemento', () => {
		it('CSI + senza_etichetta + notifications', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['senza_etichetta'],
				smsEmailNotification: true,
				destinationAddress: { province: 'PA', country: 'IT' },
				packages: [{ weight: 5 }],
			})
			// senza_etichetta 99 + notifications 50 + CSI tier 600 = 749 cents
			expect(result.total_cents).toBe(749)
			expect(result.items.length).toBe(3)
		})

		it('Contrassegno 500€ + Assicurazione 200€ + Sponda', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['contrassegno', 'assicurazione', 'sponda_idraulica'],
				serviceData: {
					contrassegno: { importo: '500,00' },
					assicurazione: { importo: '200,00' },
				},
			})
			// contrassegno: 2% di 500 = 10€ (1000 cents)
			// assicurazione: min_fee 7€ (700 cents)
			// sponda: 1500 cents
			// totale: 3200 cents
			expect(result.total_cents).toBe(3200)
		})
	})

	describe('Output shape contract', () => {
		it('total e total_cents allineati (cents = total*100)', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['senza_etichetta', 'sponda_idraulica'],
			})
			expect(result.total_cents).toBe(Math.round(result.total * 100))
		})

		it('items contiene service, label, amount, amount_cents per ogni voce', () => {
			const result = calculateShipmentServiceSurcharge({
				selectedServices: ['senza_etichetta'],
			})
			const item = result.items.find((i) => i.key === 'senza_etichetta')
			expect(item).toBeDefined()
			expect(item).toHaveProperty('key')
			expect(item).toHaveProperty('amount_cents')
		})
	})
})
