import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import packageJSON from './package.json';
import metadata from './src/metadata.json';

const config = defineConfig({
  define: {
    __EXTENSION_AUTHOR__: JSON.stringify(packageJSON.author),
    __EXTENSION_NAME__: JSON.stringify(metadata.name),
    __EXTENSION_URL__: JSON.stringify(metadata.url),
    __EXTENSION_URL_ISSUES__: JSON.stringify(packageJSON.bugs.url),
    __EXTENSION_VERSION__: JSON.stringify(`v${metadata.version}`),
    __INTERFACE_SCHEMA_ID__: JSON.stringify('org.gnome.desktop.interface'),
    __SETTINGS_KEY_APP_CONFIGS__: JSON.stringify('configs'),
    __SETTINGS_KEY_ENABLE_ANIMATIONS__: JSON.stringify('enable-animations'),
    __SETTINGS_KEY_SKIP_ANIMATIONS__: JSON.stringify('skip-animations'),
  },

  build: {
    emptyOutDir: false,
    minify: false, // https://gjs.guide/extensions/review-guidelines/review-guidelines.html#code-must-not-be-obfuscated
    lib: {
      entry: ['./src/extension.ts', './src/prefs.ts'],
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        chunkFileNames: 'shared/[name].js',
      },
    },
  },
  plugins: [tsconfigPaths()],
});

export default config;
