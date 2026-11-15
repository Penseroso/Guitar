import { normalizeTabFraction } from './input-capabilities';

/** JSON-safe exact quarter-note value. Decimal strings avoid lossy number coercion. */
export interface TabExactFraction {
    readonly numerator: string;
    readonly denominator: string;
}

/** Canonical rational for arithmetic; construct through the parsers below. */
export interface ExactTime {
    readonly numerator: bigint;
    readonly denominator: bigint;
}

const record = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

function gcd(left: bigint, right: bigint): bigint {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function normalized(numerator: bigint, denominator: bigint): ExactTime {
    if (numerator === 0n) return { numerator: 0n, denominator: 1n };
    const divisor = gcd(numerator, denominator);
    return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function integerString(value: string, signed: boolean): boolean {
    const digits = signed && value.startsWith('-') ? value.slice(1) : value;
    // A negative character class also rejects final newlines, unlike a JS `$` anchor.
    return digits.length >= 1 && digits.length <= 64 && !/[^0-9]/.test(digits);
}

/** Parse bounded query data, without accepting float/exponent syntax or number values. */
export function parseExactTime(value: unknown): ExactTime | null {
    if (!record(value) || typeof value.numerator !== 'string' || typeof value.denominator !== 'string'
        || !integerString(value.numerator, true) || !integerString(value.denominator, false)) return null;
    const denominator = BigInt(value.denominator);
    if (denominator === 0n) return null;
    return normalized(BigInt(value.numerator), denominator);
}

/** Existing authored bounds remain separate from the derived/query representation. */
export function fromTabFraction(value: unknown, allowZero: boolean): ExactTime | null {
    if (!record(value) || typeof value.numerator !== 'number' || typeof value.denominator !== 'number') return null;
    const fraction = normalizeTabFraction({ numerator: value.numerator, denominator: value.denominator }, allowZero);
    return fraction ? normalized(BigInt(fraction.numerator), BigInt(fraction.denominator)) : null;
}

export function addExactTimes(left: ExactTime, right: ExactTime): ExactTime {
    const common = gcd(left.denominator, right.denominator);
    const leftScale = right.denominator / common;
    const rightScale = left.denominator / common;
    return normalized(left.numerator * leftScale + right.numerator * rightScale, left.denominator * leftScale);
}

export function compareExactTimes(left: ExactTime, right: ExactTime): -1 | 0 | 1 {
    const common = gcd(left.denominator, right.denominator);
    const a = left.numerator * (right.denominator / common);
    const b = right.numerator * (left.denominator / common);
    return a < b ? -1 : a > b ? 1 : 0;
}

export function serializeExactTime(value: ExactTime): TabExactFraction {
    return { numerator: value.numerator.toString(), denominator: value.denominator.toString() };
}
