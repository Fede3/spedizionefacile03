import { describe, it, expect } from 'vitest'
import { splitContactName, joinContactName } from '~/utils/addressFormHelpers'

describe('addressFormHelpers', () => {
	describe('splitContactName', () => {
		it('split nome semplice "Mario Rossi"', () => {
			expect(splitContactName('Mario Rossi')).toEqual({
				firstName: 'Mario',
				lastName: 'Rossi',
			})
		})

		it('cognome composto "Lucia Della Valle" → first=Lucia, last="Della Valle"', () => {
			expect(splitContactName('Lucia Della Valle')).toEqual({
				firstName: 'Lucia',
				lastName: 'Della Valle',
			})
		})

		it('cognome con piu parole "Anna Di Stefano Romano"', () => {
			expect(splitContactName('Anna Di Stefano Romano')).toEqual({
				firstName: 'Anna',
				lastName: 'Di Stefano Romano',
			})
		})

		it('solo nome "Mario" → firstName=Mario, lastName vuoto', () => {
			expect(splitContactName('Mario')).toEqual({
				firstName: 'Mario',
				lastName: '',
			})
		})

		it('stringa vuota o whitespace ritorna parti vuote', () => {
			expect(splitContactName('')).toEqual({ firstName: '', lastName: '' })
			expect(splitContactName('   ')).toEqual({ firstName: '', lastName: '' })
		})

		it('null/undefined trattati come stringa vuota', () => {
			expect(splitContactName(null)).toEqual({ firstName: '', lastName: '' })
			expect(splitContactName(undefined)).toEqual({ firstName: '', lastName: '' })
		})

		it('multi-spazio fra parti viene normalizzato', () => {
			expect(splitContactName('Mario   Rossi')).toEqual({
				firstName: 'Mario',
				lastName: 'Rossi',
			})
		})

		it('trim spazi esterni', () => {
			expect(splitContactName('  Luca Bianchi  ')).toEqual({
				firstName: 'Luca',
				lastName: 'Bianchi',
			})
		})
	})

	describe('joinContactName', () => {
		it('unisce "Mario" + "Rossi" → "Mario Rossi"', () => {
			expect(joinContactName('Mario', 'Rossi')).toBe('Mario Rossi')
		})

		it('cognome composto preservato', () => {
			expect(joinContactName('Lucia', 'Della Valle')).toBe('Lucia Della Valle')
		})

		it('solo firstName presente', () => {
			expect(joinContactName('Mario', '')).toBe('Mario')
		})

		it('solo lastName presente', () => {
			expect(joinContactName('', 'Rossi')).toBe('Rossi')
		})

		it('entrambi vuoti → stringa vuota', () => {
			expect(joinContactName('', '')).toBe('')
		})

		it('null/undefined trattati come stringa vuota', () => {
			expect(joinContactName(null, 'Rossi')).toBe('Rossi')
			expect(joinContactName('Mario', undefined)).toBe('Mario')
			expect(joinContactName(null, null)).toBe('')
		})

		it('trim spazi esterni di entrambe le parti', () => {
			expect(joinContactName('  Mario  ', '  Rossi  ')).toBe('Mario Rossi')
		})
	})

	describe('round-trip split → join', () => {
		const cases = [
			'Mario Rossi',
			'Lucia Della Valle',
			'Anna Di Stefano Romano',
			'Mario',
		]

		for (const input of cases) {
			it(`preserva "${input}"`, () => {
				const { firstName, lastName } = splitContactName(input)
				expect(joinContactName(firstName, lastName)).toBe(input)
			})
		}
	})
})
