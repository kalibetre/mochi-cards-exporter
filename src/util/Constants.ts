import Settings from "../types/Settings";

export const DECK_FROM_ACTIVE_FILE_NAME = "Use Active File Name";
export const DECK_FROM_FRONTMATTER = "Get From Front Matter";

export const DEFAULT_SETTINGS: Settings = {
  useDefaultSaveLocation: false,
  cardTag: "card",
  deckNamingOption: DECK_FROM_ACTIVE_FILE_NAME,
  defaultSaveLocation: "",
  hideTagInPreview: false,
};
