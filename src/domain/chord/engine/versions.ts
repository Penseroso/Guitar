export const ENGINE_VERSIONS = Object.freeze({
    engine: 'guitar-engine/1', structural: 'structural-v1', realization: 'identity-v1',
    physical: 'physical-screen-v1', geometry: 'geometry-um-v1', ranking: 'classic-v1',
    features: 'legacy-rank-features-v1', numeric: 'rank-int-v1', protocol: 'engine-worker-v1',
    empirical: Object.freeze({ enabled: false }),
} as const);
