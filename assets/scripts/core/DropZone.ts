import { _decorator, Component, Node, Sprite, Vec3, Vec2, Rect, UITransform } from 'cc';
import { IDropZone, IShelf2, ILevelDataManager } from './Types';

const { ccclass, property } = _decorator;

@ccclass('DropZone')
export class DropZone extends Component implements IDropZone {
    @property({ type: Sprite })
    public spriteRenderer: Sprite | null = null;

    @property
    public detectionRadius: number = 100.0;

    @property
    public isActive: boolean = true;

    @property
    public maxObjects: number = 1;

    @property
    public snapToCenter: boolean = true;

    @property({ type: Vec2 })
    public customSize: Vec2 = new Vec2(100, 100);

    public get shelfId(): number { return this._shelfId; }
    public get slotId(): number { return this._slotId; }

    private _shelfId: number = 0;
    private _slotId: number = 0;
    private _parentShelf: IShelf2 | null = null;
    private _levelDataManager: ILevelDataManager | null = null;

    public init(shelfId: number, slotId: number): void {
        this._shelfId = shelfId;
        this._slotId = slotId;
    }

    public setDependencies(parentShelf: IShelf2, levelDataManager: ILevelDataManager): void {
        this._parentShelf = parentShelf;
        this._levelDataManager = levelDataManager;
    }

    public containsPosition(position: Vec2): boolean {
        if (!this.isActive) return false;

        const bounds = this.getBounds();
        if (bounds.contains(position)) return true;

        const worldPos = this.node.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3()) || this.node.worldPosition;
        const distance = Vec2.distance(new Vec2(worldPos.x, worldPos.y), position);
        return distance < this.detectionRadius;
    }

    public getSnapPosition(slot: number): Vec3 {
        const worldPos = this.node.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3()) || this.node.worldPosition;
        return new Vec3(worldPos.x, worldPos.y, worldPos.z);
    }

    public getDetectionDistance(position: Vec2): number {
        const worldPos = this.node.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3()) || this.node.worldPosition;
        return Vec2.distance(new Vec2(worldPos.x, worldPos.y), position);
    }

    public getOverlapArea(objectBounds: Rect): number {
        const zoneBounds = this.getBounds();
        const intersection = new Rect();
        Rect.intersection(intersection, zoneBounds, objectBounds);
        if (intersection.width <= 0 || intersection.height <= 0) return 0;
        return intersection.width * intersection.height;
    }

    public shouldSnapToCenter(): boolean {
        return this.snapToCenter;
    }

    public setActive(active: boolean): void {
        this.isActive = active;
    }

    public getShelfOverlapArea(objectBounds: Rect): number {
        const shelfBounds = this._parentShelf?.getShelfBounds() || this.getBounds();
        const intersection = new Rect();
        Rect.intersection(intersection, shelfBounds, objectBounds);
        if (intersection.width <= 0 || intersection.height <= 0) return 0;
        return intersection.width * intersection.height;
    }

    public getFirstEmptySlot(): number {
        if (!this._levelDataManager || !this._parentShelf) return -1;

        const topLayerId = this._levelDataManager.getTopLayerOfShelf(this.shelfId);
        const topLayer = this._levelDataManager.getLayer(this.shelfId, topLayerId);
        if (!topLayer) return -1;

        for (let slotId = 0; slotId < topLayer.length; slotId++) {
            if (topLayer[slotId] == null) return slotId;
        }
        return -1;
    }

    public getFirstEmptyDropZone(): IDropZone | null {
        const emptySlotId = this.getFirstEmptySlot();
        if (emptySlotId < 0 || !this._parentShelf) return null;

        const dropZones = this._parentShelf.dropZones;
        if (emptySlotId >= dropZones.length) return null;

        return dropZones[emptySlotId];
    }

    public getNearestEmptyDropZone(dropPosition: Vec2): IDropZone | null {
        if (!this._levelDataManager || !this._parentShelf) return null;

        const topLayerId = this._levelDataManager.getTopLayerOfShelf(this.shelfId);
        const topLayer = this._levelDataManager.getLayer(this.shelfId, topLayerId);
        if (!topLayer) return null;

        const dropZones = this._parentShelf.dropZones;
        let nearestZone: IDropZone | null = null;
        let minDistance = Number.MAX_VALUE;

        for (let slotId = 0; slotId < topLayer.length; slotId++) {
            if (topLayer[slotId] != null) continue;
            if (slotId >= dropZones.length) continue;

            const zone = dropZones[slotId];
            const zonePosition = zone.getSnapPosition(0);
            const distance = Vec2.distance(dropPosition, new Vec2(zonePosition.x, zonePosition.y));

            if (distance < minDistance) {
                minDistance = distance;
                nearestZone = zone;
            }
        }

        return nearestZone;
    }

    private getBounds(): Rect {
        const uiTransform = this.spriteRenderer?.getComponent(UITransform);
        if (uiTransform) {
            return uiTransform.getBoundingBoxToWorld();
        }

        const worldPos = this.node.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3()) || this.node.worldPosition;
        return new Rect(
            worldPos.x - this.customSize.x / 2,
            worldPos.y - this.customSize.y / 2,
            this.customSize.x,
            this.customSize.y
        );
    }
}
