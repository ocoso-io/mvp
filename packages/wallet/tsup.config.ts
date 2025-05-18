import {defineConfig, Options} from 'tsup';

export default defineConfig((options) => {
    return {
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        dts: {
            compilerOptions: {
                incremental: false,
            },
            resolve: true,
            entry: {
                'index': 'src/index.ts'
            }
        },
        splitting: true,
        sourcemap: !options.minify,
        treeshake: true,
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