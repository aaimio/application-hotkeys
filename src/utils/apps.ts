import type Gio from 'shims/gi/Gio';
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
