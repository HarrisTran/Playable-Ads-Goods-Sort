import { _decorator, Component, Node, SpriteAtlas, SpriteFrame, Prefab, instantiate, Vec3, math, error, JsonAsset, UITransform, Sorting2D } from 'cc';
import { CommonShelfNormal } from '../CommonShelfNormal';
import { ShelfItemBasic } from '../ShelfItemBasic';
import { DragDropManager } from '../../core/DragDropManager';
import { ILevelDataManager, IShelf2, IShelfItem, ShelfItemMeta, ShelfLayerDisplay, IDropZone } from '../../core/Types';
import { DropZone } from '../../core/DropZone';
import { LevelDataManager, LevelData } from '../../core/LevelDataManager';
import { GridData } from './GridData';
import { LevelAnimation } from './LevelAnimation';

const { ccclass, property } = _decorator;

interface PlayableAdLevelDef {
    shelves: { slots: number[] }[];
}

@ccclass('GameController')
export class GameController extends Component {
    @property
    public winThreshold: number = 5;

    @property
    public columnCount: number = 5;

    @property
    public rowCount: number = 4;

    @property({ type: Prefab })
    public shelfPrefab: Prefab | null = null;

    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    @property({ type: SpriteAtlas })
    public spriteAtlas: SpriteAtlas | null = null;

    @property({ type: DragDropManager })
    public dragDropManager: DragDropManager | null = null;

    @property
    public emptySlot: number = 6;

    @property({ type: JsonAsset, tooltip: 'Tùy chọn' })
    public levelJsonFile: JsonAsset | null = null;

    @property({ type: Node })
    public shelfContainer: Node | null = null;

    private _levelAnimation: LevelAnimation | null = null;
    private _levelDataManager: ILevelDataManager | null = null;
    private _spriteMap: Map<number, SpriteFrame> = new Map();

    private readonly DELTA_X = 190; // Need to adjust this to fit Canvas pixel size
    private readonly DELTA_Y = 110;

    protected onLoad() {
        if (!this.shelfPrefab) {
            error("ShelfPrefab chưa được gán");
            return;
        }

        if (!this.dragDropManager) {
            error("DragDropManager chưa được gán");
            return;
        }

        if (!this.shelfContainer) {
            this.shelfContainer = this.node;
        }

        this.loadSprites();
        if (this._spriteMap.size === 0) {
            error("SpriteAtlas rỗng hoặc chưa gán");
            return;
        }

        let totalShelves = this.columnCount * this.rowCount;
        const slotsPerShelf = 3;

        let distribution: number[];
        if (this.levelJsonFile) {
            distribution = this.loadDistributionFromJson();
            totalShelves = Math.floor(distribution.length / slotsPerShelf);
            this.rowCount = Math.floor(totalShelves / this.columnCount);
        } else {
            distribution = this.generateDistribution(totalShelves, slotsPerShelf);
        }

        const generatedShelves = this.generateShelfGrid();

        const gridData = new GridData(this.columnCount, this.rowCount);
        const allShelves: IShelf2[] = new Array(totalShelves);

        // allShelvesItems[shelfId][layerId][slotId]
        const allShelvesItems: (IShelfItem | null)[][][] = new Array(totalShelves);
        let itemId = 0;

        for (let col = 0; col < this.columnCount; col++) {
            for (let row = 0; row < this.rowCount; row++) {
                const shelfIndex = col * this.rowCount + row;
                const shelf = generatedShelves[col][row];

                shelf.init(shelfIndex);
                // We use Node position which is relative to the container for Grid Data tracking
                gridData.registerShelf(shelfIndex, col, row, shelf.node.position);
                allShelves[shelfIndex] = shelf;

                allShelvesItems[shelfIndex] = [];
                allShelvesItems[shelfIndex][0] = new Array(slotsPerShelf).fill(null);

                for (let slotId = 0; slotId < slotsPerShelf; slotId++) {
                    const typeId = distribution[shelfIndex * slotsPerShelf + slotId];
                    if (typeId === 0) {
                        continue;
                    }

                    const meta = new ShelfItemMeta(shelfIndex, 0, slotId, typeId, itemId++);
                    const sprite = this._spriteMap.get(typeId);

                    const itemNode = instantiate(this.itemPrefab!);
                    itemNode.setParent(shelf.node);

                    const item = itemNode.getComponent(ShelfItemBasic)!;
                    item.init(
                        meta,
                        shelf.spacingDataComponent!, // Need to access spacingData
                        ShelfLayerDisplay.Top,
                        this.onItemDestroy.bind(this),
                        this.getSprite.bind(this) as (meta: ShelfItemMeta) => SpriteFrame,
                        sprite as SpriteFrame,
                        shelf,
                        this.dragDropManager!
                    );
                    item.resetVisual();

                    allShelvesItems[shelfIndex][0][slotId] = item;
                }
            }
        }

        const levelData = new LevelData(allShelvesItems, allShelves);
        this._levelDataManager = new LevelDataManager(levelData);

        // Init drag drop
        this.dragDropManager.init(this.canAcceptDropInto.bind(this));

        // Create animation
        this._levelAnimation = new LevelAnimation(
            this._levelDataManager,
            this.dragDropManager,
            gridData,
            this.winThreshold
        );
        this._levelAnimation.enter();
    }

    private generateShelfGrid(): CommonShelfNormal[][] {
        const shelves: CommonShelfNormal[][] = [];

        // For UI Canvas, (0,0) of container might be center.
        const startX = -(this.columnCount - 1) * this.DELTA_X / 2.0;
        const startY = -(this.rowCount - 1) * this.DELTA_Y / 2.0 - 200; // Offset down a bit

        for (let col = 0; col < this.columnCount; col++) {
            shelves[col] = [];
            const x = startX + col * this.DELTA_X;
            for (let row = 0; row < this.rowCount; row++) {
                const y = startY + row * this.DELTA_Y;
                const position = new Vec3(x, y, 0);

                const shelfNode = instantiate(this.shelfPrefab!);
                shelfNode.setPosition(position);
                shelfNode.name = `Shelf_C${col}_R${row}`;
                this.shelfContainer!.addChild(shelfNode);

                const shelf = shelfNode.getComponent(CommonShelfNormal)!;
                shelves[col][row] = shelf;
            }
        }

        // Set Sorting2D order: lower rows (closer to camera) → higher sortingOrder → render in front
        for (let col = 0; col < this.columnCount; col++) {
            for (let row = 0; row < this.rowCount; row++) {
                const sorting = shelves[col][row].node.getComponent(Sorting2D);
                if (sorting) {
                    sorting.sortingOrder = row * 100;
                }
            }
        }

        return shelves;
    }

    protected update(dt: number) {
        if (this._levelAnimation) {
            this._levelAnimation.update(dt);
        }
    }

    protected onDestroy() {
        if (this._levelAnimation) {
            this._levelAnimation.dispose();
        }
    }

    private canAcceptDropInto(dropzone: IDropZone): boolean {
        if (!this._levelDataManager) return false;

        const shelf = this._levelDataManager.getShelf(dropzone.shelfId);
        if (!shelf) return false;

        const layer = this._levelDataManager.getTopLayer(dropzone.shelfId);
        if (!layer) return false;
        if (layer.length === 0) return true;
        if (dropzone.slotId < 0 || dropzone.slotId >= layer.length) return false;

        return layer[dropzone.slotId] === null;
    }

    private loadSprites() {
        if (!this.spriteAtlas) return;

        const spriteFrames = this.spriteAtlas.getSpriteFrames();
        this._spriteMap = new Map<number, SpriteFrame>();

        for (let i = 0; i < spriteFrames.length; i++) {
            this._spriteMap.set(i + 1, spriteFrames[i] as SpriteFrame);
        }
    }

    private getSprite(meta: ShelfItemMeta): SpriteFrame | null {
        return this._spriteMap.get(meta.typeId) || null;
    }

    private onItemDestroy(meta: ShelfItemMeta) {
        if (this.dragDropManager) {
            this.dragDropManager.unregisterDragObject(meta.id);
        }
    }

    private loadDistributionFromJson(): number[] {
        if (!this.levelJsonFile) return [];
        const levelDef = this.levelJsonFile.json as PlayableAdLevelDef;
        const items: number[] = [];

        for (const shelf of levelDef.shelves) {
            items.push(...shelf.slots);
        }
        return items;
    }

    private generateDistribution(totalShelves: number, slotsPerShelf: number): number[] {
        const emptySlots = this.emptySlot;
        const totalSlots = totalShelves * slotsPerShelf;
        const numberOfTypes = this._spriteMap.size;

        const groupsNeeded = Math.floor((totalSlots - emptySlots) / slotsPerShelf);

        const items: number[] = [];
        for (let g = 0; g < groupsNeeded; g++) {
            const typeId = (g % numberOfTypes) + 1;
            for (let s = 0; s < slotsPerShelf; s++) {
                items.push(typeId);
            }
        }

        while (items.length < totalSlots) {
            items.push(0);
        }

        // Fisher-Yates shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        this.fixThreeInARow(items, slotsPerShelf);

        return items;
    }

    private fixThreeInARow(items: number[], slotsPerShelf: number) {
        const totalShelves = Math.floor(items.length / slotsPerShelf);

        for (let s = 0; s < totalShelves; s++) {
            const baseIdx = s * slotsPerShelf;
            if (items[baseIdx] !== items[baseIdx + 1] || items[baseIdx + 1] !== items[baseIdx + 2]) {
                continue;
            }

            for (let other = 0; other < items.length; other++) {
                if (Math.floor(other / slotsPerShelf) === s) continue;
                if (items[other] === items[baseIdx]) continue;

                const otherBase = Math.floor(other / slotsPerShelf) * slotsPerShelf;

                // Swap
                [items[baseIdx + 2], items[other]] = [items[other], items[baseIdx + 2]];

                const shelfOk = !(items[baseIdx] === items[baseIdx + 1] && items[baseIdx + 1] === items[baseIdx + 2]);
                const otherOk = !(items[otherBase] === items[otherBase + 1] && items[otherBase + 1] === items[otherBase + 2]);

                if (shelfOk && otherOk) {
                    break;
                }

                // Revert
                [items[baseIdx + 2], items[other]] = [items[other], items[baseIdx + 2]];
            }
        }
    }
}
