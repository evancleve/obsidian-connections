import ConnectionsPlugin from './main';
import { ConnectionsSettings } from './connection_types';
import { TFile } from 'obsidian';
import { createTheme } from '@mui/material/styles';

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
    return file instanceof TFile ? cp.app.metadataCache.fileToLinktext(file, file.path) : file;
}

const styleProperties = {
    borderColor: 'inherit',
    caretColor: 'inherit',
    color: 'inherit',
    cursor: 'inherit',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    outlineColor: 'inherit'
}

const inheritStyles = {
    styleOverrides: {
        root: { ...styleProperties, "&.Mui-active": { styleProperties } },
        hover: styleProperties,
        focus: styleProperties,
    },
}

export const obsidianTheme = createTheme({
    components: {
        MuiTableCell: inheritStyles,
        MuiSelect: inheritStyles,
        MuiInput: inheritStyles,
    },
});

export class KeyGenerator {
    prefix: string;
    settings: ConnectionsSettings | undefined;
    i: number = 0;

    constructor(prefix: string, settings?: ConnectionsSettings) {
        this.prefix = prefix;
        if (settings) this.settings = settings;
    }

    generateKey() {
        if (this.settings) {
            return `${this.prefix}-${(this.settings.nextConnectionTypeId)++}`;
        }
        return `${this.prefix}-${(this.i)++}`;
    }
}