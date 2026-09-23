import { _decorator, Component, Node, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('EndCardUI')
export class EndCardUI extends Component {
    @property({ type: Node, tooltip: 'Nút tải game để zoom to nhỏ' })
    public buttonNode: Node | null = null;

    public show(): void {
        this.node.active = true;
        if (this.buttonNode) {
            // Đảm bảo scale về mặc định trước khi chạy tween
            this.buttonNode.setScale(new Vec3(1, 1, 1));
            
            // Tween loop phóng to thu nhỏ
            tween(this.buttonNode)
                .to(0.5, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.5, { scale: new Vec3(1, 1, 1) })
                .union()
                .repeatForever()
                .start();
        }
    }

    public hide(): void {
        this.node.active = false;
        if (this.buttonNode) {
            tween(this.buttonNode).stop();
        }
    }

    public onDownloadClicked(): void {
        console.log("Download button clicked!");
        // Gọi API của plugin ở đây sau (ví dụ: window.open(storeUrl))
    }
}
