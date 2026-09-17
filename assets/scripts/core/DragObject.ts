import { _decorator, Component, Node, Sprite, Vec3, Vec2, Color, UITransform, Rect } from 'cc';
import { IDragObject } from './Types';
import { DragDropManager } from './DragDropManager';

const { ccclass, property } = _decorator;

@ccclass('DragObject')
export class DragObject extends Component implements IDragObject {
    @property({ type: Sprite })
    public spriteRenderer: Sprite | null = null;

    @property
    public isDraggable: boolean = true;

    @property
    public returnToOriginal: boolean = true;

    @property
    public useCustomBounds: boolean = true;

    @property({ type: Vec2 })
    public customBounds: Vec2 = new Vec2(100, 180);

    public get id(): number { return this._dragId; }
    public get position(): Vec3 { return this.node.position; }

    private _dragId: number = 0;
    private _originalPosition: Vec3 = new Vec3();
    private _originalParent: Node | null = null;
    private _originalColor: Color = new Color(255, 255, 255, 255);
    private _originalScale: Vec3 = new Vec3();
    private _originalSiblingIndex: number = 0;

    private _isBeingDragged: boolean = false;
    private _canBeDraggedFunc!: () => boolean;
    private _dragDropManager: DragDropManager | null = null;

    protected start() {
        this._originalPosition = this.node.position.clone();
        if (this.spriteRenderer) {
            this._originalColor = this.spriteRenderer.color.clone();
        }
        this._originalScale = this.node.scale.clone();
        this._originalSiblingIndex = this.node.getSiblingIndex();
    }

    public init(id: number, canBeDragged: () => boolean, manager: DragDropManager): void {
        this._dragId = id;
        this._canBeDraggedFunc = canBeDragged;
        this._dragDropManager = manager;
    }

    public containsPosition(position: Vec2): boolean {
        let objectBound: Rect;

        if (this.useCustomBounds) {
            const uiTransform = this.node.getComponent(UITransform);
            if (!uiTransform) return false;
            const worldPos = uiTransform.convertToWorldSpaceAR(new Vec3(0, this.customBounds.y / 2, 0));
            objectBound = new Rect(
                worldPos.x - this.customBounds.x / 2,
                worldPos.y - this.customBounds.y / 2,
                this.customBounds.x,
                this.customBounds.y
            );
        } else {
            objectBound = this.getSpriteBounds();
        }

        return objectBound.contains(position);
    }

    public canBeDragged(): boolean {
        return this.isDraggable && !this._isBeingDragged && this.node.active && (this._canBeDraggedFunc ? this._canBeDraggedFunc() : true);
    }

    public onStartDrag(): void {
        this._isBeingDragged = true;
        this._originalParent = this.node.parent;
        this._originalPosition = this.node.position.clone();

        if (this._dragDropManager && this._dragDropManager.container) {
            const worldPos = this.node.worldPosition.clone();
            this.node.setParent(this._dragDropManager.container);
            this.node.worldPosition = worldPos;
        } else {
            if (this.node.parent) {
                this._originalSiblingIndex = this.node.getSiblingIndex();
                this.node.setSiblingIndex(this.node.parent.children.length - 1);
            }
        }
    }

    public onEndDrag(): void {
        this._isBeingDragged = false;
        if (this.node.parent === this._originalParent) {
            this.node.setSiblingIndex(this._originalSiblingIndex);
        }
    }

    public updatePosition(newPosition: Vec3): void {
        if (this.node && this.node.isValid) {
            this.node.worldPosition = newPosition;
        }
    }

    public applyDragVisuals(): void {
        if (this.spriteRenderer && this._dragDropManager) {
            this.spriteRenderer.color = this._dragDropManager.dragColor;
        }
        if (this._dragDropManager) {
            this.node.setScale(this._dragDropManager.dragScale);
        }
    }

    public resetVisuals(): void {
        if (this.spriteRenderer) {
            this.spriteRenderer.color = this._originalColor;
        }
        this.node.setScale(this._originalScale);
    }

    public returnToOriginalPosition(): void {
        if (this._originalParent && this.node.parent !== this._originalParent) {
            this.node.setParent(this._originalParent);
        }
        this.node.setPosition(this._originalPosition);
        if (this._originalParent) {
            this.node.setSiblingIndex(this._originalSiblingIndex);
        }
    }

    public getOriginalPosition(): Readonly<Vec3> {
        return this._originalPosition;
    }

    public getSpriteBounds(): Rect {
        const uiTransform = this.node.getComponent(UITransform);
        if (uiTransform) {
            return uiTransform.getBoundingBoxToWorld();
        }
        return new Rect(0, 0, 0, 0);
    }

    public shouldReturnToOriginal(): boolean {
        return this.returnToOriginal;
    }

    public setDraggable(draggable: boolean): void {
        this.isDraggable = draggable;
    }
}
