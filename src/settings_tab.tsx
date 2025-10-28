import { PluginSettingTab } from "obsidian";
import { Root, createRoot } from 'react-dom/client';
import { SettingsView } from './SettingsView';

import type ConnectionsPlugin from "./main";
import { MappedType, UnmappedType } from "./main";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function isMappedType(val: MappedType | UnmappedType): val is MappedType {
    return (val as MappedType).mapProperty !== undefined;
}

export class ConnectionsSettingTab extends PluginSettingTab {
    plugin: ConnectionsPlugin;
    root: Root;

    constructor(plugin: ConnectionsPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    async addType(typeToAdd: MappedType | UnmappedType) {
        if (isMappedType(typeToAdd)) {
            await this.plugin.addMappedConnectionType(typeToAdd.mapProperty, typeToAdd.mapConnectionType);
        } else {
            await this.plugin.addConnectionType(typeToAdd);
        }
    }

    async deleteType(typeToDelete: MappedType | UnmappedType) {
        if (isMappedType(typeToDelete)) {
            await this.plugin.removeMappedConnectionType(typeToDelete.mapProperty, typeToDelete.mapConnectionType);
        } else {
            await this.plugin.removeConnectionType(typeToDelete);
        }
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('connections-settings-revert');
        const subcontainerEl = containerEl.createEl('div');
        this.root = createRoot(subcontainerEl);
        this.root.render(
            <SettingsView
                settings={this.plugin.settings}
                deleteFunc={this.deleteType.bind(this)}
                addFunc={this.addType.bind(this)} />
        );
    }

    hide(): void {
        this.root.unmount();
    }
}