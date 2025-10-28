import { Plugin, TFile } from 'obsidian';
import { ConnectionsModal } from './connection_modal';
import { ConnectionsSettingTab } from './settings_tab'
import { createLink } from "./utils/links";

export class ConnectionData {
	fromFile: TFile;
	toFile: TFile;
	connectionType: string;

	constructor(ff: TFile, tf: TFile, ct: string) {
		this.fromFile = ff;
		this.toFile = tf;
		this.connectionType = ct;
	}
}

export type UnmappedType = string;
export interface MappedType {
	mapProperty: string,
	mapConnectionType: string
}

export interface ConnectionsSettings {
	mappedTypes: Array<MappedType>;
	unmappedTypes: Array<UnmappedType>;
}

export default class ConnectionsPlugin extends Plugin {

	footerTextElement: HTMLElement;
	settings: ConnectionsSettings;

	async onload(): Promise<void> {

		this.addSettingTab(new ConnectionsSettingTab(this));
		this.settings = await this.loadData();

		this.addCommand({
			id: 'add-connection',
			name: 'Add connection to another note',
			callback: () => {
				const currentFile = this.app.workspace.getActiveFile();
				if (currentFile) {
					new ConnectionsModal(this, currentFile, this.settings.unmappedTypes, (result: ConnectionData) => this.addConnection(result)).open()
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

	/**
	 * Refreshes the content of the Connections footer.
	 * @param {TFile} file - The active file
	 */
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

	/**
	 * Finds and returns connections embedded in the current note's frontmatter
	 * @param {TFile} file - The selected file
	 * @returns {HTMLDivElement}
	 */
	async getForwardConnections(file: TFile) {
		const metadata = await this.getMetadata(file);
		let forwardConnections = document.createElement('div');
		forwardConnections.addClass('connections-group');
		if (metadata) {
			this.getUnmappedForwardConnections(file, metadata, forwardConnections);
			this.getMappedForwardConnections(file, metadata, forwardConnections);
		}
		return forwardConnections;
	}

	getUnmappedForwardConnections(file: TFile, metadata: Record<string, any>, forwardConnections: HTMLElement) {
		let unmappedConnections = metadata['connections']
		if (unmappedConnections) {
			for (let connection of unmappedConnections) {
				let connectionType = connection['connectionType'];
				let strippedLink = this.stripLink(connection['link']);
				let linkedFile = this.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
				if (linkedFile) {
					let connectionLine = this.createConnectionLine(new ConnectionData(file, linkedFile, connectionType));
					if (connectionLine) {
						forwardConnections.appendChild(connectionLine);

					}
				}
			}
		}
	}

	getMappedForwardConnections(file: TFile, metadata: Record<string, any>, forwardConnections: HTMLElement) {
		for (let mappedType of this.settings.mappedTypes) {
			if (metadata[mappedType.mapProperty]) {
				let propertyValue = metadata[mappedType.mapProperty];
				let connectionType = mappedType.mapConnectionType;
				let strippedLink = this.stripLink(propertyValue);
				let linkedFile = this.app.metadataCache.getFirstLinkpathDest(strippedLink, '');
				if (linkedFile) {
					let connectionLine = this.createConnectionLine(new ConnectionData(file, linkedFile, connectionType));
					if (connectionLine) {
						forwardConnections.appendChild(connectionLine);

					}
				}
			}
		}
	}


	/**
	 * Finds backwards links to the current note and then returns any connections they might have.
	 * @param {TFile} file - The selected file
	 * @returns {HTMLDivElement}
	 */
	async getBackwardConnections(file: TFile) {
		let bFoundConnectionsFiles = new Set<string>();
		let backwardConnections = document.createElement('div');
		backwardConnections.addClass('connections-group');
		//@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
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
								let connectionLine = this.createConnectionLine(new ConnectionData(bLinkFile, file, connectionType), false);
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

	/**
	 * Create HTML elements describing the connection.
	 * @param {ConnectionData} cData - A  object describing the connection.
	 * @param {boolean} forward - Whether or not the connection is a forward or backward connection
	 * @returns {HTMLDivElement}
	 */
	createConnectionLine(cData: ConnectionData, forward: boolean = true) {
		const { fromFile, toFile, connectionType } = cData;
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
		btn.dataset.fromFile = fromFile.path;
		btn.dataset.toFile = toFile.path;
		btn.dataset.connectionType = connectionType;
		btn.dataset.forward = String(forward);
		btn.addEventListener('click', (ev: PointerEvent) => {
			let clickedBtn = ev.currentTarget;
			if (clickedBtn && clickedBtn instanceof HTMLButtonElement) {
				let sourceFile, linkedFile;
				let { fromFile, toFile, connectionType } = clickedBtn.dataset
				let forward = (clickedBtn.dataset.forward === 'true');
				if (fromFile === undefined || toFile === undefined || connectionType === undefined) {
					console.error('Missing parameters required to remove connection!');
					return;
				}
				if (forward) {
					sourceFile = this.app.vault.getFileByPath(fromFile);
					linkedFile = this.app.vault.getFileByPath(toFile);
				} else {
					sourceFile = this.app.vault.getFileByPath(toFile);
					linkedFile = this.app.vault.getFileByPath(fromFile);
				}
				if (sourceFile instanceof TFile && linkedFile instanceof TFile) {
					this.removeConnection(new ConnectionData(sourceFile, linkedFile, connectionType));
				}
			}
		});
		connectionLine.createEl('br');
		return connectionLine;
	}

	/**
	 * Retrieve metadata for a given TFile.
	 * @param {TFile} file - The selected file
	 * @returns {CachedMetadata}
	 */
	async getMetadata(file: TFile): Promise<Record<string, any> | null> {
		const fileCache = this.app.metadataCache.getFileCache(file);
		return fileCache?.frontmatter || null;
	}

	/**
	 * Adds a connection between files
	 * @param {ConnectionData} cData - A  object describing the connection.
	 */
	async addConnection(cData: ConnectionData) {
		const { fromFile, toFile, connectionType } = cData;
		if (fromFile) {
			await this.app.fileManager.processFrontMatter(fromFile, (frontmatter) => {
				if (!frontmatter['connections']) {
					frontmatter['connections'] = [];
				}
				frontmatter['connections'].push({
					'connectionType': connectionType,
					'link': `[[${this.app.metadataCache.fileToLinktext(toFile, '')}]]`
				})
			});
		}

		// If the last connectionType we used isn't at the front of the list, move it there.
		const index = this.settings.unmappedTypes.indexOf(connectionType);
		if (index == 0) {
			return;
		} else if (index > 0) {
			this.settings.unmappedTypes.splice(index, 1);
		}
		this.settings.unmappedTypes.unshift(connectionType)
		await this.saveData(this.settings);
	}

	/**
	 * Adds a connection type to the list of unmapped connection types
	 * @param {string} connectionType - The connection type to add.
	 */
	async addConnectionType(connectionType: UnmappedType) {
		const index = this.settings.unmappedTypes.indexOf(connectionType);
		if (index == -1) {
			this.settings.unmappedTypes.push(connectionType);
			await this.saveData(this.settings);
		}
	}

	/**
	 * Removes a connection type from the list of unmapped connection types
	 * @param {string} connectionType - The connection type to remove.
	 */
	async removeConnectionType(connectionType: UnmappedType) {
		const index = this.settings.unmappedTypes.indexOf(connectionType);
		if (index > -1) {
			this.settings.unmappedTypes.splice(index, 1);
			await this.saveData(this.settings);
		}
	}

	async addMappedConnectionType(mapProperty: string, mapConnectionType: string) {
		let index = this.findMappedConnectionType(mapProperty, mapConnectionType);
		if (index == -1) {
			this.settings.mappedTypes.push({ mapProperty: mapProperty, mapConnectionType: mapConnectionType });
			await this.saveData(this.settings);
		}
	}

	async removeMappedConnectionType(mapProperty: string, mapConnectionType: string) {
		let index = this.findMappedConnectionType(mapProperty, mapConnectionType);
		if (index != -1) {
			this.settings.mappedTypes.splice(index, 1);
			await this.saveData(this.settings);
		}
	}

	findMappedConnectionType(mapProperty: string, mapConnectionType: string) {
		for (let index = 0; index < this.settings.mappedTypes.length; index++) {
			let mappedType = this.settings.mappedTypes[index];
			if (mappedType.mapProperty == mapProperty && mappedType.mapConnectionType == mapConnectionType) {
				return index;
			}
		}
		return -1;
	}

	/**
	 * Removes a connection between files
	 * @param {ConnectionData} cData - A  object describing the connection.
	 */
	async removeConnection(cData: ConnectionData) {
		const { fromFile, toFile, connectionType } = cData;
		await this.app.fileManager.processFrontMatter(fromFile, frontmatter => {
			if (frontmatter['connections']) {
				let pos = 0;
				for (let connection of frontmatter['connections']) {
					let resolvedLink = this.app.metadataCache.getFirstLinkpathDest(this.stripLink(connection['link']), '');
					if (connection['connectionType'] == connectionType && toFile == resolvedLink) {
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

	/**
	 * Removes [[]]]] from a file link, if required.
	 * @param {link} string - A  object describing the connection.
	 * @returns {string}
	 */
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