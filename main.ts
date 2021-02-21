import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";

const dialog = require("electron").remote.dialog;
const homedir = require("os").homedir();

interface Settings {
  useDefaultSaveLocation: boolean;
  cardTag: string;
  deckNamingOption: string;
  defaultSaveLocation: string;
}

const DECK_FROM_ACTIVE_FILE_NAME = "Use Active File Name";
const DECK_FROM_FRONTMATTER = "Get From Front Matter";

const DEFAULT_SETTINGS: Settings = {
  useDefaultSaveLocation: false,
  cardTag: "card",
  deckNamingOption: DECK_FROM_ACTIVE_FILE_NAME,
  defaultSaveLocation: "",
};

export default class MyPlugin extends Plugin {
  settings: Settings;

  async onload() {
    console.log("loading obsidian to mochi converter plugin");

    await this.loadSettings();

    if (this.settings.defaultSaveLocation === "") {
      this.settings.defaultSaveLocation = homedir;
      await this.saveSettings();
    }

    this.addRibbonIcon("dice", "Sample Plugin", () => {
      new Notice("This is a notice!");
    });

    this.addStatusBarItem().setText("Status Bar Text");

    this.addCommand({
      id: "export-cards-to-mochi",
      name: "Export Cards to Mochi",,
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
          }
          return true;
        }
        return false;
      },
    });

    this.addSettingTab(new SettingTab(this.app, this));
  }

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: "Obsidian to Mochi" });

    const toggleSettingsEl = () => {
      this.plugin.settings.useDefaultSaveLocation
        ? defaultSaveLocSettingEl.show()
        : defaultSaveLocSettingEl.hide();
    };

    new Setting(containerEl)
      .setName("Deck Naming Option")
      .setDesc(
        "If you select to get from frontmatter, use the key 'deck' to specify the deck name"
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption(DECK_FROM_ACTIVE_FILE_NAME, DECK_FROM_ACTIVE_FILE_NAME)
          .addOption(DECK_FROM_FRONTMATTER, DECK_FROM_FRONTMATTER)
          .onChange((value) => {
            this.plugin.settings.deckNamingOption = value;
          })
          .setValue(this.plugin.settings.deckNamingOption);
      });

    new Setting(containerEl)
      .setName("Card Tag")
      .setDesc("Enter the tag that is used to identify cards")
      .addText((text) =>
        text.setValue(this.plugin.settings.cardTag).onChange(async (value) => {
          if (value.length === 0) {
            new Notice("Tag should not be empty");
          } else {
            this.plugin.settings.cardTag = value;
            await this.plugin.saveSettings();
          }
        })
      );

    new Setting(containerEl)
      .setName("Use Default Save Location")
      .setDesc(
        "If you turn this off, you will be prompted to choose save location for exports."
      )
      .addToggle((toggle) =>
        toggle
          .onChange(async (value) => {
            this.plugin.settings.useDefaultSaveLocation = value;
            await this.plugin.saveSettings();
            toggleSettingsEl();
          })
          .setValue(this.plugin.settings.useDefaultSaveLocation)
      );

    const defaultSaveLocation = new Setting(containerEl);
    const defaultSaveLocSettingEl = defaultSaveLocation.settingEl;
    const defaultSaveLocationTextEl = defaultSaveLocation.descEl;

    defaultSaveLocationTextEl.innerText = this.plugin.settings.defaultSaveLocation;

    defaultSaveLocation.setName("Default Save Location").addButton((button) => {
      button.setButtonText("Select Folder").onClick(async () => {
        const options = {
          title: "Select a Folder",
          properties: ["openDirectory"],
          defaultPath: this.plugin.settings.defaultSaveLocation,
        };
        const response = await dialog.showOpenDialog(null, options);
        if (!response.canceled) {
          this.plugin.settings.defaultSaveLocation = response.filePaths[0];
          await this.plugin.saveSettings();
          defaultSaveLocationTextEl.innerText = this.plugin.settings.defaultSaveLocation;
        }
      });
    }).settingEl;

    toggleSettingsEl();
  }
}
