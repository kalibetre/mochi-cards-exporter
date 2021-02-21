import { DECK_FROM_ACTIVE_FILE_NAME } from "./Constants";
import { zipSync } from "fflate";
import { TFile, CachedMetadata, parseFrontMatterEntry, Notice } from "obsidian";
import { Card, Settings } from "./types";
const path = require("path");
const util = require("util");
const dialog = require("electron").remote.dialog;
const fs = require("fs");

class MochiExporter {
  activeFile: TFile;
  fileContent: string;
  metaData: CachedMetadata;
  settings: Settings;

  constructor(
    activeFile: TFile,
    fileContent: string,
    metaData: CachedMetadata,
    settings: Settings
  ) {
    this.activeFile = activeFile;
    this.fileContent = fileContent;
    this.metaData = metaData;
    this.settings = settings;
  }

  async getLines(): Promise<string[]> {
    return this.fileContent.split("\n");
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
    let cardTag = this.settings.cardTag.toLowerCase();

    let cards: Card[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].contains(cardTag)) {
        let card: Card = {
          term: lines[i].replace(cardTag, "").trim(),
          content: "",
        };
        i++;
        while (lines[i].length > 0) {
          if (lines[i].trim() !== "---" && lines[i].trim() !== "***") {
            card.content =
              card.content + (card.content.length === 0 ? "" : "\n") + lines[i];
            i++;
          }
        }
        cards.push(card);
      }
    }

    return new Promise((resolve, reject) => {
      resolve(cards);
    });
  }

  async getMochiCardsEdn(): Promise<string> {
    let cards: Card[] = await this.readCards();
    let deckName = this.getDeckName();

    let mochiCard = "{:decks [{";
    mochiCard += ':name "' + deckName + '",';
    mochiCard += ":cards (";

    for (let i = 0; i < cards.length; i++) {
      mochiCard +=
        '{:name "' +
        cards[i].term +
        '",' +
        ':content "' +
        cards[i].term +
        "\n---\n" +
        cards[i].content +
        '"}';
    }

    mochiCard += ")";
    mochiCard += "}]";
    mochiCard += ", :version 2}";

    return new Promise((resolve, reject) => resolve(mochiCard));
  }

  async exportMochiCards() {
    const mochiCardsEdn = await this.getMochiCardsEdn();
    const stringEnc = new util.TextEncoder();
    const buffer = stringEnc.encode(mochiCardsEdn);
    const zipped = zipSync({
      "data.edn": buffer,
    });

    try {
      if (this.settings.useDefaultSaveLocation) {
        let savePath = path.join(
          this.settings.defaultSaveLocation,
          `${this.getDeckName()}.mochi`
        );
        this.saveFile(savePath, zipped);
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
          this.saveFile(savePath, zipped);
        } else {
          new Notice("Export Canceled");
        }
      }
    } catch (error) {
      new Notice("Error Occurred Trying to Export Your Cards");
    }
  }

  saveFile(path: string, file: Uint8Array) {
    fs.writeFile(path, file, (error: any) => {
      if (error) {
        console.log(error);
        new Notice("Error Occurred Exporting Your Cards!");
      } else {
        new Notice("Your Cards Have been Exported Successfully!");
      }
    });
  }
}

export default MochiExporter;
