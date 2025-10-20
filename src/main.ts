import { Plugin, TFile} from 'obsidian';
import { ConnectionModal, ConnectionResult } from './connection_modal';
import { createLink } from "../utils/links";
 

export default class ConnectionsPlugin extends Plugin {
	
	footerTextElement : HTMLElement;
	previousConnectionTypes : Array<string>;

	async onload(): Promise<void> {
		
		 this.previousConnectionTypes = await this.loadData();

		this.addCommand({
			id: 'add-connection',
			name: 'Add connection to another note',
			callback: () => {
				const currentFile = this.app.workspace.getActiveFile();
				if (currentFile) {
					new ConnectionModal(this, currentFile, this.previousConnectionTypes, (result: ConnectionResult) => this.addConnection(result)).open()
				}
			},
		});

		this.app.workspace.on('file-open', async file => {
			if (file) {
				this.refreshConnections(file);
			}
		});

		this.app.metadataCache.on('changed', (file, data, cache) => {
			this.refreshConnections(file);
		});
	}

	async onunload(): Promise<void> {
		if (this.footerTextElement) {
			this.footerTextElement.remove();
		}
	}

	async refreshConnections(file: TFile) {
		let leaf = this.app.workspace.getMostRecentLeaf();
		if (leaf) {
			if (!this.footerTextElement) {
				this.footerTextElement = leaf.view.containerEl.createEl('div');
				this.footerTextElement.addClass('connections');
			}
			this.footerTextElement.textContent = '';
			if (file) {
				this.footerTextElement.appendChild(await this.getForwardConnections(file));
				this.footerTextElement.appendChild(await this.getBackwardConnections(file));
			}
		}
	}

	async getForwardConnections(file: TFile) {
		const metadata = await this.getMetadata(file);
		let linkRegExp = RegExp('\\[?\\[?([^\\[\\]]+)\\]?\\]?');
		let forwardConnections = document.createElement('div');
		forwardConnections.addClass('connections-group');
		if (metadata) {
			let connections = metadata['connections']
			if (connections) {
				for (let connection of connections) {
					let connectionType = connection['connectionType'];
					let strippedLink = this.stripLink(connection['link']);
					let linkedFile = this.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
					if (linkedFile) {
						let connectionLine = this.createConnectionLine(file, connectionType, linkedFile);
						if (connectionLine) {
							forwardConnections.appendChild(connectionLine);
						}
					}
				}
			}
		}
		return forwardConnections;
	}

	async getBackwardConnections(file: TFile) {
		let bFoundConnectionsFiles = new Set<string>();
		let backwardConnections = document.createElement('div');
		backwardConnections.addClass('connections-group');
		//@ts-ignore - undocumented feature, but a feature nonetheless!
		let bLinksFiles = this.app.metadataCache.getBacklinksForFile(file);
		for (let bLinkFile of bLinksFiles.keys()) {
			for (let bLink of bLinksFiles.get(bLinkFile)) {
				if (bLink['key'] && bLink['key'].includes('connections')) {
					bFoundConnectionsFiles.add(bLinkFile);
				}
			}
		}
		for (let bLinkFileName of bFoundConnectionsFiles) {
			let bLinkFile = this.app.metadataCache.getFirstLinkpathDest(bLinkFileName, '');
			if (bLinkFile) {
				const metadata = await this.getMetadata(bLinkFile);
				if (metadata) {
					let connections;
					if ((connections = metadata['connections']) != null) {
						for (let connection of connections) {
							let connectionType = connection['connectionType'];
							let strippedLink = this.stripLink(connection['link']);
							let linkedFile = this.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
							if (linkedFile && linkedFile.path === file.path) {
								let connectionLine = this.createConnectionLine(bLinkFile, connectionType, file, false);
								if (connectionLine) {
									backwardConnections.appendChild(connectionLine);
								}
							}
						
						}
					}
				}
			}
		}
		return backwardConnections;
	}
	
	createConnectionLine(fromFile: TFile, connectionType: string, toFile: TFile, forward: boolean = true) {
		let connectionLine = document.createElement('div');
		connectionLine.addClass('connection-line');
		let fromFileText, toFileText;
		let fromSpan = document.createElement('span');
		fromSpan.addClass('connection-name');
		connectionLine.append(fromSpan);
		if (forward) {
			fromFileText = fromFile.basename;
			fromSpan.append(fromFileText);
			fromSpan.addClass('same-document');
		} else {
			fromFileText = createLink(this.app, fromFile);
			fromSpan.append(fromFileText);
		}
		
		let connectionTypeSpan = document.createElement('span');
		connectionTypeSpan.addClass('connection-type');
		connectionTypeSpan.textContent = ' ' + connectionType + ' '
		connectionLine.append(connectionTypeSpan);
		
		let toSpan = document.createElement('span');
		toSpan.addClass('connection-name');
		connectionLine.append(toSpan);
		if (forward) {
			toFileText = createLink(this.app, toFile);
			toSpan.append(toFileText);
		} else {
			toFileText = toFile.basename;
			toSpan.append(toFileText);
			toSpan.addClass('same-document');
		}
		let btn = connectionLine.createEl('button', 'connection-button');
		btn.dataset['fromFile'] = fromFile.path;
		btn.dataset['connectionType'] = connectionType;
		btn.dataset['toFile'] = toFile.path;
		btn.dataset['forward'] = String(forward);
		btn.addEventListener('click', (ev: PointerEvent) => {
			let clickedBtn = ev.currentTarget;
			if (clickedBtn && clickedBtn instanceof HTMLButtonElement) {
				this.removeConnection(clickedBtn.dataset['fromFile'], clickedBtn.dataset['connectionType'], clickedBtn.dataset['toFile'], clickedBtn.dataset['forward']);
			}
		
		});
		connectionLine.createEl('br');
		return connectionLine;
	}

	async getMetadata(file: TFile): Promise<Record<string, any> | null> {
		const fileCache = this.app.metadataCache.getFileCache(file);
		return fileCache?.frontmatter || null;
	}

	async addConnection(cResult: ConnectionResult) {
		if (cResult['fromFile']) {
			await this.app.fileManager.processFrontMatter(cResult['fromFile'], (frontmatter) => {
				if (!frontmatter['connections']) {
					frontmatter['connections'] = [];
				}
				frontmatter['connections'].push({
					'connectionType': cResult['connectionType'],
					'link': `[[${this.app.metadataCache.fileToLinktext(cResult['toFile'], '')}]]`
				})
			});
		}
		if (!(this.previousConnectionTypes.includes(cResult['connectionType']))) {
			this.previousConnectionTypes.unshift(cResult['connectionType'])
			await this.saveData(this.previousConnectionTypes);
		}
	}

	async removeConnectionType(connectionType: string) {
		const index = this.previousConnectionTypes.indexOf(connectionType);
  		if (index > -1) {
    		this.previousConnectionTypes.splice(index, 1);
			this.saveData;
	  	}
	}

	async removeConnection(fromFile: any, connectionType: any, toFile: any, forward: any) {
		let sourceFile, linkedFile;
		if (forward) {
			sourceFile = this.app.vault.getFileByPath(fromFile);
			linkedFile = this.app.vault.getFileByPath(toFile);
		} else {
			sourceFile = this.app.vault.getFileByPath(toFile);
			linkedFile = this.app.vault.getFileByPath(fromFile);
		}
		if (sourceFile) {
			await this.app.fileManager.processFrontMatter(sourceFile, frontmatter => {
				if (frontmatter['connections']) {
					let pos = 0;
					for (let connection of frontmatter['connections']) {
						let resolvedLink = this.app.metadataCache.getFirstLinkpathDest(this.stripLink(connection['link']), '');
						if (connection['connectionType'] == connectionType && linkedFile == resolvedLink) {
							frontmatter['connections'].splice(pos, 1);
						}
						pos++;
					}
				}
				if (frontmatter['connections'].length == 0) {
					delete frontmatter['connections'];
				}
			});

		}
	}

	stripLink(link: string) {
		let linkRegExp = RegExp('\\[?\\[?([^\\[\\]]+)\\]?\\]?');
		let linkResults;
		if ((linkResults = linkRegExp.exec(link)) != null) {
			return linkResults[1];
		} else {
			return link;
		}
	}
}