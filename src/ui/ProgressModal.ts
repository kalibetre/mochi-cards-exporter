import { App, Modal } from "obsidian";

class ProgressModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText(
      "(You can close this window. The exporter continues in the background.)"
    );
    this.titleEl.setText("Exporting your cards …");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

export default ProgressModal;
