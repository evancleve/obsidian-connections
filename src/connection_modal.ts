import { AbstractInputSuggest, ButtonComponent, Modal, SearchComponent, Setting, TFile } from 'obsidian';
import type ConnectionsPlugin from './main';
import { Connection, ConnectionType, MappedConnectionDirection } from './connection_types'

export class ConnectionsModal extends Modal {
  private cp: ConnectionsPlugin;
  public fromFile: TFile;
  public toFile: TFile;
  public connectionType: ConnectionType;
  public enteredText: string;
  public connectionTypes: Array<ConnectionType>
  private settings: Array<FocusableSetting>;


  constructor(cp: ConnectionsPlugin, currentFile: TFile, connectionTypes: Array<ConnectionType>, onSubmit: (result: Connection) => void) {
    super(cp.app);
    this.cp = cp;
    this.fromFile = currentFile;
    this.connectionTypes = connectionTypes;
    this.settings = [];
    this.contentEl.addEventListener('identifySettingEvent', (evt: CustomEvent) => this.focusOnNextSetting(evt));
    this.contentEl.addEventListener('removeConnectionType', (evt: CustomEvent) => this.removeConnectionType(evt));
    this.setTitle('Add a connection');

    this.settings.push(new FocusableSetting(this.contentEl, 'connection-type')
      .setName('Connection type')
      .addSearch((text) => {
        new ConnectionTypeSuggestInput(cp, this, text.inputEl);
      }));

    this.settings.push(new FocusableSetting(this.contentEl, 'to-note')
      .setName('Search for note')
      .addSearch((text) => {
        new NoteSuggestInput(cp, this, text.inputEl);
      }));

    this.settings.push(new FocusableSetting(this.contentEl, 'submit-button')
      .addButton((btn) =>
        btn
          .setButtonText('Add connection')
          .setCta()
          .onClick(async () => {
            this.close();
            //If a connection type isn't already selected, add the contents of the input box as a new unmapped connection type.
            if (!this.connectionType) {
              this.connectionType = { connectionType: this.enteredText } as ConnectionType;
              if (!await this.cp.cm.addUnmappedConnectionType(this.connectionType)) {
                //TODO: error handling
                console.log('Something went horribly wrong!');
              };
            }
            let bond;
            // Right-mapped connections need the source and target flipped!
            if ('mapConnectionDirection' in this.connectionType && this.connectionType.mapConnectionDirection == MappedConnectionDirection.Right) {
              bond = { source: this.toFile, target: this.fromFile };
            } else {
              bond = { source: this.fromFile, target: this.toFile };
            }
            const connection = Object.assign(bond, { ...this.connectionType })
            onSubmit(connection);
          }
          )));

  }

  /**
   * Given the input element which just lost focus, focus on the next one.
   * @param {CustomEvent} evt - An event containing a reference to the blurred setting.
   */
  focusOnNextSetting(evt: CustomEvent) {
    for (let idx = 0; idx < this.settings.length; idx++) {
      if (this.settings[idx] === evt.detail.identity) {
        this.settings[idx + 1].focusYourself();
      }
    }
  }

  /**
   * In response to an event, call the ConnectionPlugin's removeConnectionType method.
   * @param {CustomEvent} evt - An event containing the connectionType to remove.
   */
  removeConnectionType(evt: CustomEvent) {
    this.cp.cm.deleteConnectionType(evt.detail.connectionType);
  }
}

export class NoteSuggestInput extends AbstractInputSuggest<TFile> {
  private availableFiles: Array<TFile>;
  private cm: ConnectionsModal;
  private inputEl: HTMLInputElement;
  private folderNoteRegexp = new RegExp('(?<foldername>[^\\\\]+?)\\/\\k<foldername>\\.(?i:md)');

  constructor(cp: ConnectionsPlugin, cm: ConnectionsModal, inputEl: HTMLInputElement) {
    super(cp.app, inputEl);
    this.cm = cm;
    this.inputEl = inputEl;
    this.availableFiles = this.app.vault.getMarkdownFiles().filter((note) => { return note.parent != null && note != cm.fromFile });
  }

  getSuggestions(query: string): TFile[] {
    return this.availableFiles.filter((note) => note.name.toLowerCase().includes(query.toLowerCase()));
  }

  renderSuggestion(note: TFile, el: HTMLElement) {
    el.createEl('div', { text: note.name });
    if (this.folderNoteRegexp.test(note.path)) {
      el.createEl('small', { text: '<folder>' });
    } else {
      el.createEl('small', { text: note.path });
    }
  }

  selectSuggestion(selectedFile: TFile): void {
    this.inputEl.value = selectedFile.name;
    this.cm.toFile = selectedFile;
    this.inputEl.dispatchEvent(new CustomEvent('suggestionSelectedEvent', { bubbles: true }));
    this.close();
  }
}

export class ConnectionTypeSuggestInput extends AbstractInputSuggest<ConnectionType> {
  private cm: ConnectionsModal;
  private inputEl: HTMLInputElement;

  constructor(cp: ConnectionsPlugin, cm: ConnectionsModal, inputEl: HTMLInputElement) {
    super(cp.app, inputEl);
    this.cm = cm;
    this.inputEl = inputEl;
  }

  getSuggestions(query: string): ConnectionType[] {
    return this.cm.connectionTypes.filter((ct) => { return ct.connectionType.includes(query) }).map((ct) => ct);
  }

  renderSuggestion(ct: ConnectionType, el: HTMLElement) {
    const btn = el.createEl('button', 'connection-button')
    btn.addEventListener('click', (ev: PointerEvent) => {
      ev.stopPropagation();
      const clickedBtn = ev.currentTarget as HTMLButtonElement;
      const event = new CustomEvent("removeConnectionType", { bubbles: true, detail: { connectionType: clickedBtn.dataset['connectionType'] } });
      this.inputEl.dispatchEvent(event);
      clickedBtn.parentElement?.remove();
    });
    el.createEl('span', { text: ct.connectionType });

  }

  selectSuggestion(selectedConnection: ConnectionType): void {
    this.inputEl.value = selectedConnection.connectionType;
    this.cm.connectionType = selectedConnection
    this.inputEl.dispatchEvent(new CustomEvent('suggestionSelectedEvent', { bubbles: true }));
    this.close();
  }

  getValue(): string {
    this.cm.enteredText = super.getValue();
    return super.getValue();
  }
}

class FocusableSetting extends Setting {
  public settingId: string;
  constructor(container: HTMLElement, settingId: string) {
    super(container);
    this.settingId = settingId;
    this.controlEl.addEventListener('suggestionSelectedEvent', (evt: Event) => { this.identifyYourself(evt) });
  }

  identifyYourself(evt: Event): void {
    const event = new CustomEvent("identifySettingEvent", { bubbles: true, detail: { identity: this } });
    this.controlEl.dispatchEvent(event);
  }

  focusYourself(): void {
    const targetControl = this.components[0];
    if (targetControl instanceof SearchComponent) {
      targetControl.inputEl.focus();
    } else if (targetControl instanceof ButtonComponent) {
      targetControl.buttonEl.focus();
    }
  }
}