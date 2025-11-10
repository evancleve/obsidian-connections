import { AbstractInputSuggest, ButtonComponent, Modal, Notice, SearchComponent, Setting, TFile } from 'obsidian';
import type ConnectionsPlugin from './main';
import { Connection, ConnectionType, MappedConnectionSubject, isConnectionType } from './connection_types'

export class ConnectionsModal extends Modal {
  private cp: ConnectionsPlugin;
  public fromFile: TFile | string;
  public toFile: TFile | string | undefined;
  public connectionType: ConnectionType;
  public enteredText: string;
  public enteredFilePath: string;
  public connectionTypes: Array<ConnectionType>
  private settings: Array<FocusableSetting>;


  constructor(cp: ConnectionsPlugin, currentFile: TFile, connectionTypes: Array<ConnectionType>, onSubmit: (result: Connection) => Promise<boolean>) {
    super(cp.app);
    this.cp = cp;
    this.fromFile = currentFile;
    this.connectionTypes = connectionTypes;
    this.settings = [];
    this.contentEl.addEventListener('identifySettingEvent', (evt: CustomEvent) => this.focusOnNextSetting(evt));
    this.setTitle('Add a connection');

    this.settings.push(new FocusableSetting(this.contentEl, 'connection-text')
      .setName('Connection text')
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
            //If a connection type isn't already selected, add the contents of the input box as a new unmapped connection type.
            if (!isConnectionType(this.connectionType)) {
              if (this.enteredText) {
                this.connectionType = { connectionText: this.enteredText } as ConnectionType;
                if (!await this.cp.cm.addUnmappedConnectionType(this.connectionType)) {
                  return void new Notice('Unable to add new unmapped connection type!');
                };
              } else {
                return void new Notice('Connection text can\'t be blank!');
              }
            }

            if (!(this.toFile instanceof TFile)) {
              if (this.enteredFilePath) {
                this.toFile = this.enteredFilePath;
              } else {
                return void new Notice('File path can\'t be blank!');
              }
            }

            let bond;
            // Target-mapped connections need the source and target flipped!
            if ('mapConnectionSubject' in this.connectionType && this.connectionType.mapConnectionSubject == MappedConnectionSubject.Target) {
              bond = { source: this.toFile, target: this.fromFile };
            } else {
              bond = { source: this.fromFile, target: this.toFile };
            }
            const connection = Object.assign(bond, { ...this.connectionType });
            await onSubmit(connection);
            this.close();
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

  getValue(): string {
    this.cm.toFile = undefined;
    this.cm.enteredFilePath = super.getValue();
    return super.getValue();
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
    return this.cm.connectionTypes.filter((ct) => { return ct.connectionText.includes(query) }).map((ct) => ct);
  }

  renderSuggestion(ct: ConnectionType, el: HTMLElement) {
    el.createEl('span', { text: ct.connectionText });

  }

  selectSuggestion(selectedConnectionType: ConnectionType): void {
    this.inputEl.value = selectedConnectionType.connectionText;
    this.cm.connectionType = selectedConnectionType
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