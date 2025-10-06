import { wm as originalWm } from 'shims/resource/org/gnome/shell/ui/main';
import type { PatchedWindowManager } from 'types';

export const wm = originalWm as PatchedWindowManager;
