import Phaser from "phaser";

export default class PlayGame extends Phaser.Scene {
  constructor() {
    super("PlayGame");
  }

  preload() {
    console.log("WTF");
    this.load.spritesheet("gems", "assets/gems.png", {
      frameWidth: 100,
      frameHeight: 100
    });
    this.load.image("wood", "assets/wood.jpg");
  }

  create() {
    console.log("WTF2");
    this.add.tileSprite(0, 0, this.scale.width, this.scale.height, "wood").setName("tiley");
  }
}
