import type Gio from 'shims/gi/Gio';
import type Shell from 'shims/gi/Shell';
import type { AppConfig, Nullish } from 'types';

export const appInfoToAppConfig = ({
  appId,
  appInfo,
  hotkey,
}: {
  appId: string;
  appInfo: Nullish<Gio.AppInfo>;
  hotkey: Nullish<string>;
}): AppConfig => {
  return {
    id: appInfo?.get_id() ?? appId,
    name: appInfo?.get_name() ?? appId,
    description: appInfo?.get_description() ?? '',
    icon: appInfo?.get_icon()?.to_string() ?? 'application-x-executable',
    hotkey: hotkey ?? '',
  };
};

export const findWindowByAppConfig = (windowTracker: Shell.WindowTracker, appConfig: AppConfig) => {
  for (const windowActor of global.get_window_actors()) {
    const window = windowActor.get_meta_window();

    if (!window || window.is_override_redirect()) {
      continue;
    }

    if (isAppMatch(windowTracker.get_window_app(window), appConfig)) {
      return window;
    }
  }

  return undefined;
};

export const getFocusedWindowByApp = (app: Nullish<Shell.App>) => {
  return app ? app.get_windows().find((window) => window.has_focus()) : undefined;
};

export const isAppMatch = (app: Nullish<Shell.App>, appConfig: AppConfig): app is Shell.App => {
  return app ? app.get_name() === appConfig.name : false;
};
