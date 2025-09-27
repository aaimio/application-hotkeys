import Gio from 'shims/gi/Gio';
import type { AppConfig, AppConfigTuple, SerializedAppConfigTuple } from 'types';
import { appInfoToAppConfig } from 'utils/apps';

class ExtensionSettings {
  #settings: Gio.Settings;

  constructor(settings: Gio.Settings) {
    this.#settings = settings;
  }

  get shouldSkipAnimations() {
    return this.#settings.get_boolean(__SETTINGS_KEY_SKIP_ANIMATIONS__);
  }

  get serializedAppConfigs() {
    return this.#settings.get_strv(__SETTINGS_KEY_APP_CONFIGS__) as SerializedAppConfigTuple[];
  }

  public writeSerializedAppConfigs(serializedAppConfigs: SerializedAppConfigTuple[]) {
    return this.#settings.set_strv(__SETTINGS_KEY_APP_CONFIGS__, serializedAppConfigs);
  }

  public serializeAppConfig({ id, hotkey }: AppConfig) {
    return JSON.stringify([id, hotkey] satisfies AppConfigTuple) as SerializedAppConfigTuple;
  }

  public deserializeAppConfig(serializedAppConfig: SerializedAppConfigTuple) {
    try {
      const [appId, hotkey] = JSON.parse(serializedAppConfig) as AppConfigTuple;

      if (appId && typeof appId === 'string' && typeof hotkey === 'string') {
        return [appId, hotkey];
      }
    } catch {
      /* empty */
    }

    return undefined;
  }

  public getConfiguredAppIds() {
    return this.serializedAppConfigs.reduce((accumulator: string[], serializedAppConfig) => {
      const [appId] = this.deserializeAppConfig(serializedAppConfig) ?? [];
      return appId ? [...accumulator, appId] : accumulator;
    }, []);
  }

  public getAppConfigs() {
    return this.serializedAppConfigs.reduce((appConfigs: AppConfig[], serializedAppConfig) => {
      const [appId, hotkey] = this.deserializeAppConfig(serializedAppConfig) ?? [];

      if (!appId) {
        return appConfigs;
      }

      const appInfo =
        /**
         * There might be a case where an appId cannot be matched with a desktop
         * file while executing this. This can happen if an app was uninstalled or
         * if the desktop file isn't available right now (e.g. for distrobox
         * apps). Don't filter them out here, if a user wants to remove an app,
         * they can do so from the extension settings.
         */
        Gio.DesktopAppInfo.new(appId);

      appConfigs.push(appInfoToAppConfig({ appId, appInfo, hotkey }));

      return appConfigs;
    }, []);
  }

  public addAppConfig(appConfig: AppConfig) {
    return this.writeSerializedAppConfigs([
      ...this.serializedAppConfigs,
      this.serializeAppConfig(appConfig),
    ]);
  }

  public removeAppConfigByAppId = (targetAppId: string) => {
    const serializedAppConfigs = [...this.serializedAppConfigs];

    const idx = serializedAppConfigs.findIndex((serializedAppConfig) => {
      const [currentAppId] = this.deserializeAppConfig(serializedAppConfig) ?? [];
      return currentAppId && currentAppId === targetAppId;
    });

    if (idx > -1) {
      serializedAppConfigs.splice(idx, 1);
      return this.writeSerializedAppConfigs(serializedAppConfigs);
    }

    return false;
  };

  public updateAppConfigById(appId: string, properties: Pick<AppConfig, 'hotkey'>) {
    const appConfigs = this.getAppConfigs();

    for (const appConfig of appConfigs) {
      if (appConfig.id !== appId) {
        continue;
      }

      if (typeof properties.hotkey === 'string') {
        appConfig.hotkey = properties.hotkey;

        return this.writeSerializedAppConfigs(
          appConfigs.map((appConfig) => {
            return this.serializeAppConfig(appConfig);
          }),
        );
      }

      break;
    }

    return false;
  }

  public setShouldSkipAnimations(shouldSkipAnimations: boolean) {
    return this.#settings.set_boolean(__SETTINGS_KEY_SKIP_ANIMATIONS__, shouldSkipAnimations);
  }
}

export default ExtensionSettings;
