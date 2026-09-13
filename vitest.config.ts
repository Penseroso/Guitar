import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    // Read-only Stage-9 comparison snapshot is not the current application suite.
    test:{exclude:[...configDefaults.exclude,'**/.tmp-policy-baseline/**']},
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
