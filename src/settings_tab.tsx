import { PluginSettingTab } from "obsidian";
import { Root, createRoot } from 'react-dom/client';
import { SettingsView } from './SettingsView';

import type ConnectionsPlugin from "./main";
import { ConnectionsSettings, MappedType } from "./main";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

export class ConnectionsSettingTab extends PluginSettingTab {
    plugin: ConnectionsPlugin;
    root: Root;

    constructor(plugin: ConnectionsPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    async deleteMappedType(mappedType: MappedType) {
        await this.plugin.removeMappedConnectionType(mappedType.mapProperty, mappedType.mapConnectionType);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('connections-settings-revert');
        const subcontainerEl = containerEl.createEl('div');
        this.root = createRoot(subcontainerEl);
        this.root.render(
            <SettingsView settings={this.plugin.settings} deleteMappedFunc={this.deleteMappedType.bind(this)} addMappedFunc={this.deleteMappedType} />
        );
    }

    hide(): void {
        this.root.unmount();
    }
}