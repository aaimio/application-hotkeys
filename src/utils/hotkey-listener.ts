import ExtensionSettings from 'settings/extension-settings';
import InterfaceSettings from 'settings/interface-settings';
import Gio from 'shims/gi/Gio';
import Meta from 'shims/gi/Meta';
import Shell from 'shims/gi/Shell';
import { wm as windowManager } from 'shims/resource/org/gnome/shell/ui/main';
import type { AppConfig, Nullish, WithExternalBindingName } from 'types';

class HotkeyListener {
  #actionMap: Map<number, WithExternalBindingName<AppConfig>> | undefined;
  #appSystem: Shell.AppSystem;
  #appSystemHandlerId: number | undefined;
  #displayHandlerId: number | undefined;
  #extension: ExtensionSettings;
  #interface: InterfaceSettings;
  #settings: Gio.Settings;
  #settingsHandlerId: number | undefined;
  #windowTracker: Shell.WindowTracker;

  constructor(settings: Gio.Settings) {
    this.#appSystem = Shell.AppSystem.get_default();
    this.#extension = new ExtensionSettings(settings);
    this.#interface = new InterfaceSettings();
    this.#settings = settings;
    this.#windowTracker = Shell.WindowTracker.get_default();
    this.#init();
  }

  #isAppMatch(app: Nullish<Shell.App>, appConfig: AppConfig): app is Shell.App {
    return app ? app.get_name() === appConfig.name : false;
  }

  #getFirstWindowByAppConfig(appConfig: AppConfig) {
    for (const windowActor of global.get_window_actors()) {
      const window = windowActor.get_meta_window();

      if (!window || window.is_override_redirect()) {
        continue;
      }

      if (this.#isAppMatch(this.#windowTracker.get_window_app(window), appConfig)) {
        return window;
      }
    }

    return undefined;
  }

  #getFocusedWindow(app: Nullish<Shell.App>) {
    if (app) {
      return app.get_windows().find((window) => {
        return window.has_focus();
      });
    }

    return undefined;
  }

  #maybeMoveOrHideWindow(appConfig: AppConfig): boolean {
    const app = this.#windowTracker.get_focus_app();

    if (!this.#isAppMatch(app, appConfig)) {
      return false;
    }

    const window = this.#getFocusedWindow(app);

    if (!window) {
      return false;
    }

    this.#interface.maybeSuppressAnimation(this.#extension.shouldSkipAnimations, () => {
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
    const window = this.#getFirstWindowByAppConfig(appConfig);

    if (!window) {
      return false;
    }

    this.#interface.maybeSuppressAnimation(this.#extension.shouldSkipAnimations, () => {
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
    const reinitialise = () => {
      this.dispose();
      this.#init();
    };

    this.#actionMap = new Map<number, WithExternalBindingName<AppConfig>>();
    this.#appSystemHandlerId = this.#appSystem.connect('installed-changed', reinitialise);

    /**
     * From p2t2p's answer https://superuser.com/a/1182899
     */
    this.#displayHandlerId = global.display.connect('accelerator-activated', (_, actionId) => {
      this.#onAcceleratorActivated(actionId);
    });

    this.#settingsHandlerId = this.#settings.connect(
      `changed::${__SETTINGS_KEY_APP_CONFIGS__}`,
      reinitialise,
    );

    this.#extension.getAppConfigs().forEach((appConfig) => {
      this.#registerAppHotkey(appConfig);
    });
  }

  public dispose() {
    if (this.#actionMap) {
      this.#actionMap.forEach(({ bindingName }, actionId) => {
        windowManager.removeKeybinding(bindingName);
        global.display.ungrab_accelerator(actionId);
      });

      this.#actionMap.clear();
      this.#actionMap = undefined;
    }

    if (typeof this.#appSystemHandlerId === 'number') {
      this.#appSystem.disconnect(this.#appSystemHandlerId);
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
}

export default HotkeyListener;
