import { Vec3 } from 'cc';

export interface SlideData {
    shelfId: number;
    fromPosition: Vec3;
    toPosition: Vec3;
    toRow: number;
}

export class GridData {
    private _grid: number[][]; // [col][row] -> shelfId, -1 = empty
    private _cellPositions: Vec3[][]; // fixed world/ui space positions
    private _shelfCells: Map<number, { col: number, row: number }>;
    
    private _columnCount: number;
    private _rowCount: number;

    public get columnCount(): number { return this._columnCount; }
    public get rowCount(): number { return this._rowCount; }

    constructor(columnCount: number, rowCount: number) {
        this._columnCount = columnCount;
        this._rowCount = rowCount;
        
        this._grid = new Array(columnCount);
        this._cellPositions = new Array(columnCount);
        this._shelfCells = new Map<number, { col: number, row: number }>();

        for (let c = 0; c < columnCount; c++) {
            this._grid[c] = new Array(rowCount).fill(-1);
            this._cellPositions[c] = new Array(rowCount);
        }
    }

    public registerShelf(shelfId: number, col: number, row: number, worldPosition: Vec3): void {
        this._grid[col][row] = shelfId;
        this._cellPositions[col][row] = worldPosition.clone();
        this._shelfCells.set(shelfId, { col, row });
    }

    public getShelfCell(shelfId: number): { col: number, row: number } | undefined {
        return this._shelfCells.get(shelfId);
    }

    public onShelfCleared(shelfId: number): SlideData[] {
        const cell = this._shelfCells.get(shelfId);
        if (!cell) {
            return [];
        }

        this._grid[cell.col][cell.row] = -1;
        this._shelfCells.delete(shelfId);
        return this.collapseColumn(cell.col);
    }

    private collapseColumn(col: number): SlideData[] {
        const slides: SlideData[] = [];
        let writeRow = 0;

        for (let readRow = 0; readRow < this._rowCount; readRow++) {
            const shelfId = this._grid[col][readRow];
            if (shelfId < 0) continue;

            if (writeRow !== readRow) {
                slides.push({
                    shelfId: shelfId,
                    fromPosition: this._cellPositions[col][readRow],
                    toPosition: this._cellPositions[col][writeRow],
                    toRow: writeRow
                });

                this._grid[col][writeRow] = shelfId;
                this._grid[col][readRow] = -1;
                this._shelfCells.set(shelfId, { col: col, row: writeRow });
            }

            writeRow++;
        }

        return slides;
    }
}
