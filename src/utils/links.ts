//adapted from https://github.com/mgeduld/obsidian-tagged-documents-viewer/blob/master/src/utils/links.ts, which was...
//adapted from https://github.com/Aidurber/tag-page-preview/blob/master/src/utils/render.ts

import { App, OpenViewState, TFile, Platform } from "obsidian";

/**
 * Check if the event was CTRL for Windows or Command for macOS
 * @param event - Mouse Event
 * @returns
 */
function isMetaKey(event: MouseEvent): boolean {
	return Platform.isMacOS ? event.metaKey : event.ctrlKey;
}
/**
 * Open an Obsidian link
 * @param app - Obsidian App object
 * @param dest  - Link href
 * @param currFile - Current open file
 * @param event - Click event
 */
async function openLink(
	app: App,
	dest: string,
	currFile: TFile,
	event: MouseEvent
): Promise<void> {
	const destFile = app.metadataCache.getFirstLinkpathDest(
		dest,
		currFile.path
	);
	if (destFile == null) return;
	//@ts-ignore - apparently an undocumented Obsidian feature, but a feature nonetheless!
	const mode = app.vault.getConfig("defaultViewMode");
	const leaf = app.workspace.getLeaf(isMetaKey(event));
	await leaf.openFile(
		destFile,
		{ active: true, mode } as OpenViewState
	);
}
