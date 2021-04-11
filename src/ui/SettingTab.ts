import MyPlugin from "main";
import { settings } from "node:cluster";
import { PluginSettingTab, App, Setting, Notice } from "obsidian";
import {
  DECK_FROM_ACTIVE_FILE_NAME,
  DECK_FROM_FRONTMATTER,
} from "src/util/Constants";
import { hideTagFromPreview } from "src/util/HideTagFromPreview";
const dialog = require("electron").remote.dialog;

class SettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: "Mochi Cards Exporter" });

    const toggleSettingsEl = () => {
      this.plugin.settings.useDefaultSaveLocation
        ? defaultSaveLocSettingEl.show()
        : defaultSaveLocSettingEl.hide();
    };

    new Setting(containerEl)
      .setName("Deck Naming Option")
      .setDesc(
        "If you select to get from Frontmatter, use the key 'deck' to specify the deck name. (If no Frontmatter is found, the active file name will be used)"
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
      .setDesc("Tag to identify Mochi cards (case-insensitive)")
      .addText((text) =>
        text.setValue(this.plugin.settings.cardTag).onChange(async (value) => {
          if (value.length === 0) {
            new Notice("Tag should not be empty");
          } else {
            this.plugin.settings.cardTag = value;
            await this.plugin.saveSettings();
            //hideTagFromPreview(this.plugin.settings.hideTagInPreview, value);
          }
        })
      );
    
    new Setting(containerEl)
      .setName("Hide Tag")
      .setDesc("Enable to hide the above specified tag in Preview Mode")
      .addToggle((toggle) => toggle
      .onChange(async (value) => {
        this.plugin.settings.hideTagInPreview = value;
        await this.plugin.saveSettings();
        hideTagFromPreview(value, this.plugin.settings.cardTag);
      })
      .setValue(this.plugin.settings.hideTagInPreview));

    new Setting(containerEl)
      .setName("Use Default Save Location")
      .setDesc(
        "If you turn this off, you will be prompted to choose a folder for exports."
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

export default SettingTab;
