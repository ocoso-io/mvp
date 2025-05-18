import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: {
        compilerOptions: {
            incremental: false,
        }
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    minify: process.env.NODE_ENV === 'production',
    external: ['react', 'react-dom'],
    outExtension({ format }) {
        return {
            js: format === 'cjs' ? '.js' : '.mjs',
        };
    },
});