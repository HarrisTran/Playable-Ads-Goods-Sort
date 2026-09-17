import { Node, Vec2, Vec3, Rect } from 'cc';

export enum ShelfType {
    Common,
    // Add other types here if needed
}

export enum ShelfLayerDisplay {
    Top,
    Second,
    Hidden
}

export class ShelfItemMeta {
    public readonly id: number;
    public readonly typeId: number;
    public readonly shelfId: number;
    public readonly layerId: number;
    public readonly slotId: number;

    constructor(shelfId: number, layerId: number, slotId: number, typeId: number, id: number) {
        this.shelfId = shelfId;
        this.layerId = layerId;
        this.slotId = slotId;
        this.typeId = typeId;
        this.id = id;
    }

    public changeSlot(shelfId: number, layerId: number, slotId: number): ShelfItemMeta {
        return new ShelfItemMeta(shelfId, layerId, slotId, this.typeId, this.id);
    }

    public changeType(typeId: number): ShelfItemMeta {
        return new ShelfItemMeta(this.shelfId, this.layerId, this.slotId, typeId, this.id);
    }
}

export interface ISpacingData {
    getPosition(layerId: number, slotId: number): Vec2 | Vec3;
}

export interface IDragObject {
    readonly id: number;
    readonly position: Vec3;
    readonly node: Node;

    getOriginalPosition(): Readonly<Vec3>;
    getSpriteBounds(): Rect;
    updatePosition(newPosition: Vec3): void;
    shouldReturnToOriginal(): boolean;
    returnToOriginalPosition(): void;
    resetVisuals(): void;
    onEndDrag(): void;
    containsPosition(position: Vec2): boolean;
    canBeDragged(): boolean;
    onStartDrag(): void;
    applyDragVisuals(): void;
}

export interface IDropZone {
    readonly shelfId: number;
    readonly slotId: number;
    readonly node: Node;

    shouldSnapToCenter(): boolean;
    getSnapPosition(slot: number): Vec3;
    containsPosition(position: Vec2): boolean;
}

export interface IShelfItem {
    readonly meta: ShelfItemMeta;
    readonly dragObject: IDragObject;
    readonly currentDisplay: ShelfLayerDisplay;

    destroyItem(playEffect: boolean): void;
    setPosition(position: Vec3): void;
    setShelf(meta: ShelfItemMeta, spacingData: ISpacingData, display: ShelfLayerDisplay): void;
    setNewMeta(newMeta: ShelfItemMeta): void;
    setDisplay(display: ShelfLayerDisplay): void;
    resetVisual(): void;
    isGoldenEgg(): boolean;

    // UI
    fadeInVisual(duration: number): void;
    bounce(onCompleted?: Function, delay?: number): void;
    jiggly(times?: number): void;
}

export interface IShelf2 {
    readonly id: number;
    readonly type: ShelfType;
    readonly spacingData: ISpacingData;
    readonly dropZones: IDropZone[];
    readonly node: Node;

    init(shelfId: number): void;
    onTopLayerCleared(onCleared?: (pos: Vec3) => void): void;
    getShelfBounds(): Rect;
}

export interface ShelfPuzzleInputData {
    type: ShelfType;
    data: number[][]; // [layer][slot]
}

export interface ILevelDataManager {
    onSlotDataChanged?: Function;

    dispose(): void;
    export(): ShelfPuzzleInputData[];
    removeItem(itemId: number): void;
    getItems(): IShelfItem[];
    getItem(shelfId: number, layerId: number, slotId: number): IShelfItem | null;
    findItemInShelf(shelfId: number, itemTypeId: number): IShelfItem | null;
    findItem(itemId: number): IShelfItem | null;
    getShelf(shelfId: number): IShelf2 | null;
    getShelves(): IShelf2[];
    getDrags(): IDragObject[];

    getTopLayerOfShelf(shelfId: number): number;
    getTopLayer(shelfId: number): IShelfItem[] | null;
    getLayer(shelfId: number, layerId: number): IShelfItem[] | null;
    getNextNonEmptyLayerId(shelfId: number, fromLayer: number): number;
    isLayerEmpty(shelfId: number, layerId: number): boolean;
    setSlotData(shelfId: number, layerId: number, slotId: number, item: IShelfItem | null): void;
    isDeadlock(): boolean;
    printLevel(): string;
}
