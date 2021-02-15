import TextureKeys from "~/consts/TextureKeys";
import GameEvents from "~/consts/GameEvents";

export default class Preload extends Phaser.Scene {
  preload() {
    this.load.image(TextureKeys.Border, "assets/border.png");
    this.load.image(TextureKeys.Background, "assets/wood.jpg");
    this.load.spritesheet(TextureKeys.Gems, "assets/gems.png", {
      frameWidth: 100,
      frameHeight: 100
    });
  }

  create() {
    this.game.events.emit(GameEvents.PreloadFinished);
  }
}
