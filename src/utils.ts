import ConnectionsPlugin from './main';
import { TFile } from 'obsidian';

/**
 * Removes [[]]]] from a file link, if required.
 * @param {link} string - A  object describing the connection.
 * @returns {string}
 */
export function stripLink(link: string) {
    const linkRegExp = RegExp('\\[?\\[?([^\\[\\]]+)\\]?\\]?');
    let linkResults;
    if ((linkResults = linkRegExp.exec(link)) != null) {
        return linkResults[1];
    } else {
        return link;
    }
}

export function textOrFileToLinktext(cp: ConnectionsPlugin, file: TFile | string): string {
    return file instanceof TFile ? cp.app.metadataCache.fileToLinktext(file, '') : file;
}