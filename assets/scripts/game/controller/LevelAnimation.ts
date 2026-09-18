import { ILevelDataManager } from '../../core/Types';
import { DragDropManager } from '../../core/DragDropManager';
import { GridData, SlideData } from './GridData';
import { DragDropStep } from './DragDropStep';
import { TidyUpStep } from './TidyUpStep';
import { SlideDownStep } from './SlideDownStep';
import { ILevelAnimationStep, StateControl } from './LevelAnimationTypes';
import { log } from 'cc';


export class LevelAnimation {
    private _levelDataManager: ILevelDataManager;
    private _dragDropManager: DragDropManager;
    private _gridData: GridData;
    private _dragDropStep: DragDropStep;
    
    // In original code, CTA threshold triggered the end of the playable ad.
    // For a normal game, we might use this to trigger a win state.
    private _winThreshold: number;

    private _currentStep: ILevelAnimationStep | null = null;
    private _completedMatchCount: number = 0;

    constructor(
        levelDataManager: ILevelDataManager,
        dragDropManager: DragDropManager,
        gridData: GridData,
        winThreshold: number = 5
    ) {
        this._levelDataManager = levelDataManager;
        this._dragDropManager = dragDropManager;
        this._gridData = gridData;
        this._winThreshold = winThreshold;

        const control = new StateControl(
            this.switchToDragDrop.bind(this),
            this.switchToTidyUp.bind(this),
            this.switchToSlideDown.bind(this)
        );

        this._dragDropStep = new DragDropStep(control, levelDataManager, dragDropManager);
        this._currentStep = this._dragDropStep;
    }

    public enter(): void {
        if (this._currentStep) {
            this._currentStep.enter();
        }
    }

    public update(dt: number): void {
        if (this._currentStep) {
            this._currentStep.update(dt);
        }
    }

    public dispose(): void {
        this._currentStep = null;
    }

    private switchToDragDrop(): void {
        if (this._currentStep) {
            this._currentStep.exit();
        }

        if (this._completedMatchCount >= this._winThreshold) {
            this.triggerEndGame();
            this._currentStep = null; // Idle
            return;
        }

        this._currentStep = this._dragDropStep;
        if (this._currentStep) {
            this._currentStep.enter();
        }
    }

    private triggerEndGame(): void {
        this._dragDropManager.pause();
        log("[Game] You Win! Reached match threshold.");
        // We can emit an event here so the UI can show a win popup.
    }

    private switchToTidyUp(): void {
        if (this._currentStep) {
            this._currentStep.exit();
        }

        const control = new StateControl(
            this.switchToDragDrop.bind(this),
            this.switchToTidyUp.bind(this),
            this.switchToSlideDown.bind(this)
        );

        this._currentStep = new TidyUpStep(
            control,
            this._levelDataManager,
            this._gridData,
            this._dragDropManager,
            this.onMatchCleared.bind(this)
        );

        this._currentStep.enter();
    }

    private onMatchCleared(count: number): void {
        this._completedMatchCount += count;
        log(`[Game] Match-3 cleared: +${count}, total: ${this._completedMatchCount}/${this._winThreshold}`);
    }

    private switchToSlideDown(slides: SlideData[]): void {
        if (this._currentStep) {
            this._currentStep.exit();
        }

        const control = new StateControl(
            this.switchToDragDrop.bind(this),
            this.switchToTidyUp.bind(this),
            this.switchToSlideDown.bind(this)
        );

        this._currentStep = new SlideDownStep(
            control,
            this._levelDataManager,
            slides,
            this._gridData.rowCount
        );

        this._currentStep.enter();
    }
}
