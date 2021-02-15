import Phaser from "phaser";
import { Plugin as NineSlicePlugin } from "phaser3-nineslice";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  /* width: "100%",
  height: "100%", */
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: "thegame",
    width: 1000,
    height: 1000
  },
  plugins: {
    global: [NineSlicePlugin.DefaultCfg]
  }
};

export default config;
