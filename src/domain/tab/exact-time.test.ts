import { describe, expect, it } from 'vitest';
import { addExactTimes, compareExactTimes, fromTabFraction, parseExactTime, serializeExactTime } from './exact-time';

const exact = (numerator: string, denominator = '1') => {
    const value = parseExactTime({ numerator, denominator });
    if (!value) throw new Error('Invalid test fraction');
    return value;
};
const written = (numerator: number, denominator = 1, allowZero = false) => {
    const value = fromTabFraction({ numerator, denominator }, allowZero);
    if (!value) throw new Error('Invalid written test fraction');
    return value;
};

describe('exact quarter-note arithmetic', () => {
    it('adds ordinary fractions without creating a false endpoint difference', () => {
        const sum = addExactTimes(written(1, 10), written(1, 5));
        expect(serializeExactTime(sum)).toEqual({ numerator: '3', denominator: '10' });
        expect(compareExactTimes(sum, written(3, 10))).toBe(0);
    });

    it('returns exactly one after seven sevenths', () => {
        let sum = exact('0');
        for (let index = 0; index < 7; index++) sum = addExactTimes(sum, written(1, 7));
        expect(serializeExactTime(sum)).toEqual({ numerator: '1', denominator: '1' });
    });

    it('preserves equality, ordering and canonical zero for signed non-normalized queries', () => {
        const negative = exact('-0006', '0008');
        expect(serializeExactTime(negative)).toEqual({ numerator: '-3', denominator: '4' });
        expect(compareExactTimes(negative, exact('-3', '4'))).toBe(0);
        expect(compareExactTimes(negative, exact('0'))).toBe(-1);
        expect(compareExactTimes(exact('0'), negative)).toBe(1);
        expect(serializeExactTime(addExactTimes(negative, exact('3', '4')))).toEqual({ numerator: '0', denominator: '1' });
        expect(serializeExactTime(exact('-000', '00019'))).toEqual({ numerator: '0', denominator: '1' });
    });

    it('retains a narrow positive difference and distinguishes both comparison directions', () => {
        const before = exact('999999999999999999999999999999999999999999999999999999999999999', '9999999999999999999999999999999999999999999999999999999999999999');
        const after = exact('1', '10');
        expect(compareExactTimes(before, after)).toBe(-1);
        expect(compareExactTimes(after, before)).toBe(1);
        expect(compareExactTimes(before, before)).toBe(0);
    });

    it('does not collapse the known large-anchor regression into equal endpoints', () => {
        // Arithmetic helper regression only: this does not establish global-bar support.
        const anchor = exact('130944');
        const endA = addExactTimes(anchor, addExactTimes(written(1, 506), written(1, 1015)));
        const endB = addExactTimes(anchor, addExactTimes(written(1, 507), written(1, 1011)));
        expect(serializeExactTime(endA)).toEqual({ numerator: '67251530481', denominator: '513590' });
        expect(serializeExactTime(endB)).toEqual({ numerator: '22372961402', denominator: '170859' });
        expect(compareExactTimes(endA, endB)).toBe(-1);
        expect(compareExactTimes(endB, endA)).toBe(1);
    });

    it('keeps exact addition independent of order and grouping', () => {
        const a = written(1, 6), b = written(1, 3), c = written(1, 2);
        const left = addExactTimes(addExactTimes(a, b), c);
        const right = addExactTimes(a, addExactTimes(c, b));
        expect(serializeExactTime(left)).toEqual({ numerator: '1', denominator: '1' });
        expect(compareExactTimes(left, right)).toBe(0);
        expect(compareExactTimes(addExactTimes(a, b), addExactTimes(b, a))).toBe(0);
    });

    it('does not mutate frozen query, source or arithmetic operands and serializes to JSON', () => {
        const query = Object.freeze({ numerator: '6', denominator: '8' });
        const source = Object.freeze({ numerator: 1, denominator: 4 });
        const left = Object.freeze(parseExactTime(query)!);
        const right = Object.freeze(fromTabFraction(source, false)!);
        const sum = addExactTimes(left, right);
        expect(compareExactTimes(left, right)).toBe(1);
        const result = serializeExactTime(sum);
        expect(JSON.stringify(result)).toBe('{"numerator":"1","denominator":"1"}');
        expect(parseExactTime(JSON.parse(JSON.stringify(result)))).toEqual(sum);
        expect(query).toEqual({ numerator: '6', denominator: '8' });
        expect(source).toEqual({ numerator: 1, denominator: 4 });
        expect(left).toEqual({ numerator: 3n, denominator: 4n });
        expect(right).toEqual({ numerator: 1n, denominator: 4n });
    });
});

describe('bounded exact query parser', () => {
    it('accepts 64 digits per component without counting the optional minus sign', () => {
        const digits = '9'.repeat(64);
        expect(serializeExactTime(exact('-' + digits, digits))).toEqual({ numerator: '-1', denominator: '1' });
        expect(serializeExactTime(exact('1', digits))).toEqual({ numerator: '1', denominator: digits });
    });

    it.each([
        null, undefined, [], [1, 2], 1, '1/2', true, {},
        { numerator: 1, denominator: '2' }, { numerator: '1', denominator: 2 },
        { numerator: '1' }, { denominator: '2' },
        { numerator: '+1', denominator: '2' }, { numerator: '1', denominator: '+2' },
        { numerator: '1', denominator: '-2' }, { numerator: '1', denominator: '0' },
        { numerator: '0', denominator: '000' }, { numerator: '', denominator: '1' },
        { numerator: '-', denominator: '1' }, { numerator: '1', denominator: '' },
        { numerator: ' 1', denominator: '2' }, { numerator: '1', denominator: '2 ' },
        { numerator: '1.0', denominator: '2' }, { numerator: '1e2', denominator: '2' },
        { numerator: '1', denominator: '2e1' }, { numerator: '0x10', denominator: '2' },
        { numerator: 'NaN', denominator: '2' }, { numerator: 'Infinity', denominator: '2' },
        { numerator: '１', denominator: '2' }, { numerator: '1\n', denominator: '2' },
        { numerator: '1', denominator: '2\n' },
        { numerator: '1'.repeat(65), denominator: '2' },
        { numerator: '-' + '1'.repeat(65), denominator: '2' },
        { numerator: '1', denominator: '2'.repeat(65) },
        { numerator: '0'.repeat(65), denominator: '1' },
        { numerator: { toString: null }, denominator: '1' },
    ])('rejects malformed or over-budget query %j without throwing', value => {
        expect(() => parseExactTime(value)).not.toThrow();
        expect(parseExactTime(value)).toBeNull();
    });
});

describe('authored fraction boundary', () => {
    it('reuses current bounds and preserves exact values while normalizing fractions', () => {
        expect(serializeExactTime(written(6, 8))).toEqual({ numerator: '3', denominator: '4' });
        expect(serializeExactTime(written(1024, 1))).toEqual({ numerator: '1024', denominator: '1' });
        expect(serializeExactTime(written(1, 1024))).toEqual({ numerator: '1', denominator: '1024' });
        expect(serializeExactTime(written(0, 1024, true))).toEqual({ numerator: '0', denominator: '1' });
        expect(fromTabFraction({ numerator: 0, denominator: 1 }, false)).toBeNull();
        // Derived/query values may exceed authored bounds without expanding source input.
        expect(parseExactTime({ numerator: '1025', denominator: '1' })).not.toBeNull();
        expect(fromTabFraction({ numerator: 1025, denominator: 1 }, true)).toBeNull();
    });

    it.each([
        null, undefined, [], true, 1, '1/2', {},
        { numerator: '1', denominator: 2 }, { numerator: 1, denominator: '2' },
        { numerator: 1n, denominator: 2n }, { numerator: -1, denominator: 2 },
        { numerator: 1, denominator: 0 }, { numerator: 1, denominator: -2 },
        { numerator: 1, denominator: 1025 }, { numerator: 1025, denominator: 1 },
        { numerator: 1.5, denominator: 2 }, { numerator: 1, denominator: 2.5 },
        { numerator: NaN, denominator: 2 }, { numerator: 1, denominator: Infinity },
        { numerator: Infinity, denominator: 1 }, { numerator: { valueOf: null }, denominator: 1 },
    ])('rejects malformed authored fraction case %# without exceptions', value => {
        expect(() => fromTabFraction(value, true)).not.toThrow();
        expect(fromTabFraction(value, true)).toBeNull();
    });
});
