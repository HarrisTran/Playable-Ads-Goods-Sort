import { _decorator, Component, Node, Sprite, SpriteFrame, Vec3, Color, tween, instantiate, resources, Prefab, ParticleSystem2D, director, Canvas, UITransform, Size, Sorting2D } from 'cc';
import { IShelfItem, ShelfItemMeta, ISpacingData, ShelfLayerDisplay, IShelf2, IDragObject } from '../core/Types';
import { DragObject } from '../core/DragObject';
import { DragDropManager } from '../core/DragDropManager';

const { ccclass, property } = _decorator;

@ccclass('ShelfItemBasic')
export class ShelfItemBasic extends Component implements IShelfItem {
    @property({ type: Sprite })
    public spriteRenderer: Sprite | null = null;

    @property({ type: DragObject })
    public dragObjectComponent: DragObject | null = null;

    public get meta(): ShelfItemMeta { return this._meta; }
    public get currentDisplay(): ShelfLayerDisplay { return this._currentDisplay; }
    public get dragObject(): IDragObject { return this.dragObjectComponent as IDragObject; }

    private _meta!: ShelfItemMeta;
    private _spacingData!: ISpacingData;
    private _currentDisplay: ShelfLayerDisplay = ShelfLayerDisplay.Hidden;
    private _onDestroyCallback!: (meta: ShelfItemMeta) => void;
    private _getSpriteFrame!: (meta: ShelfItemMeta) => SpriteFrame;
    private _shelf!: IShelf2;
    private _originalContentSize: Size | null = null;

    private static _blastPrefabCache: Prefab | null = null;

    public init(
        meta: ShelfItemMeta,
        spacingData: ISpacingData,
        display: ShelfLayerDisplay,
        onDestroy: (meta: ShelfItemMeta) => void,
        getSpriteFrame: (meta: ShelfItemMeta) => SpriteFrame,
        spriteFrame: SpriteFrame,
        shelf: IShelf2,
        dragDropManager: DragDropManager
    ): void {
        this._meta = meta;
        this._spacingData = spacingData;
        this._currentDisplay = display;
        this._onDestroyCallback = onDestroy;
        this._getSpriteFrame = getSpriteFrame;
        this._shelf = shelf;
        
        if (this.spriteRenderer) {
            this.spriteRenderer.spriteFrame = spriteFrame;
            
            // Preserve aspect ratio
            const uiTrans = this.spriteRenderer.node.getComponent(UITransform);
            if (uiTrans && spriteFrame) {
                if (!this._originalContentSize) {
                    this._originalContentSize = uiTrans.contentSize.clone();
                }
                
                const targetSize = this._originalContentSize;
                const frameW = spriteFrame.rect ? spriteFrame.rect.width : (spriteFrame.originalSize ? spriteFrame.originalSize.width : 100);
                const frameH = spriteFrame.rect ? spriteFrame.rect.height : (spriteFrame.originalSize ? spriteFrame.originalSize.height : 100);
                
                if (frameW > 0 && frameH > 0) {
                    const scaleX = targetSize.width / frameW;
                    const scaleY = targetSize.height / frameH;
                    const scale = Math.min(scaleX, scaleY);
                    
                    uiTrans.setContentSize(frameW * scale, frameH * scale);
                }
            }
        }
        this.node.name = `S${meta.shelfId}-L${meta.layerId}-T${meta.typeId}-${meta.id}`;
        
        if (this.dragObjectComponent) {
            // Assign spriteRenderer so drag bounds precisely match the visual sprite
            if (!this.dragObjectComponent.spriteRenderer && this.spriteRenderer) {
                this.dragObjectComponent.spriteRenderer = this.spriteRenderer;
            }
            this.dragObjectComponent.init(meta.id, this.canBeDragged.bind(this), dragDropManager);
        }
    }

    public setPosition(position: Vec3): void {
        this.node.setPosition(position);
    }

    public setShelf(meta: ShelfItemMeta, spacingData: ISpacingData, display: ShelfLayerDisplay): void {
        this._meta = meta;
        this._spacingData = spacingData;
        this._currentDisplay = display;
    }

    public setNewMeta(newMeta: ShelfItemMeta): void {
        this._meta = newMeta;
        if (this.spriteRenderer) {
            const spriteFrame = this._getSpriteFrame(newMeta);
            this.spriteRenderer.spriteFrame = spriteFrame;
            
            // Re-apply preserve aspect ratio
            const uiTrans = this.spriteRenderer.node.getComponent(UITransform);
            if (uiTrans && spriteFrame && this._originalContentSize) {
                const targetSize = this._originalContentSize;
                const frameW = spriteFrame.rect ? spriteFrame.rect.width : (spriteFrame.originalSize ? spriteFrame.originalSize.width : 100);
                const frameH = spriteFrame.rect ? spriteFrame.rect.height : (spriteFrame.originalSize ? spriteFrame.originalSize.height : 100);
                
                if (frameW > 0 && frameH > 0) {
                    const scaleX = targetSize.width / frameW;
                    const scaleY = targetSize.height / frameH;
                    const scale = Math.min(scaleX, scaleY);
                    
                    uiTrans.setContentSize(frameW * scale, frameH * scale);
                }
            }
        }
    }

    public setDisplay(display: ShelfLayerDisplay): void {
        this._currentDisplay = display;
    }

    private canBeDragged(): boolean {
        return this._currentDisplay === ShelfLayerDisplay.Top;
    }

    public resetVisual(): void {
        if (this._currentDisplay === ShelfLayerDisplay.Hidden) {
            this.node.active = false;
            return;
        }

        this.node.active = true;

        const layerOrder = this._currentDisplay;
        const offsetVec2 = this._spacingData.getPosition(layerOrder, this._meta.slotId);
        
        // Z mapping in Cocos is used for UI layering, or setSiblingIndex for 2D.
        // We'll set the position using x and y.
        const offset = new Vec3(offsetVec2.x, offsetVec2.y, 0);

        this.node.setPosition(offset);
        
        if (this.spriteRenderer) {
            this.spriteRenderer.color = ShelfItemBasic.getDisplayColor(this._currentDisplay);
        }
        
        this.node.setScale(Vec3.ONE);
        this.updateSorting();
    }

    public fadeInVisual(duration: number): void {
        if (this._currentDisplay === ShelfLayerDisplay.Top) {
            this.node.active = true;
            const layerOrder = this._currentDisplay;
            const offsetVec2 = this._spacingData.getPosition(layerOrder, this._meta.slotId);
            const offset = new Vec3(offsetVec2.x, offsetVec2.y, 0);

            const targetColor = ShelfItemBasic.getDisplayColor(this._currentDisplay);
            
            this.updateSorting();
            
            // Cocos Tweening
            if (this.spriteRenderer) {
                // Tween Color (Wait for Cocos Creator 3 color tween support, usually handled via any cast or custom property)
                tween(this.spriteRenderer as any)
                    .to(duration, { color: targetColor }, { easing: 'quadOut' })
                    .start();
            }

            tween(this.node)
                .to(0.2, { position: offset }, { easing: 'quadOut' })
                .start();
        }
    }

    public destroyItem(playEffect: boolean): void {
        if (playEffect) {
            // Capture world position before destruction
            const wPos = this.node.worldPosition.clone();
            
            // Load and play effect
            if (!ShelfItemBasic._blastPrefabCache) {
                resources.load('Prefabs/MagicPillarBlastYellow', Prefab, (err, prefab) => {
                    if (err) {
                        console.error("Effect not found", err);
                        return;
                    }
                    ShelfItemBasic._blastPrefabCache = prefab;
                    this.playBlastEffect(wPos);
                });
            } else {
                this.playBlastEffect(wPos);
            }
        }

        tween(this.node).stop();
        if (this.spriteRenderer) tween(this.spriteRenderer as any).stop();

        this._onDestroyCallback(this._meta);
        this.node.destroy();
    }

    private playBlastEffect(wPos: Vec3): void {
        if (!ShelfItemBasic._blastPrefabCache) return;
        
        const effect = instantiate(ShelfItemBasic._blastPrefabCache);
        
        const scene = director.getScene();
        let parentNode: Node | null = null;
        
        if (scene) {
            const canvas = scene.getComponentInChildren(Canvas);
            parentNode = canvas ? canvas.node : scene as any as Node;
        }

        if (parentNode) {
            effect.setParent(parentNode);
            effect.setSiblingIndex(parentNode.children.length - 1);
        }
        
        effect.setWorldPosition(new Vec3(wPos.x, wPos.y + 50, wPos.z)); // Adjust Y offset for UI

        const ps = effect.getComponent(ParticleSystem2D);
        if (ps) {
            ps.resetSystem();
        }
        
        setTimeout(() => {
            if (effect && effect.isValid) effect.destroy();
        }, 1500);
    }

    public bounce(onCompleted?: Function, delay: number = 0): void {
        this.node.setScale(Vec3.ONE);

        const tw = tween(this.node);
        if (delay > 0) {
            tw.delay(delay);
        }

        tw.to(0.07, { scale: new Vec3(0.9, 1.1, 1) })
          .to(0.07, { scale: new Vec3(1.1, 0.9, 1) })
          .to(0.07, { scale: Vec3.ONE })
          .call(() => { if (onCompleted) onCompleted(); })
          .start();
    }

    public jiggly(times: number = 1): void {
        this.node.setScale(Vec3.ONE);
        
        const tw = tween(this.node)
            .to(0.15, { scale: new Vec3(1.1, 0.9, 1) })
            .to(0.15, { scale: Vec3.ONE });
        
        // Loop 'times'
        tween(this.node).repeat(times, tw).start();
    }

    public isGoldenEgg(): boolean {
        return false;
    }

    private static getDisplayColor(display: ShelfLayerDisplay): Color {
        switch (display) {
            case ShelfLayerDisplay.Hidden:
                return new Color(0, 0, 0, 0); // clear
            case ShelfLayerDisplay.Second:
                return new Color(79, 79, 79, 255); // 0.31 * 255
            case ShelfLayerDisplay.Top:
                return new Color(255, 255, 255, 255);
            default:
                return new Color(255, 0, 0, 255);
        }
    }

    public updateSorting(): void {
        const parentSorting = this.node.parent?.getComponent(Sorting2D);
        if (!parentSorting) return;

        let sorting = this.getComponent(Sorting2D);
        if (!sorting) {
            sorting = this.addComponent(Sorting2D);
        }

        let offset = 0;
        if (this._currentDisplay === ShelfLayerDisplay.Top) {
            offset = 10;
        } else if (this._currentDisplay === ShelfLayerDisplay.Second) {
            offset = 5;
        }
        
        if (this._meta.slotId === 1) offset += 1;

        if (sorting) {
            sorting.sortingOrder = parentSorting.sortingOrder + offset;
        }
    }
}
