import { addIcon, Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS } from "src/util/Constants";
import { icons } from "src/ui/icons";
import MochiExporter from "src/util/MochiExporter";
import Settings from "src/types/Settings";
import SettingTab from "src/ui/SettingTab";
import { hideTagFromPreview } from "src/util/HideTagFromPreview";

const homedir = require("os").homedir();

export default class MyPlugin extends Plugin {
  settings: Settings;

  async onload() {
    console.log("loading obsidian to mochi converter plugin");

    await this.loadSettings();

    if (this.settings.defaultSaveLocation === "") {
      this.settings.defaultSaveLocation = homedir;
      await this.saveSettings();
    }

    hideTagFromPreview(this.settings.hideTagInPreview, this.settings.cardTag);

    this.addIcons();

    this.addRibbonIcon(icons.stackedCards.key, "Mochi Cards Exporter", () => {
      let activeFile = this.app.workspace.getActiveFile();
      this.exportMochiCards(activeFile);
    });

    this.addCommand({
      id: "export-cards-to-mochi",
      name: "Export Cards to Mochi",
      checkCallback: (checking: boolean) => {
        let activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            this.exportMochiCards(activeFile);
          }
          return true;
        }
        return false;
      },
    });

    this.addSettingTab(new SettingTab(this.app, this));
  }

  onunload() {
    console.log("unloading obsidian to mochi converter plugin");
  }

  addIcons() {
    addIcon(icons.stackedCards.key, icons.stackedCards.svgContent);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  exportMochiCards = async (activeFile: TFile) => {
    if (activeFile.extension === "md") {
      const mochiExporter = new MochiExporter(
        this.app,
        activeFile,
        this.settings
      );
      await mochiExporter.exportMochiCards();
    } else {
      new Notice("Open a Markdown File to Generate Mochi Cards");
    }
  };
}
