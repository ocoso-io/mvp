import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.ts',
  output: {
    file: 'dist/bundle.js', // Stelle sicher, dass dies so konfiguriert ist
    format: 'es',
    sourcemap: true
  },
  plugins: [
    resolve(),
    typescript({
      tsconfig: 'tsconfig.json',
      sourceMap: true
    }),
    production && terser(),
    !production && serve({
      contentBase: ['dist', 'demo'],
      port: 3000
    }),
    !production && livereload()
  ],
  watch: {
    clearScreen: false
  }
};