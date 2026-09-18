import { ILevelDataManager } from '../../core/Types';
import { SlideData } from './GridData';
import { ShelfBase } from '../ShelfBase';
import { ShelfItemBasic } from '../ShelfItemBasic';
import { tween, Vec3, Sorting2D } from 'cc';
import { ILevelAnimationStep, StateControl } from './LevelAnimationTypes';

export class SlideDownStep implements ILevelAnimationStep {
    public get canInterrupt(): boolean { return false; }

    private static readonly SLIDE_DURATION = 0.3;

    private _control: StateControl;
    private _levelDataManager: ILevelDataManager;
    private _slides: SlideData[];
    private _completedCount: number = 0;
    private _started: boolean = false;
    private _maxRow: number;

    constructor(
        control: StateControl,
        levelDataManager: ILevelDataManager,
        slides: SlideData[],
        maxRow: number
    ) {
        this._control = control;
        this._levelDataManager = levelDataManager;
        this._slides = slides;
        this._maxRow = maxRow;
    }

    public enter(): void {
        if (!this._slides || this._slides.length === 0) {
            this._control.toDragDrop();
            return;
        }

        this._completedCount = 0;
        this._started = true;

        for (const slide of this._slides) {
            const shelf = this._levelDataManager.getShelf(slide.shelfId) as ShelfBase;
            if (!shelf) {
                this._completedCount++;
                continue;
            }

            const targetPos = new Vec3(slide.toPosition.x, slide.toPosition.y, 0);

            tween(shelf.node)
                .to(SlideDownStep.SLIDE_DURATION, { position: targetPos }, { easing: 'quadOut' })
                .call(() => {
                    const sorting = shelf.node.getComponent(Sorting2D);
                    if (sorting) {
                        sorting.sortingOrder = slide.toRow * 100;
                        
                        shelf.node.children.forEach(child => {
                            const item = child.getComponent(ShelfItemBasic);
                            if (item) {
                                item.updateSorting();
                            }
                        });
                    }
                    this._completedCount++;
                })
                .start();
        }
    }

    public update(dt: number): void {
        if (!this._started) return;

        if (this._completedCount >= this._slides.length) {
            this._control.toDragDrop();
        }
    }

    public exit(): void {}
}
