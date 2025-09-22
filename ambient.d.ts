import '@girs/gjs';
import '@girs/gjs/dom';
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

declare global {
  const __EXTENSION_AUTHOR__: string;
  const __EXTENSION_NAME__: string;
  const __EXTENSION_URL__: string;
  const __EXTENSION_URL_ISSUES__: string;
  const __EXTENSION_VERSION__: string;
  const __INTERFACE_SCHEMA_ID__: string;
  const __SETTINGS_KEY_APP_CONFIGS__: string;
  const __SETTINGS_KEY_ENABLE_ANIMATIONS__: string;
  const __SETTINGS_KEY_SKIP_ANIMATIONS__: string;
}
