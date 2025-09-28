import Adw from 'shims/gi/Adw';
import GObject from 'shims/gi/GObject';
import Gdk from 'shims/gi/Gdk';
import type Gio from 'shims/gi/Gio';
import Gtk from 'shims/gi/Gtk';
import { gettext } from 'shims/resource/org/gnome/Shell/Extensions/js/extensions/prefs';
import type { AppConfig } from 'types';
import { appInfoToAppConfig } from 'utils/apps';
import type ExtensionUtils from 'utils/extension';
import { isValidBinding } from 'utils/hotkeys';

class Preferences {
  #extension: ExtensionUtils;
  #settings: Gio.Settings;
  #window: Adw.PreferencesWindow;

  constructor({
    extension,
    settings,
    window,
  }: {
    extension: ExtensionUtils;
    settings: Gio.Settings;
    window: Adw.PreferencesWindow;
  }) {
    this.#extension = extension;
    this.#settings = settings;
    this.#window = window;
  }

  #onConfigureHotkeyButtonClicked() {
    return () => {
      this.#createAppChooserDialog().show();
    };
  }

  #onAppHotkeyPressed(appConfig: AppConfig, dialog: Gtk.Dialog) {
    return (
      _source: Gtk.EventControllerKey,
      keyValue: number,
      keyCode: number,
      mask: Gdk.ModifierType,
    ) => {
      let modifiers = mask & Gtk.accelerator_get_default_mod_mask();

      if (modifiers === 0 && keyValue === Gdk.KEY_Escape) {
        dialog.close();
        return Gdk.EVENT_STOP;
      }

      if (modifiers === 0 && keyValue === Gdk.KEY_BackSpace) {
        this.#extension.updateAppConfigById(appConfig.id, { hotkey: '' });
        dialog.close();
      } else {
        modifiers &= ~Gdk.ModifierType.LOCK_MASK;

        if (isValidBinding(keyCode, keyValue, modifiers)) {
          this.#extension.updateAppConfigById(appConfig.id, {
            hotkey: Gtk.accelerator_name_with_keycode(null, keyValue, keyCode, modifiers),
          });

          dialog.close();
        }
      }

      return Gdk.EVENT_STOP;
    };
  }

  #onAppHotkeyButtonClicked(appConfig: AppConfig) {
    return () => {
      this.#createAppHotkeyDialog(appConfig).show();
    };
  }

  #onAppDeleteButtonClicked(appConfig: AppConfig) {
    return () => {
      this.#extension.removeAppConfigByAppId(appConfig.id);
    };
  }

  #onAppChooserTreeRowActivated(dialog: Gtk.Dialog) {
    return () => {
      dialog.response(Gtk.ResponseType.OK);
    };
  }

  #onAppChooserDialogResponse(tree: Gtk.TreeView) {
    return (dialog: Gtk.Dialog, responseType: Gtk.ResponseType) => {
      switch (responseType) {
        case Gtk.ResponseType.OK: {
          const [isSuccess, model, iterator] = tree.get_selection().get_selected();

          if (!isSuccess || !model || !iterator) {
            break;
          }

          const appName = model.get_value(iterator, 0);

          const appInfo = this.#extension.getFilteredApps().find((appInfo) => {
            return appInfo.get_name() === appName;
          });

          if (appInfo) {
            this.#extension.addAppConfig(
              appInfoToAppConfig({
                appInfo,
                appId: appInfo.get_id() ?? gettext('<unknown>'),
                hotkey: '',
              }),
            );
          }

          break;
        }

        default: {
          break;
        }
      }

      dialog.destroy();
    };
  }

  #onAboutButtonClicked() {
    return () => {
      this.#createAboutDialog().present(this.#window);
    };
  }

  #onSkipAnimationsChange(toggle: Gtk.Switch) {
    return () => {
      this.#extension.setShouldSkipAnimations(toggle.active);
    };
  }

  #createScrollableWindow(child: Gtk.Widget) {
    return new Gtk.ScrolledWindow({
      child,
      hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
      vexpand: true,
    });
  }

  #createAppHotkeyEventController(appConfig: AppConfig, dialog: Gtk.Dialog) {
    const controller = new Gtk.EventControllerKey();

    controller.connect('key-pressed', this.#onAppHotkeyPressed(appConfig, dialog));

    return controller;
  }

  #createAppChooserList() {
    const list = new Gtk.ListStore();

    list.set_column_types([GObject.TYPE_STRING]);
    list.set_sort_column_id(0, Gtk.SortType.ASCENDING);

    this.#extension.getFilteredApps().forEach((appInfo) => {
      list.set_value(list.append(), 0, appInfo.get_name() || gettext('<unknown>'));
    });

    return list;
  }

  #createAppChooserTree(dialog: Gtk.Dialog) {
    const tree = new Gtk.TreeView({ model: this.#createAppChooserList() });

    tree.get_selection().set_mode(Gtk.SelectionMode.SINGLE);
    tree.connect('row-activated', this.#onAppChooserTreeRowActivated(dialog));

    const column = new Gtk.TreeViewColumn({ title: gettext('Application') });
    const cell = new Gtk.CellRendererText();

    column.pack_start(cell, true);
    column.add_attribute(cell, 'text', 0);

    tree.append_column(column);

    return tree;
  }

  /**
   * Based on Happy Appy Hotkey's dialog:
   * https://github.com/jqno/gnome-happy-appy-hotkey/blob/86d703c/prefs.js#L251
   */
  #createAppChooserDialog() {
    const dialog = new Gtk.Dialog({
      height_request: 500,
      width_request: 400,
      modal: true,
      title: gettext('Select application'),
      transient_for: this.#window,
    });

    const tree = this.#createAppChooserTree(dialog);

    dialog.add_button(gettext('Cancel'), Gtk.ResponseType.CANCEL);
    dialog.add_button(gettext('Confirm'), Gtk.ResponseType.OK);
    dialog.set_default_response(Gtk.ResponseType.OK);
    dialog.get_content_area().append(this.#createScrollableWindow(tree));
    dialog.connect('response', this.#onAppChooserDialogResponse(tree));

    return dialog;
  }

  #createAppHotkeyDialog(appConfig: AppConfig) {
    const dialog = new Gtk.Dialog({
      height_request: 200,
      width_request: 350,
      modal: true,
      title: gettext('Register hotkey'),
      transient_for: this.#window,
    });

    const box = new Gtk.Box({
      marginStart: 42,
      marginTop: 42,
      marginBottom: 42,
      marginEnd: 42,
      orientation: Gtk.Orientation.VERTICAL,
    });

    dialog.get_content_area().append(box);

    const label = new Gtk.Label({
      css_classes: ['dim-label'],
      label: gettext('Press a hotkey, Escape to cancel, or Backspace to clear.'),
      vexpand: true,
    });

    box.append(label);

    dialog.add_controller(this.#createAppHotkeyEventController(appConfig, dialog));

    return dialog;
  }

  #createAppHotkeyButton(appConfig: AppConfig) {
    const button = new Gtk.Button({
      label: appConfig.hotkey || gettext('Not set'),
      valign: Gtk.Align.CENTER,
    });

    button.connect('clicked', this.#onAppHotkeyButtonClicked(appConfig));

    return button;
  }

  #createAppRowSuffix(appConfig: AppConfig) {
    const box = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      margin_bottom: 8,
      margin_end: 8,
      margin_top: 8,
      spacing: 8,
    });

    box.append(this.#createAppHotkeyButton(appConfig));

    return box;
  }

  #createAppRow(appConfig: AppConfig) {
    const row = new Adw.ExpanderRow({
      icon_name: appConfig.icon,
      title: appConfig.name,
      subtitle: appConfig.description,
    });

    row.add_suffix(this.#createAppRowSuffix(appConfig));
    row.add_row(this.#createAppHiddenActions(appConfig));

    return row;
  }

  #createAppDeleteButton(appConfig: AppConfig) {
    const button = new Gtk.Button({
      css_classes: ['destructive-action'],
      label: gettext('Remove'),
    });

    button.connect('clicked', this.#onAppDeleteButtonClicked(appConfig));

    return button;
  }

  #createAppHiddenActions(appConfig: AppConfig) {
    const box = new Gtk.Box({
      margin_bottom: 8,
      margin_end: 8,
      margin_top: 8,
      orientation: Gtk.Orientation.HORIZONTAL,
      halign: Gtk.Align.END,
    });

    box.append(this.#createAppDeleteButton(appConfig));

    return box;
  }

  #createConfigureHotkeyButton() {
    const button = new Gtk.Button({
      css_classes: ['suggested-action'],
      halign: Gtk.Align.CENTER,
      label: gettext('Add application'),
    });

    button.connect('clicked', this.#onConfigureHotkeyButtonClicked());

    return button;
  }

  #createMainCtaGroup() {
    const group = new Adw.PreferencesGroup();

    group.add(this.#createConfigureHotkeyButton());

    return group;
  }

  #createSkipAnimationsSwitch() {
    const toggle = new Gtk.Switch({
      active: this.#extension.shouldSkipAnimations,
      valign: Gtk.Align.CENTER,
    });

    toggle.connect('notify::active', this.#onSkipAnimationsChange(toggle));

    return toggle;
  }

  #createSkipAnimationsRow() {
    const row = new Adw.ActionRow({
      title: gettext('Disable animations'),
      subtitle: gettext('Suppress show and hide animations for a snappier experience.'),
    });

    row.add_suffix(this.#createSkipAnimationsSwitch());

    return row;
  }

  #maybeCreateAppGroup() {
    const appConfigs = this.#extension.getAppConfigs();

    if (appConfigs.length === 0) {
      return undefined;
    }

    const group = new Adw.PreferencesGroup({ title: gettext('Configuration') });

    appConfigs.forEach((appConfig) => {
      group.add(this.#createAppRow(appConfig));
    });

    return group;
  }

  #createExperimentalGroup() {
    const group = new Adw.PreferencesGroup({ title: gettext('Experimental') });

    group.add(this.#createSkipAnimationsRow());

    return group;
  }

  #createAboutButton() {
    const button = new Gtk.Button({
      css_classes: ['dim-label', 'flat'],
      halign: Gtk.Align.CENTER,
      label: gettext('About'),
    });

    button.connect('clicked', this.#onAboutButtonClicked());

    return button;
  }

  #createAboutGroup() {
    const group = new Adw.PreferencesGroup();

    group.add(this.#createAboutButton());

    return group;
  }

  #createAboutDialog() {
    return new Adw.AboutDialog({
      application_name: __EXTENSION_NAME__,
      developer_name: __EXTENSION_AUTHOR__,
      developers: [__EXTENSION_AUTHOR__],
      issue_url: __EXTENSION_URL_ISSUES__,
      license_type: Gtk.License.GPL_3_0_ONLY,
      version: __EXTENSION_VERSION__,
      website: __EXTENSION_URL__,
    });
  }

  #createMainPreferencesPage() {
    const page = new Adw.PreferencesPage();

    page.add(this.#createMainCtaGroup());

    const appGroup = this.#maybeCreateAppGroup();

    if (appGroup) {
      page.add(appGroup);
    }

    page.add(this.#createExperimentalGroup());
    page.add(this.#createAboutGroup());

    return page;
  }

  public fillPreferencesWindow() {
    let page: Adw.PreferencesPage | undefined;

    const init = () => {
      if (page) {
        this.#window.remove(page);
      }

      page = this.#createMainPreferencesPage();

      this.#window.add(page);
    };

    init();

    this.#settings.connect(`changed::${__SETTINGS_KEY_APP_CONFIGS__}`, init);
  }
}

export default Preferences;
