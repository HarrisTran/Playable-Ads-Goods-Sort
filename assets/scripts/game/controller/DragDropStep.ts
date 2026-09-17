import { ILevelAnimationStep } from './LevelAnimation';
import { StateControl } from './LevelAnimation';
import { ILevelDataManager, ShelfLayerDisplay } from '../../core/Types';
import { DragDropManager, DropZoneData } from '../../core/DragDropManager';
import { ShelfBase } from '../ShelfBase';
import { ShelfItemBasic } from '../ShelfItemBasic';
import { DropZone } from '../../core/DropZone';
import { error } from 'cc';

export class DragDropStep implements ILevelAnimationStep {
    public get canInterrupt(): boolean { return true; }

    private _control: StateControl;
    private _levelDataManager: ILevelDataManager;
    private _dragDropManager: DragDropManager;

    constructor(
        control: StateControl,
        levelDataManager: ILevelDataManager,
        dragDropManager: DragDropManager
    ) {
        this._control = control;
        this._levelDataManager = levelDataManager;
        this._dragDropManager = dragDropManager;

        // Register drop zones for all shelves
        const shelves = this._levelDataManager.getShelves();
        for (const shelf of shelves) {
            for (let slotId = 0; slotId < shelf.dropZones.length; slotId++) {
                const sId = slotId;
                const dropZone = shelf.dropZones[slotId];

                if (dropZone instanceof DropZone) {
                    dropZone.setDependencies(shelf, this._levelDataManager);
                }

                const zoneData = new DropZoneData();
                zoneData.zone = dropZone;
                zoneData.onDropped = (itemId: number) => this.onDropped(itemId, shelf.id, sId);
                
                this._dragDropManager.registerDropZone(zoneData);
            }
        }

        // Register drag objects
        const drags = this._levelDataManager.getDrags();
        for (const drag of drags) {
            this._dragDropManager.registerDragObject(drag);
        }
    }

    public enter(): void {
        this._dragDropManager.unpause();
    }

    public update(dt: number): void {
    }

    public exit(): void {
        this._dragDropManager.pause();
    }

    private onDropped(itemId: number, shelfId: number, slotId: number): void {
        const layerId = 0; // Playable ads (and this game mode): always layer 0
        const slotData = this._levelDataManager.getItem(shelfId, layerId, slotId);

        if (!slotData) {
            const item = this._levelDataManager.findItem(itemId) as ShelfItemBasic;
            const shelf = this._levelDataManager.getShelf(shelfId) as ShelfBase;

            item.node.active = false;
            // Reparent
            item.node.setParent(shelf.node);

            // Remove from old shelf
            const prevShelfId = item.meta.shelfId;
            const prevLayerId = item.meta.layerId;
            const prevSlotId = item.meta.slotId;
            this._levelDataManager.setSlotData(prevShelfId, prevLayerId, prevSlotId, null);

            // Place in new shelf
            item.setShelf(
                item.meta.changeSlot(shelfId, layerId, slotId),
                shelf.spacingData,
                ShelfLayerDisplay.Top
            );
            item.resetVisual();
            item.jiggly();

            this._levelDataManager.setSlotData(shelfId, layerId, slotId, item);

            // Transition to TidyUp to check for merge
            this._control.toTidyUp();
        } else {
            if (slotData.meta.id !== itemId) {
                error("Slot already has item, cannot place.");
            }
        }
    }
}
