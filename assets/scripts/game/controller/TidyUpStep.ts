import { ILevelAnimationStep, StateControl } from './LevelAnimationTypes';
import { ILevelDataManager, IShelfItem, ShelfType } from '../../core/Types';
import { GridData, SlideData } from './GridData';
import { DragDropManager } from '../../core/DragDropManager';
import { ShelfBase } from '../ShelfBase';

class MergeData {
    public readonly shelfId: number;
    public readonly items: IShelfItem[];
    public readonly isEmpty: boolean;
    public animDone: number = 0;
    public destroyed: boolean = false;

    constructor(shelfId: number, items: IShelfItem[], isEmpty: boolean) {
        this.shelfId = shelfId;
        this.items = items;
        this.isEmpty = isEmpty;
    }
}

export class TidyUpStep implements ILevelAnimationStep {
    public get canInterrupt(): boolean { return false; }

    private _control: StateControl;
    private _levelDataManager: ILevelDataManager;
    private _gridData: GridData;
    private _dragDropManager: DragDropManager;
    private _onMatchCleared?: (count: number) => void;

    private _merges: MergeData[] = [];
    private _animationsStarted: boolean = false;

    constructor(
        control: StateControl,
        levelDataManager: ILevelDataManager,
        gridData: GridData,
        dragDropManager: DragDropManager,
        onMatchCleared?: (count: number) => void
    ) {
        this._control = control;
        this._levelDataManager = levelDataManager;
        this._gridData = gridData;
        this._dragDropManager = dragDropManager;
        this._onMatchCleared = onMatchCleared;
    }

    public enter(): void {
        this._merges = this.findClearableShelves();

        if (this._merges.length === 0) {
            this._control.toDragDrop();
        }
    }

    public update(dt: number): void {
        if (!this._merges || this._merges.length === 0) return;

        // Phase 1: start bounce animation (skip for empty shelves)
        if (!this._animationsStarted) {
            for (const merge of this._merges) {
                if (merge.isEmpty) {
                    merge.animDone = merge.items.length;
                    continue;
                }

                for (const item of merge.items) {
                    if (item) {
                        item.bounce(() => {
                            merge.animDone++;
                        });
                    }
                }
            }

            this._animationsStarted = true;
        }

        // Phase 2: wait for animation then destroy
        let allDone = true;
        for (const merge of this._merges) {
            // Count valid items instead of array length if there's nulls
            const totalItems = merge.items.filter(i => i !== null).length;
            
            if (merge.animDone < totalItems) {
                allDone = false;
                continue;
            }

            if (!merge.destroyed) {
                if (!merge.isEmpty) {
                    for (const item of merge.items) {
                        if (item) {
                            this._levelDataManager.removeItem(item.meta.id);
                            item.destroyItem(true); // true = play effect
                        }
                    }
                }

                merge.destroyed = true;
                allDone = false;
            }
        }

        if (!allDone) return;

        // Phase 3: deactivate cleared shelves, unregister drop zones, collect slide data
        let allSlides: SlideData[] = [];
        let matchClearCount = 0;
        
        for (const merge of this._merges) {
            if (!merge.isEmpty) {
                matchClearCount++;
            }

            const shelf = this._levelDataManager.getShelf(merge.shelfId);
            if (shelf) {
                for (const dropZone of shelf.dropZones) {
                    this._dragDropManager.unregisterDropZone(dropZone);
                }

                const shelfBase = shelf as ShelfBase;
                shelfBase.node.active = false;
            }

            const slides = this._gridData.onShelfCleared(merge.shelfId);
            allSlides = allSlides.concat(slides);
        }

        if (matchClearCount > 0 && this._onMatchCleared) {
            this._onMatchCleared(matchClearCount);
        }

        this._control.toSlideDown(allSlides);
    }

    public exit(): void {
    }

    private findClearableShelves(): MergeData[] {
        const result: MergeData[] = [];
        const shelves = this._levelDataManager.getShelves();

        for (const shelf of shelves) {
            if (shelf.type !== ShelfType.Common) continue;

            const layer = this._levelDataManager.getLayer(shelf.id, 0);
            if (!layer || layer.length === 0) continue;

            const allEmpty = layer.every(e => e === null);
            if (allEmpty) {
                result.push(new MergeData(shelf.id, layer, true));
                continue;
            }

            const first = layer[0];
            if (!first) continue;

            const canMerge = layer.every(e => e !== null && e.meta.typeId === first.meta.typeId);
            if (canMerge) {
                result.push(new MergeData(shelf.id, layer, false));
            }
        }

        return result;
    }
}
