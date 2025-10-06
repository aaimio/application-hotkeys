import type GLib from 'shims/gi/GLib';
import Gio from 'shims/gi/Gio';
import { wm as windowManager } from 'utils/window-manager';
import { noop } from './noop';

class InterfaceUtils {
  #settings: Gio.Settings | undefined;
  #isAnimationsEnabled: boolean | undefined;
  #originalShouldAnimate: (() => void) | undefined;
  #settingsHandlerIds: number[] | undefined;
  #timeout: GLib.Source | undefined;

  constructor() {
    this.#originalShouldAnimate = windowManager._shouldAnimate;

    this.#settingsHandlerIds = [
      this.settings.connect(`changed::${__SETTINGS_ENABLE_ANIMATIONS__}`, () => {
        this.#isAnimationsEnabled = undefined;
      }),
    ];
  }

  get isAnimationsEnabled() {
    if (typeof this.#isAnimationsEnabled === 'undefined') {
      this.#isAnimationsEnabled = this.settings.get_boolean(__SETTINGS_ENABLE_ANIMATIONS__);
    }

    return this.#isAnimationsEnabled;
  }

  get settings() {
    return (this.#settings ??= new Gio.Settings({ schema_id: __INTERFACE_SCHEMA_ID__ }));
  }

  #clearTimeout() {
    if (typeof this.#timeout !== 'undefined') {
      clearTimeout(this.#timeout);
      this.#timeout = undefined;
    }
  }

  #overrideShouldAnimate() {
    windowManager._shouldAnimate = noop;
  }

  #restoreShouldAnimate() {
    windowManager._shouldAnimate = this.#originalShouldAnimate;
  }

  /**
   * From https://extensions.gnome.org/extension/119/disable-window-animations/
   */
  public maybeSuppressAnimation(shouldSuppress: boolean, callback: () => void) {
    if (
      !shouldSuppress ||
      !this.isAnimationsEnabled ||
      typeof windowManager._shouldAnimate !== 'function'
    ) {
      callback();
      return;
    }

    this.#clearTimeout();
    this.#overrideShouldAnimate();

    callback();

    this.#timeout = setTimeout(() => {
      this.#restoreShouldAnimate();
    }, 100);
  }

  public dispose() {
    this.#clearTimeout();
    this.#restoreShouldAnimate();

    if (this.#settingsHandlerIds) {
      this.#settingsHandlerIds.forEach((handlerId) => {
        this.settings.disconnect(handlerId);
      });
    }

    this.#settings = undefined;
    this.#originalShouldAnimate = undefined;
    this.#settingsHandlerIds = undefined;
    this.#isAnimationsEnabled = undefined;
    this.#timeout = undefined;
  }
}

export default InterfaceUtils;
