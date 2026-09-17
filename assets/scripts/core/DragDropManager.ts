import { _decorator, Component, Node, systemEvent, SystemEventType, Touch, EventTouch, Vec3, Vec2, Color, UITransform } from 'cc';
import { IDragObject, IDropZone, ShelfItemMeta } from './Types';

const { ccclass, property } = _decorator;

export class DropZoneData {
    zone!: IDropZone;
    onDropped!: (dragId: number) => void;
}

@ccclass('DragDropManager')
export class DragDropManager extends Component {
    @property({ type: Node })
    public container: Node | null = null;

    @property
    public enableVisualFeedback: boolean = true;

    @property({ type: Color })
    public dragColor: Color = new Color(255, 255, 255, 204);

    @property({ type: Vec3 })
    public dragScale: Vec3 = new Vec3(1.1, 1.1, 1);

    private _canAcceptDropIntoFunc!: (zone: IDropZone) => boolean;

    private _dragObjects: IDragObject[] = [];
    private _dropZones: DropZoneData[] = [];

    private _currentDraggingObject: IDragObject | null = null;
    private _dragOffset: Vec3 = new Vec3();
    private _pause: boolean = false;

    protected onLoad() {
        systemEvent.on(SystemEventType.TOUCH_START, this.onTouchStart, this);
        systemEvent.on(SystemEventType.TOUCH_MOVE, this.onTouchMove, this);
        systemEvent.on(SystemEventType.TOUCH_END, this.onTouchEnd, this);
        systemEvent.on(SystemEventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onDestroy() {
        systemEvent.off(SystemEventType.TOUCH_START, this.onTouchStart, this);
        systemEvent.off(SystemEventType.TOUCH_MOVE, this.onTouchMove, this);
        systemEvent.off(SystemEventType.TOUCH_END, this.onTouchEnd, this);
        systemEvent.off(SystemEventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    public init(canAcceptDropIntoFunc: (zone: IDropZone) => boolean): void {
        this._canAcceptDropIntoFunc = canAcceptDropIntoFunc;
    }

    public registerDragObject(dragObject: IDragObject): void {
        if (!dragObject) return;
        if (this._dragObjects.indexOf(dragObject) === -1) {
            this._dragObjects.push(dragObject);
        }
    }

    public unregisterDragObject(dragId: number): void {
        const index = this._dragObjects.findIndex(d => d.id === dragId);
        if (index >= 0) {
            this._dragObjects.splice(index, 1);
        }
        if (this._currentDraggingObject?.id === dragId) {
            this._currentDraggingObject = null;
        }
    }

    public registerDropZone(dropZone: DropZoneData): void {
        this.unregisterDropZone(dropZone.zone);
        this._dropZones.push(dropZone);
    }

    public unregisterDropZone(dropZone: IDropZone): void {
        const index = this._dropZones.findIndex(e => e.zone === dropZone);
        if (index >= 0) {
            this._dropZones.splice(index, 1);
        }
    }

    public isDragging(): boolean {
        return this._currentDraggingObject !== null;
    }

    public getCurrentDraggingObject(): IDragObject | null {
        return this._currentDraggingObject;
    }

    public resetAllObjects(): void {
        for (const obj of this._dragObjects) {
            obj.returnToOriginalPosition();
        }
    }

    public removeAll(): void {
        this._currentDraggingObject = null;
        this._dragObjects = [];
        this._dropZones = [];
    }

    public pause(): void {
        this._pause = true;
    }

    public unpause(): void {
        this._pause = false;
    }

    public releaseDraggingObject(): void {
        if (!this._currentDraggingObject) return;

        if (!this._currentDraggingObject.node || !this._currentDraggingObject.node.isValid) {
            this._currentDraggingObject = null;
            return;
        }

        this._currentDraggingObject.returnToOriginalPosition();
        this._currentDraggingObject.resetVisuals();
        this._currentDraggingObject.onEndDrag();
        this._currentDraggingObject = null;
    }

    public manualDropInto(dragObject: IDragObject, dropZone: IDropZone): void {
        const targetZoneData = this._dropZones.find(e => e.zone === dropZone);
        if (targetZoneData) {
            this.dropInto(dragObject, targetZoneData);
        }
    }

    private getTouchWorldPos(event: EventTouch): Vec3 {
        const uiLoc = event.getUILocation();
        return new Vec3(uiLoc.x, uiLoc.y, 0);
    }

    private onTouchStart(touch: Touch, event: EventTouch): void {
        if (this._pause || this._currentDraggingObject !== null) return;

        const touchWorldPos = this.getTouchWorldPos(event);
        const uiLoc = new Vec2(touchWorldPos.x, touchWorldPos.y);
        const objectUnderMouse = this.getDragObjectAtPosition(uiLoc);

        if (objectUnderMouse) {
            this.startDrag(objectUnderMouse, uiLoc, event);
        }
    }

    private onTouchMove(touch: Touch, event: EventTouch): void {
        if (this._pause || this._currentDraggingObject === null) return;

        const touchWorldPos = this.getTouchWorldPos(event);
        const targetWorldPos = new Vec3(touchWorldPos.x + this._dragOffset.x, touchWorldPos.y + this._dragOffset.y, 0);

        this._currentDraggingObject.updatePosition(targetWorldPos);
    }

    private onTouchEnd(touch: Touch, event: EventTouch): void {
        if (this._currentDraggingObject !== null) {
            const touchWorldPos = this.getTouchWorldPos(event);
            this.endDrag(new Vec2(touchWorldPos.x, touchWorldPos.y));
        }
    }

    private startDrag(dragObject: IDragObject, touchWorldPos: Vec2, event: EventTouch): void {
        this._currentDraggingObject = dragObject;

        dragObject.onStartDrag();

        const objWorldPos = dragObject.node.worldPosition.clone();
        this._dragOffset = new Vec3(objWorldPos.x - touchWorldPos.x, objWorldPos.y - touchWorldPos.y, 0);

        if (this.enableVisualFeedback) {
            dragObject.applyDragVisuals();
        }
    }

    private endDrag(touchWorldPos: Vec2): void {
        if (!this._currentDraggingObject) return;

        if (!this._currentDraggingObject.node || !this._currentDraggingObject.node.isValid) {
            this._currentDraggingObject = null;
            return;
        }

        const dragObject = this._currentDraggingObject;
        const dropPosition = dragObject.position;
        const originalPosition = dragObject.getOriginalPosition();

        const dragDistance = Vec2.distance(
            new Vec2(dropPosition.x, dropPosition.y),
            new Vec2(originalPosition.x, originalPosition.y)
        );

        const minDragDistance = 10.0;
        let successfulDrop = false;

        if (dragDistance >= minDragDistance) {
            const targetZoneData = this.getDropZoneAtPosition(touchWorldPos, dragObject);
            if (targetZoneData) {
                successfulDrop = this.dropInto(dragObject, targetZoneData);
            }
        }

        if (!successfulDrop && dragObject.shouldReturnToOriginal()) {
            dragObject.returnToOriginalPosition();
        }

        dragObject.resetVisuals();
        dragObject.onEndDrag();
        this._currentDraggingObject = null;
    }

    private getDragObjectAtPosition(position: Vec2): IDragObject | null {
        for (let i = this._dragObjects.length - 1; i >= 0; i--) {
            const dragObj = this._dragObjects[i];
            if (dragObj.canBeDragged() && dragObj.containsPosition(position)) {
                return dragObj;
            }
        }
        return null;
    }

    private getDropZoneAtPosition(touchPos: Vec2, dragObject: IDragObject): DropZoneData | null {
        const dragObjectBounds = dragObject.getSpriteBounds();
        const shelfOverlaps = new Map<number, { zoneData: DropZoneData, overlap: number }>();

        for (const zoneData of this._dropZones) {
            const zone = zoneData.zone as any;
            const shelfId = zone.shelfId;

            if (shelfOverlaps.has(shelfId)) continue;

            if (zone.getShelfOverlapArea) {
                const overlap = zone.getShelfOverlapArea(dragObjectBounds);
                if (overlap > 0) {
                    shelfOverlaps.set(shelfId, { zoneData, overlap });
                }
            }
        }

        if (shelfOverlaps.size === 0) return null;

        let bestShelfEntry: { zoneData: DropZoneData, overlap: number } | null = null;
        for (const value of shelfOverlaps.values()) {
            if (!bestShelfEntry || value.overlap > bestShelfEntry.overlap) {
                bestShelfEntry = value;
            }
        }

        if (!bestShelfEntry) return null;

        const bestZoneComponent = bestShelfEntry.zoneData.zone as any;

        if (bestZoneComponent.getNearestEmptyDropZone) {
            const emptyDropZone = bestZoneComponent.getNearestEmptyDropZone(touchPos);
            if (emptyDropZone) {
                return this._dropZones.find(e => e.zone === emptyDropZone) || null;
            }
        }

        return null;
    }

    private dropInto(dragObject: IDragObject, targetZoneData: DropZoneData): boolean {
        const targetZone = targetZoneData.zone;

        if (!targetZone || (this._canAcceptDropIntoFunc && !this._canAcceptDropIntoFunc(targetZone))) return false;

        if (targetZone.shouldSnapToCenter()) {
            dragObject.updatePosition(targetZone.getSnapPosition(0));
        }

        this.scheduleOnce(() => {
            targetZoneData.onDropped(dragObject.id);
        }, 0);

        return true;
    }
}
