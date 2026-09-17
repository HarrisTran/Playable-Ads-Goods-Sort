import { _decorator, Sprite, Vec3, Rect, UITransform } from 'cc';
import { ShelfBase } from './ShelfBase';
import { ShelfType, IDropZone, ISpacingData } from '../core/Types';
import { DropZone } from '../core/DropZone';
import { CommonShelfNormalSpacingData } from './CommonShelfNormalSpacingData';

const { ccclass, property } = _decorator;

@ccclass('CommonShelfNormal')
export class CommonShelfNormal extends ShelfBase {
    @property({ type: [DropZone] })
    public dropZoneComponents: DropZone[] = [];

    @property({ type: Sprite })
    public sprRenderer: Sprite | null = null;

    @property({ type: CommonShelfNormalSpacingData })
    public spacingDataComponent: CommonShelfNormalSpacingData | null = null;

    private _shelfId: number = 0;
    private _dropZones: IDropZone[] = [];

    public get id(): number { return this._shelfId; }
    protected set id(value: number) { this._shelfId = value; }

    public get type(): ShelfType { return ShelfType.Common; }
    
    public get spacingData(): ISpacingData { 
        return this.spacingDataComponent as ISpacingData; 
    }

    public get dropZones(): IDropZone[] { return this._dropZones; }
    protected set dropZones(value: IDropZone[]) { this._dropZones = value; }

    protected onLoad() {
        if (this.dropZoneComponents.length !== 3) {
            console.error("Phải có đúng 3 Drop zone");
        }
    }

    public init(shelfId: number): void {
        this._shelfId = shelfId;
        this.node.name = `${this.node.name}-${shelfId}`;
        
        this._dropZones = new Array<IDropZone>(this.dropZoneComponents.length);
        for (let slotId = 0; slotId < this.dropZoneComponents.length; slotId++) {
            const zone = this.dropZoneComponents[slotId];
            if (zone) {
                zone.init(this._shelfId, slotId);
                this._dropZones[slotId] = zone as IDropZone;
            }
        }
    }

    public onTopLayerCleared(onCleared?: (pos: Vec3) => void): void {
        if (onCleared) {
            const worldPos = this.node.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3()) || this.node.worldPosition;
            onCleared(worldPos);
        }
    }
    
    public getShelfBounds(): Rect {
        if (this.sprRenderer) {
            const uiTransform = this.sprRenderer.getComponent(UITransform);
            if (uiTransform) {
                return uiTransform.getBoundingBoxToWorld();
            }
        }
        
        // Fallback bounds if no sprite renderer
        const uiTransform = this.node.getComponent(UITransform);
        if (uiTransform) {
            return uiTransform.getBoundingBoxToWorld();
        }

        return new Rect();
    }
}
