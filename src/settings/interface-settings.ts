import Gio from 'shims/gi/Gio';

class InterfaceSettings {
  #settings: Gio.Settings;

  constructor() {
    this.#settings = new Gio.Settings({ schema_id: __INTERFACE_SCHEMA_ID__ });
  }

  maybeSuppressAnimation(shouldSuppress: boolean, callback: () => void) {
    let shouldRestoreInitialValue = false;

    if (shouldSuppress && this.#settings.get_boolean(__SETTINGS_KEY_ENABLE_ANIMATIONS__)) {
      this.#settings.set_boolean(__SETTINGS_KEY_ENABLE_ANIMATIONS__, false);
      shouldRestoreInitialValue = true;
    }

    callback();

    if (shouldRestoreInitialValue) {
      this.#settings.set_boolean(__SETTINGS_KEY_ENABLE_ANIMATIONS__, true);
    }
  }
}

export default InterfaceSettings;
