import { _decorator, Component, Vec2 } from 'cc';
import { ISpacingData } from '../core/Types';

const { ccclass, property } = _decorator;

@ccclass('CommonShelfNormalSpacingData')
export class CommonShelfNormalSpacingData extends Component implements ISpacingData {
    
    @property({ type: [Vec2] })
    public topLayerSlotsPositions: Vec2[] = [
        new Vec2(-100, -100),
        new Vec2(0, -100),
        new Vec2(100, -100)
    ]; // Scaled x100 for UI coords assuming original was world units

    @property({ type: [Vec2] })
    public secondLayerSlotsPositions: Vec2[] = [
        new Vec2(-80, -80),
        new Vec2(0, -80),
        new Vec2(80, -80)
    ]; // Scaled x100

    public getPosition(layerId: number, slotId: number): Vec2 {
        if (slotId < 0 || slotId >= 3) {
            console.error("Offset null, vui lòng check lại");
            return Vec2.ZERO;
        }

        if (layerId < 0 || layerId > 1) {
            console.error(`Sai Layer Id: ${layerId}`);
            return Vec2.ZERO;
        }

        return layerId === 0 ? this.topLayerSlotsPositions[slotId] : this.secondLayerSlotsPositions[slotId];
    }
}
