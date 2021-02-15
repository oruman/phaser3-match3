import Phaser from "phaser";

export default class PrototypeScene extends Phaser.Scene {
  protected get calculateZoom() {
    const rect = this.scale.canvasBounds;
    return Math.min(rect.width / 600, rect.height / 600);
  }

  protected get centerX() {
    return this.scale.width / 2;
  }

  protected get centerY() {
    return this.scale.height / 2;
  }
}
