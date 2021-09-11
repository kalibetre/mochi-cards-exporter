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
import { nanoid } from "nanoid";
import ProgressModal from "src/ui/ProgressModal";

const path = require("path");
const dialog = require("electron").remote.dialog;
const fs = require("fs");

type FileNameUidPair = { fileName: string; uid: string };

class MochiExporter {
  app: App;
  settings: Settings;
  activeFile: TFile;
  metaData: CachedMetadata;
  mediaFiles: FileNameUidPair[] = [];
  progressModal: ProgressModal;

  mediaLinkRegExp = /\[\[(.+?)(?:\|(.+))?\]\]/gim;

  constructor(app: App, activeFile: TFile, settings: Settings) {
    this.app = app;
    this.activeFile = activeFile;
    this.metaData = app.metadataCache.getFileCache(this.activeFile);
    this.settings = settings;
    this.progressModal = new ProgressModal(this.app);
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
          lines[i] = lines[i].replace(this.mediaLinkRegExp, (match) => {
            let fileName = this.removeSpaces(
              match.replace("[[", "").replace("]]", "")
            );
            let fileUid =
              this.getUid() +
              "." +
              fileName.substring(fileName.lastIndexOf(".") + 1);
            let path = `[${this.removeNonAlphaNum(
              fileName
            )}](@media/${fileUid})`;
            this.mediaFiles.push({
              fileName: fileName,
              uid: fileUid,
            });
            return path;
          });

          cardContent += (cardContent.length === 0 ? "" : "\n") + lines[i];
          i++;
        }

        card.content = cardContent;
        cards.push(card);
      }
    }

    return cards;
  }

  getUid = (): string => {
    let uid = nanoid(6);
    while (this.mediaFiles.filter((value) => value.uid === uid).length > 0)
      uid = nanoid(6);
    return uid;
  };

  removeSpaces = (text: string): string => text.replace(/\s+/g, "_");

  removeNonAlphaNum = (text: string): string =>
    text.replace(/[^a-zA-Z0-9+]+/gi, "_");

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

    return mochiCard;
  }

  async exportMochiCards() {
    this.progressModal.open();
    const cards: Card[] = await this.readCards();
    const count = cards.length;
    if (count == 0) {
      new Notice("No cards found.");
      this.progressModal.close();
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
            title: "Select a folder",
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
            new Notice("Export canceled.");
            this.progressModal.close();
          }
        }
      } catch (error) {
        new Notice("An error occurred while trying to export your cards.");
        this.progressModal.close();
      }
    }
  }

  async zipFiles(savePath: string, cards: Card[]) {
    const count = cards.length;

    const successMessage = `${count} Card${
      count > 1 ? "s" : ""
    } Exported Successfully`;
    const errorMessage = "An error occurred while exporting your cards.";

    const mochiCardsEdn = await this.getMochiCardsEdn(cards);
    const buffer = strToU8(mochiCardsEdn);
    const fileBuffers: Map<string, Uint8Array> = new Map();
    fileBuffers.set("data.edn", buffer);

    for (let i = 0; i < this.mediaFiles.length; i++) {
      let fileName = this.mediaFiles[i];
      let tFile = this.app.vault
        .getFiles()
        .filter((tFile) => this.removeSpaces(tFile.name) === fileName.fileName)
        .first();

      if (tFile) {
        let buffer = await this.app.vault.readBinary(tFile);
        fileBuffers.set(fileName.uid, new Uint8Array(buffer));
      }
    }

    const files: AsyncZippable = {};
    fileBuffers.forEach((buffer, fileName) => (files[fileName] = buffer));
    await zip(files, async (err, data) => {
      if (err) {
        console.log(err);
        throw err;
      } else await this.saveFile(savePath, data, successMessage, errorMessage);
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
        this.progressModal.close();
      } else {
        new Notice(successMessage);
        this.progressModal.close();
      }
    });
  }
}

export default MochiExporter;
