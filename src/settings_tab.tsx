import { PluginSettingTab } from "obsidian";
import { createRoot, Root } from 'react-dom/client';
import { SettingsView } from './SettingsView';
import type ConnectionsPlugin from "./main";
import { ConnectionType } from "./connection_types";

export class ConnectionsSettingTab extends PluginSettingTab {
    plugin: ConnectionsPlugin;
    root: Root;

    constructor(plugin: ConnectionsPlugin) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    async addType(typeToAdd: ConnectionType): Promise<boolean> {
        return await this.plugin.cm.addConnectionType(typeToAdd);
    }

    async deleteType(typeToDelete: ConnectionType): Promise<boolean> {
        return await this.plugin.cm.deleteConnectionType(typeToDelete);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        this.root = createRoot(containerEl);
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