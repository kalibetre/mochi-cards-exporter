import { DECK_FROM_ACTIVE_FILE_NAME } from "./Constants";
import { AsyncZippable, strToU8, zip } from "fflate";
import {
  TFile,
  CachedMetadata,
  parseFrontMatterEntry,
  Notice,
  App,
} from "obsidian";
import Settings from "../types/Settings";
import Card from "../types/Card";
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
    this.app = app;
    this.activeFile = app.workspace.getActiveFile();
    this.metaData = app.metadataCache.getFileCache(this.activeFile);
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

    let mediaLinkRegExp = /\[\[(.+?)(?:\|(.+))?\]\]/gim;

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
          lines[i] = lines[i].replace(mediaLinkRegExp, (match) => {
            let fileName = this.cleanFileName(
              match.replace("[[", "").replace("]]", "")
            );
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

    return new Promise((resolve) => {
      resolve(cards);
    });
  }

  cleanFileName = (text: string): string => text.replace(/\s+/g, "_");

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

    return new Promise((resolve) => resolve(mochiCard));
  }

  async exportMochiCards() {
    const cards: Card[] = await this.readCards();
    const count = cards.length;
    if (count == 0) {
      new Notice("No Cards Found!");
    } else {
      try {
        if (this.settings.useDefaultSaveLocation) {
          let savePath = path.join(
            this.settings.defaultSaveLocation,
            `${this.getDeckName()}.mochi`
          );
          await this.zipFiles(savePath, cards);
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
            await this.zipFiles(savePath, cards);
          } else {
            new Notice("Export Canceled");
          }
        }
      } catch (error) {
        new Notice("Error Occurred Trying to Export Your Cards");
      }
    }
  }

  async zipFiles(savePath: string, cards: Card[]) {
    const count = cards.length;

    const successMessage = `${count} Card${
      count > 1 ? "s" : ""
    } Exported Successfully`;
    const errorMessage = "Error Occurred Exporting Your Cards!";

    const mochiCardsEdn = await this.getMochiCardsEdn(cards);
    const buffer = strToU8(mochiCardsEdn);
    const fileBuffers: Map<string, Uint8Array> = new Map();
    fileBuffers.set("data.edn", buffer);

    for (let i = 0; i < this.mediaFiles.length; i++) {
      let fileName = this.mediaFiles[i];
      let tFile = this.app.vault
        .getFiles()
        .filter((tFile) => this.cleanFileName(tFile.name) === fileName)
        .first();

      if (tFile) {
        let buffer = await this.app.vault.readBinary(tFile);
        fileBuffers.set(fileName, new Uint8Array(buffer));
      }
    }

    const files: AsyncZippable = {};
    fileBuffers.forEach((buffer, fileName) => (files[fileName] = buffer));
    await zip(files, (err, data) => {
      if (err) {
        console.log(err);
        throw err;
      } else this.saveFile(savePath, data, successMessage, errorMessage);
    });
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
