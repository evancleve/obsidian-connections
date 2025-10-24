import { App, ButtonComponent, PluginSettingTab, Setting,  } from "obsidian";
import type ConnectionsPlugin from "./main";

export class ConnectionSettingTab extends PluginSettingTab {
	plugin: ConnectionsPlugin;

	constructor(app: App, plugin: ConnectionsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

        let mapProperty: string, mapConnectionType: string;
        let mappingContainer = containerEl.createDiv('mapping-container');
        new Setting(mappingContainer).setHeading()
            .setName("Add Mapped Connection Type");
            
        new Setting(mappingContainer)
            .setDesc("A description of this feature!")
            .addText(async (text) => {
                text.setPlaceholder("frontmatter property")
                    .onChange(async () => {
                        mapProperty = text.getValue();
                    })
            })
            .addText(async (text) => {
                text.setPlaceholder("connection type")
                    .onChange(async () => {
                        mapConnectionType = text.getValue();
                    })
            })
            .addButton(button => button
            .setButtonText('Add')
            .setIcon('plus')
            .onClick(() => {
                if (mapProperty && mapConnectionType) {
                    this.plugin.addMappedConnectionType(mapProperty, mapConnectionType);
                }
                this.display();
            }));
            
            for (let mappedType of this.plugin.settings.mappedTypes) {
                let mapContainer = mappingContainer.createDiv('map-container');
                let mapPropText = mapContainer.createEl('span')
                mapPropText.addClass('connections-mapproptext');
                mapPropText.setText(mappedType.mapProperty);
                let arrowText = mapContainer.createEl('span');
                arrowText.setText(' => ');
                arrowText.addClass('connections-arrowtext');
                let connectionTypeText = mapContainer.createEl('span')
                connectionTypeText.setText(mappedType.mapConnectionType);
                connectionTypeText.addClass('connections-connectiontypetext')
                let btn = mapContainer.createEl('button');
                btn.addClass('connection-button');
                btn.dataset.mapProperty = mappedType.mapProperty;
                btn.dataset.mapConnectionType = mappedType.mapConnectionType;
                btn.onClickEvent(() => {
                    if (btn.dataset.mapProperty && btn.dataset.mapConnectionType) {
                        this.plugin.removeMappedConnectionType(btn.dataset.mapProperty, btn.dataset.mapConnectionType);
                        this.display();
                    }
                })
                
            }
	}
}