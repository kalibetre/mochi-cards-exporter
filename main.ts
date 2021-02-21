import { Plugin } from "obsidian";
import MochiExporter from "lib/MochiExporter";
import { DEFAULT_SETTINGS } from "lib/Constants";
import { Settings } from "lib/types";
import SettingTab from "lib/SettingTab";

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

    this.addRibbonIcon("dice", "Sample Plugin", () => {
      this.exportMochiCards();
    });

    this.addCommand({
      id: "export-cards-to-mochi",
      name: "Export Cards to Mochi",
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            this.exportMochiCards();
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

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  exportMochiCards = async () => {
    this.addStatusBarItem().setText("Exporting to Mochi ....");
    let activeFile = this.app.workspace.getActiveFile();
    let fileContent = await this.app.vault.read(activeFile);
    let metaData = this.app.metadataCache.getFileCache(activeFile);

    const mochiExporter = new MochiExporter(
      activeFile,
      fileContent,
      metaData,
      this.settings
    );

    await mochiExporter.exportMochiCards();
    this.addStatusBarItem().setText("");
  };
}
