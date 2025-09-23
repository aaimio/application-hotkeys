import type { wm as windowManager } from 'shims/resource/org/gnome/shell/ui/main';

export interface AppConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  hotkey: string;
}

export type AppConfigTuple = [appId: string, hotkey: string];

export type SerializedAppConfigTuple = `[${string},${string}]`;

export type Nullish<T> = T | null | undefined;

export type WithExternalBindingName<T> = T & {
  bindingName: string;
};

export type PatchedWindowManager = typeof windowManager & {
  _shouldAnimate?: () => void;
};
