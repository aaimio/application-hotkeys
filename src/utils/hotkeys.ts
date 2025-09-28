import Gdk from 'shims/gi/Gdk';
import Gtk from 'shims/gi/Gtk';

const isForbiddenKeyValue = (keyValue: number) => {
  return [
    /* Navigation keys */
    Gdk.KEY_Home,
    Gdk.KEY_Left,
    Gdk.KEY_Up,
    Gdk.KEY_Right,
    Gdk.KEY_Down,
    Gdk.KEY_Page_Up,
    Gdk.KEY_Page_Down,
    Gdk.KEY_End,
    Gdk.KEY_Tab,

    /* Return */
    Gdk.KEY_KP_Enter,
    Gdk.KEY_Return,

    Gdk.KEY_Mode_switch,
  ].includes(keyValue);
};

const isValidAccelerator = (keyValue: number, modifiers: number) => {
  return (
    Gtk.accelerator_valid(keyValue, modifiers) || (keyValue === Gdk.KEY_Tab && modifiers !== 0)
  );
};

/**
 * https://github.com/GNOME/gnome-control-center/blob/main/panels/keyboard/keyboard-shortcuts.c
 */
export const isValidBinding = (keyCode: number, keyValue: number, modifiers: number) => {
  if ((modifiers === 0 || modifiers === Gdk.ModifierType.SHIFT_MASK) && keyCode !== 0) {
    if (
      (keyValue >= Gdk.KEY_a && keyValue <= Gdk.KEY_z) ||
      (keyValue >= Gdk.KEY_A && keyValue <= Gdk.KEY_Z) ||
      (keyValue >= Gdk.KEY_0 && keyValue <= Gdk.KEY_9) ||
      (keyValue >= Gdk.KEY_kana_fullstop && keyValue <= Gdk.KEY_semivoicedsound) ||
      (keyValue >= Gdk.KEY_Arabic_comma && keyValue <= Gdk.KEY_Arabic_sukun) ||
      (keyValue >= Gdk.KEY_Serbian_dje && keyValue <= Gdk.KEY_Cyrillic_HARDSIGN) ||
      (keyValue >= Gdk.KEY_Greek_ALPHAaccent && keyValue <= Gdk.KEY_Greek_omega) ||
      (keyValue >= Gdk.KEY_hebrew_doublelowline && keyValue <= Gdk.KEY_hebrew_taf) ||
      (keyValue >= Gdk.KEY_Thai_kokai && keyValue <= Gdk.KEY_Thai_lekkao) ||
      (keyValue >= Gdk.KEY_Hangul_Kiyeog && keyValue <= Gdk.KEY_Hangul_J_YeorinHieuh) ||
      (keyValue === Gdk.KEY_space && modifiers === 0) ||
      isForbiddenKeyValue(keyValue)
    ) {
      return false;
    }
  }

  return isValidAccelerator(keyValue, modifiers);
};
