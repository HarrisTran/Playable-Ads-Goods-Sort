import { _decorator, Component, Rect, Vec3 } from 'cc';
import { IShelf2, ShelfType, ISpacingData, IDropZone } from '../core/Types';

const { ccclass } = _decorator;

@ccclass('ShelfBase')
export abstract class ShelfBase extends Component implements IShelf2 {
    public abstract get id(): number;
    public abstract get type(): ShelfType;
    public abstract get spacingData(): ISpacingData;
    public abstract get dropZones(): IDropZone[];

    public abstract init(shelfId: number): void;
    public abstract onTopLayerCleared(onCleared?: (pos: Vec3) => void): void;
    
    public abstract getShelfBounds(): Rect;
}
