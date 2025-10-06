import Gio from 'shims/gi/Gio';
import Meta from 'shims/gi/Meta';
import Shell from 'shims/gi/Shell';
import { wm as windowManager } from 'shims/resource/org/gnome/shell/ui/main';
import type { AppConfig, Nullish, WithExternalBindingName } from 'types';
import { findWindowByAppConfig, getFocusedWindowByApp, isAppMatch } from 'utils/apps';
import ExtensionUtils from 'utils/extension';
import InterfaceUtils from 'utils/interface';

class HotkeyListener {
  #settings: Gio.Settings;
  #actionMap: Map<number, WithExternalBindingName<AppConfig>> | undefined;
  #appSystem: Shell.AppSystem | undefined;
  #appSystemHandlerId: number | undefined;
  #displayHandlerId: number | undefined;
  #extension: ExtensionUtils | undefined;
  #interface: InterfaceUtils | undefined;
  #settingsHandlerId: number | undefined;
  #windowTracker: Shell.WindowTracker | undefined;

  constructor(settings: Gio.Settings) {
    this.#settings = settings;
    this.#init();
  }

  get appSystem() {
    return (this.#appSystem ??= Shell.AppSystem.get_default());
  }

  get extension() {
    return (this.#extension ??= new ExtensionUtils(this.#settings));
  }

  get interface() {
    return (this.#interface ??= new InterfaceUtils());
  }

  get windowTracker() {
    return (this.#windowTracker ??= Shell.WindowTracker.get_default());
  }

  #maybeMoveOrHideWindow(appConfig: AppConfig): boolean {
    const app = this.windowTracker.get_focus_app();

    if (!isAppMatch(app, appConfig)) {
      return false;
    }

    const window = getFocusedWindowByApp(app);

    if (!window) {
      return false;
    }

    this.interface.maybeSuppressAnimation(this.extension.shouldDisableAnimations, () => {
      const activeMonitorIdx = global.display.get_current_monitor();

      if (window.get_monitor() !== activeMonitorIdx) {
        window.move_to_monitor(activeMonitorIdx);
      } else if (window.can_minimize()) {
        window.minimize();
      }
    });

    return true;
  }

  #maybeShowWindow(appConfig: AppConfig): boolean {
    const window = findWindowByAppConfig(this.windowTracker, appConfig);

    if (!window) {
      return false;
    }

    this.interface.maybeSuppressAnimation(this.extension.shouldDisableAnimations, () => {
      if (!window.get_workspace().active) {
        window.change_workspace(global.get_workspace_manager().get_active_workspace());
      }

      const activeMonitorIdx = global.display.get_current_monitor();

      if (window.get_monitor() !== activeMonitorIdx) {
        window.move_to_monitor(activeMonitorIdx);
      }

      window.activate(global.get_current_time());
      window.focus(global.get_current_time());
    });

    return true;
  }

  #maybeLaunchWindow(appConfig: AppConfig): boolean {
    const appInfo = Gio.DesktopAppInfo.new(appConfig.id) as Nullish<Gio.DesktopAppInfo>;
    return appInfo ? appInfo.launch([], null) : false;
  }

  #onAcceleratorActivated(actionId: number) {
    const appConfig = this.#actionMap?.get(actionId);

    if (appConfig) {
      void (
        this.#maybeMoveOrHideWindow(appConfig) ||
        this.#maybeShowWindow(appConfig) ||
        this.#maybeLaunchWindow(appConfig)
      );
    }
  }

  /**
   * Inspiration taken from p2t2p's answer:
   * https://superuser.com/a/1182899
   */
  #registerAppHotkey(appConfig: AppConfig) {
    if (!appConfig.hotkey) {
      return;
    }

    const actionId = global.display.grab_accelerator(appConfig.hotkey, Meta.KeyBindingFlags.NONE);

    switch (actionId) {
      case Meta.KeyBindingAction.NONE: {
        break;
      }

      default: {
        const bindingName = Meta.external_binding_name_for_action(actionId);
        windowManager.allowKeybinding(bindingName, Shell.ActionMode.NORMAL);
        this.#actionMap?.set(actionId, { ...appConfig, bindingName });
        break;
      }
    }
  }

  #init() {
    this.#actionMap = new Map<number, WithExternalBindingName<AppConfig>>();

    this.#appSystemHandlerId = this.appSystem.connect('installed-changed', () => {
      this.#unregisterListeners();
      this.#init();
    });

    this.#displayHandlerId = global.display.connect('accelerator-activated', (_, actionId) => {
      this.#onAcceleratorActivated(actionId);
    });

    this.#settingsHandlerId = this.#settings.connect(`changed::${__SETTINGS_APP_CONFIGS__}`, () => {
      this.#unregisterListeners();
      this.#init();
    });

    this.extension.appConfigs.forEach((appConfig) => {
      this.#registerAppHotkey(appConfig);
    });
  }

  #unregisterListeners() {
    if (this.#actionMap) {
      this.#actionMap.forEach(({ bindingName }, actionId) => {
        windowManager.removeKeybinding(bindingName);
        global.display.ungrab_accelerator(actionId);
      });

      this.#actionMap.clear();
      this.#actionMap = undefined;
    }

    if (typeof this.#appSystemHandlerId === 'number') {
      this.appSystem.disconnect(this.#appSystemHandlerId);
      this.#appSystemHandlerId = undefined;
    }

    if (typeof this.#displayHandlerId === 'number') {
      global.display.disconnect(this.#displayHandlerId);
      this.#displayHandlerId = undefined;
    }

    if (typeof this.#settingsHandlerId === 'number') {
      this.#settings.disconnect(this.#settingsHandlerId);
      this.#settingsHandlerId = undefined;
    }
  }

  public dispose() {
    this.#unregisterListeners();

    this.extension.dispose();
    this.interface.dispose();

    this.#actionMap = undefined;
    this.#appSystem = undefined;
    this.#appSystemHandlerId = undefined;
    this.#displayHandlerId = undefined;
    this.#extension = undefined;
    this.#interface = undefined;
    this.#settingsHandlerId = undefined;
    this.#windowTracker = undefined;
  }
}

export default HotkeyListener;
