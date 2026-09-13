export const ENGINE_VERSIONS = Object.freeze({
    engine: 'guitar-engine/2', structural: 'structural-v1', realization: 'identity-v1',
    physical: 'physical-screen-v1', geometry: 'geometry-um-v1', ranking: 'classic-v1',
    features: 'legacy-rank-features-v1', numeric: 'rank-int-v1', protocol: 'engine-worker-v2',
    product:'product-policy-v2.1',demand:'physical-demand-policy-v1',demandGeometry:'demand-geometry-um-v1',
    vocabulary:'practical-vocabulary-v1',translation:'practical-exact-translation-v1',
    surface:'recommended-surface-v2',surfaceRequest:'surface-request-v2',surfaceCursor:'surface-cursor-v2',
    empirical: Object.freeze({ enabled: false }),
} as const);
