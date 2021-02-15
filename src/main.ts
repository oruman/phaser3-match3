import Phaser from "phaser";
import config from "./config";
import SceneKeys from "~/consts/SceneKeys";
import Bootstrap from "~/scenes/Bootstrap";
import Preload from "~/scenes/Preload";
import Game from "~/scenes/Game";

const game = new Phaser.Game(config);

game.scene.add(SceneKeys.Bootstrap, Bootstrap);
game.scene.add(SceneKeys.Preload, Preload);
game.scene.add(SceneKeys.Game, Game);

game.scene.start(SceneKeys.Bootstrap);
