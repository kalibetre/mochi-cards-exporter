import { App, Modal } from "obsidian";

class ProgressModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText(
      "(You can close this window. Exporter will continue in the background.)"
    );
    this.titleEl.setText("Exporting Your Cards, Please Wait ....");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}

export default ProgressModal;
