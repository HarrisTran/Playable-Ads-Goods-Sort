import { ILevelDataManager, IShelfItem, IShelf2, ShelfPuzzleInputData, IDragObject } from './Types';

export class LevelData {
    public readonly shelveItems: (IShelfItem | null)[][][];
    public readonly shelves: IShelf2[];

    constructor(shelveItems: (IShelfItem | null)[][][], shelves: IShelf2[]) {
        this.shelveItems = shelveItems;
        this.shelves = shelves;
    }
}

export class LevelDataManager implements ILevelDataManager {
    private readonly _shelves: (IShelfItem | null)[][][];
    private readonly _shelvesObjects: IShelf2[];
    private readonly _items: Map<number, IShelfItem>;

    public onSlotDataChanged?: Function;

    constructor(levelData: LevelData) {
        this._shelves = levelData.shelveItems;
        this._shelvesObjects = levelData.shelves;
        this._items = new Map<number, IShelfItem>();

        for (const layers of this._shelves) {
            for (const layer of layers) {
                for (const shelf of layer) {
                    if (shelf != null) {
                        this._items.set(shelf.meta.id, shelf);
                    }
                }
            }
        }
    }

    public dispose(): void {
        this.onSlotDataChanged = undefined;
        this._items.clear();
    }

    public export(): ShelfPuzzleInputData[] {
        const exportData: ShelfPuzzleInputData[] = new Array(this._shelves.length);
        for (let shelfId = 0; shelfId < this._shelves.length; shelfId++) {
            const shelf = this._shelvesObjects[shelfId];
            exportData[shelfId] = {
                type: shelf.type,
                data: this._shelves[shelfId].map(layer =>
                    layer.map(p => p != null ? p.meta.typeId : 0)
                )
            };
        }
        return exportData;
    }

    public removeItem(itemId: number): void {
        const item = this._items.get(itemId);
        if (!item) return;

        this._items.delete(itemId);
        this.setSlotData(item.meta.shelfId, item.meta.layerId, item.meta.slotId, null);
    }

    public getItems(): IShelfItem[] {
        return Array.from(this._items.values());
    }

    public getItem(shelfId: number, layerId: number, slotId: number): IShelfItem | null {
        if (!this._shelves) return null;
        if (shelfId < 0 || shelfId >= this._shelves.length) return null;
        const shelf = this._shelves[shelfId];
        if (layerId < 0 || layerId >= shelf.length) return null;
        const layer = shelf[layerId];
        if (slotId < 0 || slotId >= layer.length) return null;
        
        return layer[slotId];
    }

    public findItemInShelf(shelfId: number, itemTypeId: number): IShelfItem | null {
        if (!this._shelves) return null;
        if (shelfId < 0 || shelfId >= this._shelves.length) return null;
        
        const shelf = this._shelves[shelfId];
        const layerId = LevelDataManager.findNotEmptyLayer(shelf);
        const layer = shelf[layerId];
        
        return LevelDataManager.findItemTypeInLayer(layer, itemTypeId);
    }

    public findItem(itemId: number): IShelfItem | null {
        return this._items.get(itemId) || null;
    }

    public getShelf(shelfId: number): IShelf2 | null {
        return this._shelvesObjects.find(e => e.id === shelfId) || null;
    }

    public getShelves(): IShelf2[] {
        return [...this._shelvesObjects];
    }

    public getDrags(): IDragObject[] {
        const drags: IDragObject[] = [];
        this._items.forEach((item) => {
            if (item.dragObject) {
                drags.push(item.dragObject);
            }
        });
        return drags;
    }

    public getTopLayerOfShelf(shelfId: number): number {
        if (shelfId < 0 || shelfId >= this._shelves.length) return -1;
        const shelf = this._shelves[shelfId];
        return LevelDataManager.findNotEmptyLayer(shelf);
    }

    public getTopLayer(shelfId: number): IShelfItem[] | null {
        if (shelfId < 0 || shelfId >= this._shelves.length) return null;
        const shelf = this._shelves[shelfId];
        
        for (const layer of shelf) {
            for (const slot of layer) {
                if (slot != null) {
                    return layer as IShelfItem[]; // Found a non-empty layer, returning it
                }
            }
        }
        return [];
    }

    public getLayer(shelfId: number, layerId: number): IShelfItem[] | null {
        if (shelfId < 0 || shelfId >= this._shelves.length) return null;
        const shelf = this._shelves[shelfId];
        if (layerId < 0 || layerId >= shelf.length) return null;
        return shelf[layerId] as IShelfItem[];
    }

    public getNextNonEmptyLayerId(shelfId: number, fromLayer: number): number {
        while (true) {
            const currentLayer = fromLayer + 1;
            const layer = this.getLayer(shelfId, currentLayer);
            if (!layer) {
                return -1;
            }

            for (const slot of layer) {
                if (slot != null) return currentLayer;
            }

            fromLayer = currentLayer;
        }
    }

    public isLayerEmpty(shelfId: number, layerId: number): boolean {
        if (shelfId < 0 || shelfId >= this._shelves.length) return true;
        const shelf = this._shelves[shelfId];
        if (layerId < 0 || layerId >= shelf.length) return true;
        
        const layer = shelf[layerId];
        for (const slot of layer) {
            if (slot != null) return false;
        }
        return true;
    }

    public setSlotData(shelfId: number, layerId: number, slotId: number, item: IShelfItem | null): void {
        if (!this._shelves) return;
        if (shelfId < 0 || shelfId >= this._shelves.length) return;
        const shelf = this._shelves[shelfId];
        if (layerId < 0 || layerId >= shelf.length) return;
        const layer = shelf[layerId];
        if (slotId < 0 || slotId >= layer.length) return;
        
        layer[slotId] = item;
        if (this.onSlotDataChanged) {
            this.onSlotDataChanged();
        }
    }

    public isDeadlock(): boolean {
        for (const shelf of this._shelvesObjects) {
            // Assume ShelfType.Common is 0 based on Types.ts enum
            if (shelf.type !== 0) continue; 
            
            const topLayer = this.getTopLayer(shelf.id);
            if (!topLayer || topLayer.length === 0) return false;
            
            for (const t of topLayer) {
                if (t == null || t.isGoldenEgg()) return false;
            }
        }
        return true;
    }

    public printLevel(): string {
        let result = "";
        for (let shelfId = 0; shelfId < this._shelves.length; shelfId++) {
            const shelf = this._shelves[shelfId];
            const layers = shelf.map(layer =>
                "[" + layer.map(item => item != null ? item.meta.typeId.toString() : "_").join(" ") + "]"
            );
            result += `Shelf ${shelfId}: ${layers.join(" ")}\n`;
        }
        return result;
    }

    private static findNotEmptyLayer(shelf: (IShelfItem | null)[][]): number {
        for (let layerId = 0; layerId < shelf.length; layerId++) {
            const layer = shelf[layerId];
            if (layer.some(t => t != null)) {
                return layerId;
            }
        }
        return 0;
    }

    private static findItemTypeInLayer(layer: (IShelfItem | null)[], itemTypeId: number): IShelfItem | null {
        return layer.find(slot => slot != null && slot.meta.typeId === itemTypeId) || null;
    }
}
