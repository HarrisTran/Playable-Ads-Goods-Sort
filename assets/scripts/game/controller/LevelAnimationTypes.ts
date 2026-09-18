import { SlideData } from './GridData';

export interface ILevelAnimationStep {
    readonly canInterrupt: boolean;
    enter(): void;
    update(dt: number): void;
    exit(): void;
}

export class StateControl {
    public toDragDrop: () => void;
    public toTidyUp: () => void;
    public toSlideDown: (slides: SlideData[]) => void;

    constructor(
        toDragDrop: () => void,
        toTidyUp: () => void,
        toSlideDown: (slides: SlideData[]) => void
    ) {
        this.toDragDrop = toDragDrop;
        this.toTidyUp = toTidyUp;
        this.toSlideDown = toSlideDown;
    }
}
