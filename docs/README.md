# Application Hotkeys

A GNOME Shell Extension that lets you launch, show, and hide applications
through a single hotkey.

- **Launch** an application if it's not running
- **Show** an application if it's running, but not focused
- **Hide** an application if it's already focused

![Application Hotkeys: Preferences page](./screenshot.webp)

> [!NOTE]
>
> - Apps are always moved to the active workspace
> - Apps are always moved to the monitor where your pointer is
> - If an app has multiple windows open, they are cycled
> - Optionally, showing and hiding apps happens instantly (experimental)

## Installation

There are multiple ways to install:

[<img src="https://github.com/aaimio/application-hotkeys/raw/main/docs/gnome-extension.png" align="right">](https://extensions.gnome.org/extension/8641/application-hotkeys/)

1. Using
   [Extension Manager](https://flathub.org/en/apps/com.mattjakeman.ExtensionManager)
   (search for "Application Hotkeys")
2. Through the
   [GNOME Extensions website](https://extensions.gnome.org/extension/8641/application-hotkeys/)
3. [Each GitHub release](https://github.com/aaimio/application-hotkeys/releases)
   provides the extension as a `.zip`, download it and:

```sh
unzip application-hotkeys@aaimio.github.com.zip -d ~/.local/share/gnome-shell/extensions/application-hotkeys@aaimio.github.com
```

## Contributing

### Development

The easiest way to get started is by using the devcontainer
([docs](https://code.visualstudio.com/docs/devcontainers/containers#_quick-start-open-a-git-repository-or-github-pr-in-an-isolated-container-volume)):

1. [Open the devcontainer](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/aaimio/application-hotkeys)
   ([source](../.devcontainer/devcontainer.json))
2. Skip to #3 below (, execute `make` on container, `dbus-run-session` on host)

For a local approach:

1. `git clone git@github.com:aaimio/application-hotkeys.git`
2. `pnpm install` ([install pnpm](https://pnpm.io/installation))
3. Once you made changes, install the extension locally:
   - `make install` (see [Makefile](../Makefile))
4. Start a nested GNOME Shell for testing:
   - `dbus-run-session -- gnome-shell --nested --wayland` (≤48)
   - `dbus-run-session -- gnome-shell --devkit` (≥49)
