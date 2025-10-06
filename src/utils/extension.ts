import Gio from 'shims/gi/Gio';
import type { AppConfig, AppConfigTuple, SerializedAppConfigTuple } from 'types';
import { appInfoToAppConfig } from 'utils/apps';

class ExtensionUtils {
  #settings: Gio.Settings;
  #appConfigs: AppConfig[] | undefined;
  #configuredAppIds: string[] | undefined;
  #serializedAppConfigs: SerializedAppConfigTuple[] | undefined;
  #settingsHandlerIds: number[] | undefined;
  #shouldDisableAnimations: boolean | undefined;

  constructor(settings: Gio.Settings) {
    this.#settings = settings;

    this.#settingsHandlerIds = [
      settings.connect(`changed::${__SETTINGS_APP_CONFIGS__}`, () => {
        this.#appConfigs = undefined;
        this.#configuredAppIds = undefined;
        this.#serializedAppConfigs = undefined;
      }),

      settings.connect(`changed::${__SETTINGS_DISABLE_ANIMATIONS__}`, () => {
        this.#shouldDisableAnimations = undefined;
      }),
    ];
  }

  get appConfigs() {
    return (this.#appConfigs ??= this.#getAppConfigs(this.serializedAppConfigs));
  }

  get configuredAppIds() {
    return (this.#configuredAppIds ??= this.#getConfiguredAppIds(this.serializedAppConfigs));
  }

  get serializedAppConfigs() {
    return (this.#serializedAppConfigs ??= this.#settings.get_strv(
      __SETTINGS_APP_CONFIGS__,
    ) as SerializedAppConfigTuple[]);
  }

  get shouldDisableAnimations() {
    if (typeof this.#shouldDisableAnimations === 'undefined') {
      this.#shouldDisableAnimations = this.#settings.get_boolean(__SETTINGS_DISABLE_ANIMATIONS__);
    }

    return this.#shouldDisableAnimations;
  }

  #getAppConfigs(serializedAppConfigs: SerializedAppConfigTuple[]) {
    return serializedAppConfigs.reduce((appConfigs: AppConfig[], serializedAppConfig) => {
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

  #getConfiguredAppIds(serializedAppConfigs: SerializedAppConfigTuple[]) {
    return serializedAppConfigs.reduce((accumulator: string[], serializedAppConfig) => {
      const [appId] = this.deserializeAppConfig(serializedAppConfig) ?? [];
      return appId ? [...accumulator, appId] : accumulator;
    }, []);
  }

  public writeSerializedAppConfigs(serializedAppConfigs: SerializedAppConfigTuple[]) {
    return this.#settings.set_strv(__SETTINGS_APP_CONFIGS__, serializedAppConfigs);
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

  public getFilteredApps() {
    return Gio.AppInfo.get_all().filter((appInfo) => {
      if (appInfo.should_show()) {
        const appId = appInfo.get_id();

        if (appId) {
          return !this.configuredAppIds.includes(appId);
        }
      }

      return false;
    });
  }

  public addAppConfig(appConfig: AppConfig) {
    return this.writeSerializedAppConfigs([
      ...this.serializedAppConfigs,
      this.serializeAppConfig(appConfig),
    ]);
  }

  public removeAppConfigByAppId(targetAppId: string) {
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
  }

  public updateAppConfigById(appId: string, properties: Pick<AppConfig, 'hotkey'>) {
    for (const appConfig of this.appConfigs) {
      if (appConfig.id !== appId) {
        continue;
      }

      if (typeof properties.hotkey === 'string') {
        appConfig.hotkey = properties.hotkey;

        return this.writeSerializedAppConfigs(
          this.appConfigs.map((appConfig) => {
            return this.serializeAppConfig(appConfig);
          }),
        );
      }

      break;
    }

    return false;
  }

  public writeShouldSkipAnimations(shouldSkipAnimations: boolean) {
    return this.#settings.set_boolean(__SETTINGS_DISABLE_ANIMATIONS__, shouldSkipAnimations);
  }

  public dispose() {
    if (this.#settingsHandlerIds) {
      this.#settingsHandlerIds.forEach((handlerId) => {
        this.#settings.disconnect(handlerId);
      });
    }

    this.#appConfigs = undefined;
    this.#configuredAppIds = undefined;
    this.#serializedAppConfigs = undefined;
    this.#settingsHandlerIds = undefined;
    this.#shouldDisableAnimations = undefined;
  }
}

export default ExtensionUtils;
