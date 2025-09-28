import type GLib from 'shims/gi/GLib';
import Gio from 'shims/gi/Gio';
import { wm } from 'shims/resource/org/gnome/shell/ui/main';
import type { PatchedWindowManager } from 'types';

class InterfaceUtils {
  #settings: Gio.Settings;
  #originalShouldAnimate: (() => void) | undefined;
  #timeout: GLib.Source | undefined;

  constructor() {
    this.#settings = new Gio.Settings({ schema_id: __INTERFACE_SCHEMA_ID__ });
    this.#originalShouldAnimate = (wm as PatchedWindowManager)._shouldAnimate;
  }

  /**
   * From https://extensions.gnome.org/extension/119/disable-window-animations/
   */
  public maybeSuppressAnimation(shouldSuppress: boolean, callback: () => void) {
    const windowManager = wm as PatchedWindowManager;

    if (
      shouldSuppress &&
      typeof windowManager._shouldAnimate === 'function' &&
      this.#settings.get_boolean(__SETTINGS_KEY_ENABLE_ANIMATIONS__)
    ) {
      this.maybeClearTimeout();

      windowManager._shouldAnimate = () => false;

      callback();

      this.#timeout = setTimeout(() => {
        windowManager._shouldAnimate = this.#originalShouldAnimate;
      }, 100);
    } else {
      callback();
    }
  }

  public maybeClearTimeout() {
    if (this.#timeout) {
      clearTimeout(this.#timeout);
    }
  }

  public dispose() {
    this.maybeClearTimeout();
    (wm as PatchedWindowManager)._shouldAnimate = this.#originalShouldAnimate;
  }
}

export default InterfaceUtils;
