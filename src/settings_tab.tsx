import { PluginSettingTab } from "obsidian";
import { Root, createRoot } from 'react-dom/client';
import { SettingsView } from './SettingsView';

import type ConnectionsPlugin from "./main";
import { MappedConnectionType, UnmappedConnectionType } from "./main";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

function isMappedConnectionType(val: MappedConnectionType | UnmappedConnectionType): val is MappedConnectionType {
    return (val as MappedConnectionType).mapProperty !== undefined;
}

export class ConnectionsSettingTab extends PluginSettingTab {
    plugin: ConnectionsPlugin;
    root: Root;

    constructor(plugin: ConnectionsPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    async addType(typeToAdd: MappedConnectionType | UnmappedConnectionType): Promise<boolean> {
        if (isMappedConnectionType(typeToAdd)) {
            return await this.plugin.addMappedConnectionType(typeToAdd.mapProperty, typeToAdd.connectionType, typeToAdd.mapConnectionDirection);
        } else {
            return await this.plugin.addConnectionType(typeToAdd);
        }
    }

    async deleteType(typeToDelete: MappedConnectionType | UnmappedConnectionType) {
        if (isMappedConnectionType(typeToDelete)) {
            await this.plugin.removeMappedConnectionType(typeToDelete.mapProperty);
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