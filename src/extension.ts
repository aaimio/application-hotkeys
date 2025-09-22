import { Extension } from 'shims/resource/org/gnome/shell/extensions/extension';
import HotkeyListener from 'utils/hotkey-listener';

class ApplicationHotkeysExtension extends Extension {
  #hotkeyListener: HotkeyListener | undefined;

  public enable() {
    this.#hotkeyListener = new HotkeyListener(this.getSettings());
  }

  public disable() {
    this.#hotkeyListener?.dispose();
    this.#hotkeyListener = undefined;
  }
}

export default ApplicationHotkeysExtension;
