import { AbstractInputSuggest, Modal, Setting, TFile, SearchComponent, ButtonComponent} from 'obsidian';
import type ConnectionsPlugin from 'src/main';

export interface ConnectionResult {
  connectionType: string;
  toFile: TFile;
  fromFile: TFile;
}

export class ConnectionModal extends Modal {
  private cp: ConnectionsPlugin;
  public fromFile: TFile;
  public toFile: TFile;
  public connectionType: string;
  public previousConnectionTypes: Array<string>;
  private settings: Array<FocusableSetting>;
  

  constructor(cp: ConnectionsPlugin, currentFile: TFile, previousConnectionTypes: Array<string>, onSubmit: (result: ConnectionResult) => void) {
    super(cp.app);
    this.cp = cp;
    this.fromFile = currentFile;
    this.previousConnectionTypes = previousConnectionTypes;
    this.settings = [];
    this.contentEl.addEventListener('identifySettingEvent', (evt: CustomEvent) => this.focusOnNextSetting(evt));
    this.contentEl.addEventListener('removeConnectionType', (evt: CustomEvent) => this.removeConnectionType(evt));
    this.setTitle('Add a Connection');

    this.settings.push(new FocusableSetting(this.contentEl, 'connection-type')  
    .setName('Connection Type')  
    .addSearch((text) => {
      new ConnectionTypeSuggestInput(cp, text.inputEl, this);
    }));

    this.settings.push(new FocusableSetting(this.contentEl, 'to-note')  
    .setName('Search for Note')  
    .addSearch((text) => {
      new NoteSuggestInput(cp, text.inputEl, this);
    }));

    this.settings.push(new FocusableSetting(this.contentEl, 'submit-button')
      .setName('Add Connection')
      .addButton((btn) =>
        btn
          .setButtonText('Add Connection')
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit({
              'connectionType': this.connectionType,
              'toFile': this.toFile,
              'fromFile': this.fromFile
            });
          }
    )));
  }

  focusOnNextSetting(evt: CustomEvent) {
    for (let idx = 0; idx < this.settings.length; idx++) {
      if (this.settings[idx] === evt.detail.identity) {
        this.settings[idx+1].focusYourself();
      }
    }
  }
  
  removeConnectionType(evt: CustomEvent) {
    this.cp.removeConnectionType(evt.detail.connectionType);
  }
}

export class NoteSuggestInput extends AbstractInputSuggest<TFile> {
  private availableFiles: Array<TFile>;
  private inputEl: HTMLInputElement;
  private cm: ConnectionModal;
  private folderNoteRegexp = new RegExp('(?<foldername>[^\\\\]+?)\\/\\k<foldername>\\.(?i:md)');

  constructor(cp: ConnectionsPlugin, inputEl: HTMLInputElement, cm: ConnectionModal) {
    super(cp.app, inputEl);
    this.inputEl = inputEl;
    this.cm = cm;
    this.availableFiles = this.app.vault.getMarkdownFiles().filter((note)=> {return note.parent != null && note != cm.fromFile});
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
    this.inputEl.dispatchEvent(new CustomEvent('suggestionSelectedEvent', {bubbles: true}));
    this.close();
  }
}

export class ConnectionTypeSuggestInput extends AbstractInputSuggest<string> {
  private inputEl: HTMLInputElement;
  private cm: ConnectionModal;

  constructor(cp: ConnectionsPlugin, inputEl: HTMLInputElement, cm: ConnectionModal) {
    super(cp.app, inputEl);
    this.inputEl = inputEl;
    this.cm = cm;
  }

  getSuggestions(query: string): string[] {
    return this.cm.previousConnectionTypes.filter((connectionType) => connectionType.includes(query));
  }

  renderSuggestion(connectionType: string, el: HTMLElement) {
    let btn = el.createEl('button', 'connection-button')
    btn.dataset['connectionType'] = connectionType;
    btn.addEventListener('click', (ev: PointerEvent) => {
			let clickedBtn = ev.currentTarget;
			if (clickedBtn && clickedBtn instanceof HTMLButtonElement) {
				let event = new CustomEvent("removeConnectionType", {bubbles: true, detail: { connectionType: clickedBtn.dataset['connectionType'] }});
        this.inputEl.dispatchEvent(event);
			}
		
		});
    el.createEl('span', { text: connectionType });
    
  }

  selectSuggestion(selectedConnection: string): void {
    this.inputEl.value = selectedConnection;
    this.cm.connectionType = selectedConnection
    this.inputEl.dispatchEvent(new CustomEvent('suggestionSelectedEvent', {bubbles: true}));
    this.close();
  }

  getValue(): string {
    this.cm.connectionType = super.getValue();
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
    let event = new CustomEvent("identifySettingEvent", {bubbles: true, detail: { identity: this }});
    this.controlEl.dispatchEvent(event);
  }

  focusYourself(): void {
    let targetControl = this.components[0];
    if (targetControl instanceof SearchComponent) {
      targetControl.inputEl.focus();
    } else if (targetControl instanceof ButtonComponent) {
      targetControl.buttonEl.focus();
    }
  }
}