import Phaser from "phaser";
import PrototypeScene from "~/scenes/PrototypeScene";
import SceneKeys from "~/consts/SceneKeys";
import GameEvents from "~/consts/GameEvents";

export default class Bootstrap extends PrototypeScene {
  create(): void {
    const textStyle: SimpleObject = {
      fontFamily: "serif",
      fontSize: "48px"
    };
    this.add.text(this.centerX, this.centerY, "Loading...", textStyle).setOrigin(0.5, 0.5);

    this.game.events.once(GameEvents.PreloadFinished, this.handlePreloadFinished, this);

    this.scene.run(SceneKeys.Preload);
  }

  handlePreloadFinished() {
    this.scene.stop(SceneKeys.Preload);
    console.log("preload finished");

    this.scene.start(SceneKeys.Game);
  }
}
