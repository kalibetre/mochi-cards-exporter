import { DECK_FROM_ACTIVE_FILE_NAME } from "./Constants";
import { strToU8, zipSync } from "fflate";
import {
  TFile,
  CachedMetadata,
  parseFrontMatterEntry,
  Notice,
  App,
} from "obsidian";
import { Card, Settings } from "./types";
const path = require("path");
const dialog = require("electron").remote.dialog;
const fs = require("fs");

class MochiExporter {
  app: App;
  settings: Settings;
  activeFile: TFile;
  metaData: CachedMetadata;
  mediaFiles: string[] = [];

  constructor(app: App, settings: Settings) {
    this.activeFile = this.app.workspace.getActiveFile();
    this.metaData = this.app.metadataCache.getFileCache(this.activeFile);
    this.settings = settings;
  }

  async getLines(): Promise<string[]> {
    let fileContent = await this.app.vault.read(this.activeFile);
    return fileContent.split("\n");
  }

  getDeckName(): string {
    if (this.settings.deckNamingOption == DECK_FROM_ACTIVE_FILE_NAME) {
      return this.activeFile.basename;
    } else {
      let deckName = parseFrontMatterEntry(this.metaData.frontmatter, "deck");
      if (!deckName) deckName = this.activeFile.basename;
      return deckName;
    }
  }

  async readCards(): Promise<Card[]> {
    let lines = await this.getLines();
    let cardTag = "#" + this.settings.cardTag.toLowerCase();

    let linkRegex = /\[\[(.+?)(?:\|(.+))?\]\]/gim;

    let cards: Card[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].contains(cardTag)) {
        let card: Card = {
          term: lines[i].replace(cardTag, "").trim(),
          content: "",
        };
        i++;
        let cardContent = "";
        while (
          i < lines.length &&
          lines[i].trim() !== "---" &&
          lines[i].trim() !== "***"
        ) {
          lines[i] = lines[i].replace(linkRegex, (match) => {
            let fileName = match
              .replace("[[", "")
              .replace("]]", "")
              .replace(" ", "_");
            let path = `[${fileName}](@media/${fileName})`;
            this.mediaFiles.push(fileName);
            return path;
          });

          cardContent += (cardContent.length === 0 ? "" : "\n") + lines[i];
          i++;
        }

        card.content = cardContent;
        cards.push(card);
      }
    }

    return new Promise((resolve, reject) => {
      resolve(cards);
    });
  }

  async getMochiCardsEdn(cards: Card[]): Promise<string> {
    let deckName = this.getDeckName();
    let mochiCard = "{:decks [{";
    mochiCard += ":name " + JSON.stringify(deckName) + ",";
    mochiCard += ":cards (";

    for (let i = 0; i < cards.length; i++) {
      mochiCard +=
        "{:name " +
        JSON.stringify(cards[i].term) +
        "," +
        ":content " +
        JSON.stringify(cards[i].term + "\n---\n" + cards[i].content) +
        "}";
    }

    mochiCard += ")";
    mochiCard += "}]";
    mochiCard += ", :version 2}";

    return new Promise((resolve, reject) => resolve(mochiCard));
  }

  async exportMochiCards() {
    const cards: Card[] = await this.readCards();
    const count = cards.length;
    if (count == 0) {
      new Notice("No Cards Found!");
    } else {
      const mochiCardsEdn = await this.getMochiCardsEdn(cards);
      const buffer = strToU8(mochiCardsEdn);
      const zipped = zipSync({
        "data.edn": buffer,
      });

      const successMessage = `${count} Card${
        count > 1 ? "s" : ""
      } Exported Successfully`;
      const errorMessage = "Error Occurred Exporting Your Cards!";

      try {
        if (this.settings.useDefaultSaveLocation) {
          let savePath = path.join(
            this.settings.defaultSaveLocation,
            `${this.getDeckName()}.mochi`
          );
          this.saveFile(savePath, zipped, successMessage, errorMessage);
        } else {
          const options = {
            title: "Select a Folder",
            properties: ["openDirectory"],
            defaultPath: this.settings.defaultSaveLocation,
          };

          const saveResponse = await dialog.showOpenDialog(null, options);

          if (!saveResponse.canceled) {
            let savePath = path.join(
              saveResponse.filePaths[0],
              `${this.getDeckName()}.mochi`
            );
            this.saveFile(savePath, zipped, successMessage, errorMessage);
          } else {
            new Notice("Export Canceled");
          }
        }
      } catch (error) {
        new Notice("Error Occurred Trying to Export Your Cards");
      }
    }
  }

  saveFile(
    path: string,
    file: Uint8Array,
    successMessage: string,
    errorMessage: string
  ) {
    fs.writeFile(path, file, (error: any) => {
      if (error) {
        console.log(error);
        new Notice(errorMessage);
      } else {
        new Notice(successMessage);
      }
    });
  }
}

export default MochiExporter;
