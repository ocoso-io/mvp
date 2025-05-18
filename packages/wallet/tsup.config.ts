import {defineConfig} from 'tsup';

export default defineConfig((options) => {
    return {
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
        minify: options.minify,
        external: ['react', 'react-dom'],
        outExtension({format}) {
            return {
                js: format === 'cjs' ? '.js' : '.mjs',
            };
        },
    }
})
;