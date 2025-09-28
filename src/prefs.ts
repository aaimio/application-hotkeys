import type Adw from 'shims/gi/Adw';
import { ExtensionPreferences } from 'shims/resource/org/gnome/Shell/Extensions/js/extensions/prefs';
import ExtensionUtils from 'utils/extension';
import Preferences from 'utils/preferences';

class ApplicationHotkeysPreferences extends ExtensionPreferences {
  // @ts-expect-error TS expects a promise here, error in upstream types?
  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    const settings = this.getSettings();

    const preferences = new Preferences({
      extension: new ExtensionUtils(settings),
      settings,
      window,
    });

    preferences.fillPreferencesWindow();
  }
}

export default ApplicationHotkeysPreferences;
