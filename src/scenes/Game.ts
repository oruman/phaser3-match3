import PrototypeScene from "~/scenes/PrototypeScene";
import TextureKeys from "~/consts/TextureKeys";
import { Match3 } from "~/lib/match3";
import Pointer = Phaser.Input.Pointer;
import Match3EventType = Match3.EventType;
import Match3cell = Match3.cell;
import Match3cellType = Match3.cellType;
import Match3position = Match3.position;

export default class Game extends PrototypeScene {
  private gemSize = 100;
  private squareSize = 1000;
  private traitPart = 0.15;
  private probePart = 0.4;
  private completePart = this.traitPart * 2;
  private countColumn = 10;
  private countRow = 10;
  private pool!: Phaser.GameObjects.Sprite[][];
  private canPick = false;
  private canDrag = false;
  private isRowDraw = false;
  private isColumnDraw = false;
  private selectedItemOne: SimpleObject = { x: -1, y: -1 };
  private selectedItemTwo: SimpleObject = { x: -1, y: -1 };
  private groupAnimate;

  private Match3Game!: Match3.Game;
  private match3Board!: Match3cell[][];

  create() {
    this.Match3Game = new Match3.Game(6);
    this.Match3Game.subscribe(Match3EventType.REFILL, this.handlerMatch3render.bind(this));
    const back = this.add
      .tileSprite(this.centerX, this.centerY, this.scale.width, this.scale.height, TextureKeys.Background)
      .setName("tiley");
    this.pool = [];
    this.groupAnimate = this.add.group();
    this.input.on("pointerdown", this.startMoving, this);
    this.input.on("pointermove", this.keepMoving, this);
    this.input.on("pointerup", this.stopMoving, this);
    this.Match3Game.start(this.generateClearBoard());
  }

  handlerMatch3render(data: Match3cell[][]) {
    this.match3Board = data;
    this.drawField();
    this.animateAdd();
  }

  generateClearBoard() {
    const ret: Match3cell[][] = [];
    for (let i = 0; i < this.countColumn; i++) {
      const row: Match3cell[] = [];
      for (let j = 0; j < this.countRow; j++) {
        const cell: Match3cell = { type: 0 };
        row.push(cell);
      }
      ret.push(row);
    }
    return ret;
  }

  animateAdd() {
    if (!this.groupAnimate.countActive()) {
      this.canPick = true;
      this.canDrag = false;
      return;
    }
    let maxY = 0;
    this.groupAnimate.children.iterate((child) => {
      maxY = Math.max(maxY, child.y + this.gemSize);
    });
    const duration = Math.max(maxY * 4, 1000);
    this.groupAnimate.children.iterate((child) => {
      this.tweens.add({
        targets: child,
        duration,
        value: this.squareSize,
        ease: Phaser.Math.Easing.Bounce.Out,
        y: {
          getEnd: (target, key, value) => {
            return target.y;
          },
          getStart: (target, key, value) => {
            return target.y - maxY;
          }
        }
      });
    });
    setTimeout(() => {
      this.groupAnimate.clear();
      this.canPick = true;
      this.canDrag = false;
    }, 2500);
  }

  drawField() {
    for (let i = 0; i < this.countRow; i++) {
      for (let j = 0; j < this.countColumn; j++) {
        if (this.pool[i] && this.pool[i][j]) continue;
        const cell: Match3cell = this.getDataFromBoard(j, i);
        const gem = this.add.sprite(0, 0, "gems", this.getFrameFromCell(cell));
        gem.setOrigin(0, 0);
        if (this.pool.length <= i) this.pool.push([]);
        this.pool[i][j] = gem;
        this.gemSetOriginalPosition(j, i);
        this.groupAnimate.add(gem);
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getFrameFromCell(cell: Match3cell) {
    if (cell.type === Match3cellType.bomb) return 19;
    if (cell.type === Match3cellType.crystal) return 20;
    let color = cell.color || 1;
    color -= 1;
    if (cell.type === Match3cellType.vertical) color += 6;
    else if (cell.type === Match3cellType.horizontal) color += 12;
    return color;
  }

  getDataFromBoard(column: number, row: number) {
    return this.match3Board[column][this.convertRowToBoard(row)];
  }

  convertRowToBoard(row: number) {
    return this.countRow - row - 1;
  }

  gemSetOriginalPosition(column: number, row: number): void {
    if (column < 0 || row < 0) return;
    this.pool[row][column].setPosition(this.gemSize * column, this.gemSize * row);
  }

  gemSetPosition(column: number, row: number, diffX: number, diffY: number): void {
    this.pool[row][column].setPosition(this.gemSize * column + diffX, this.gemSize * row + diffY);
  }

  skipSelectedItemOne(): void {
    if (this.selectedItemOne.x >= 0 && this.selectedItemOne.y >= 0)
      this.gemSetOriginalPosition(this.selectedItemOne.x, this.selectedItemOne.y);
    this.selectedItemOne.x = -1;
    this.selectedItemOne.y = -1;
  }

  skipSelectedItemTwo(): void {
    if (this.selectedItemTwo.x >= 0 && this.selectedItemTwo.y >= 0)
      this.gemSetOriginalPosition(this.selectedItemTwo.x, this.selectedItemTwo.y);
    this.selectedItemTwo.x = -1;
    this.selectedItemTwo.y = -1;
  }

  startMoving(pointer: Pointer): void {
    if (!this.canPick) return;
    this.canPick = false;
    const j = Math.floor(pointer.x / this.gemSize);
    const i = Math.floor(pointer.y / this.gemSize);
    if (j < 0 || i < 0 || j >= this.countColumn || i >= this.countRow) return;
    this.canDrag = true;
    this.selectedItemOne.x = j;
    this.selectedItemOne.y = i;
    this.children.bringToTop(this.pool[i][j]);
  }

  keepMoving(pointer: Pointer): void {
    if (!this.canDrag) return;
    const x = Math.min(Math.max(0, pointer.x), this.gemSize * (this.countColumn - 1));
    const y = Math.min(Math.max(0, pointer.y), this.gemSize * (this.countRow - 1));
    const vector = new Phaser.Math.Vector2(x - pointer.downX, y - pointer.downY);
    vector.x = Math.min(Math.max(vector.x, -this.gemSize), this.gemSize);
    vector.y = Math.min(Math.max(vector.y, -this.gemSize), this.gemSize);
    const traitSize = this.gemSize * this.traitPart;
    if (!this.isColumnDraw && !this.isRowDraw) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) {
        if (Math.abs(vector.x) > traitSize) this.isRowDraw = true;
      } else if (Math.abs(vector.y) > traitSize) this.isColumnDraw = true;
    }
    if (this.isRowDraw) vector.y = 0;
    else if (this.isColumnDraw) vector.x = 0;
    this.gemSetPosition(this.selectedItemOne.x, this.selectedItemOne.y, vector.x, vector.y);
    if (this.isRowDraw) {
      if (Math.abs(vector.x) < traitSize) {
        this.skipSelectedItemTwo();
      } else {
        const diff = vector.x / Math.abs(vector.x);
        this.selectedItemTwo.x = this.selectedItemOne.x + diff;
        this.selectedItemTwo.y = this.selectedItemOne.y;
        this.gemSetPosition(this.selectedItemTwo.x, this.selectedItemTwo.y, -vector.x, vector.y);
      }
    } else if (this.isColumnDraw) {
      if (Math.abs(vector.y) < traitSize) {
        this.skipSelectedItemTwo();
      } else {
        const diff = vector.y / Math.abs(vector.y);
        this.selectedItemTwo.x = this.selectedItemOne.x;
        this.selectedItemTwo.y = this.selectedItemOne.y + diff;
        this.gemSetPosition(this.selectedItemTwo.x, this.selectedItemTwo.y, vector.x, -vector.y);
      }
    }
    const probeSize = this.probePart * this.gemSize;
    if (Math.abs(vector.x) > probeSize || Math.abs(vector.y) > probeSize) {
      if (!this.probeMoving()) {
        this.stopMoving();
      }
    }
  }

  stopMoving(): void {
    if (!this.probeMoving()) this.skipSelectedItemTwo();
    this.completeMoving();
    this.canDrag = false;
    this.skipSelectedItemOne();
    this.skipSelectedItemTwo();
    this.isRowDraw = false;
    this.isColumnDraw = false;
    this.canPick = true;
  }

  probeMoving() {
    if (
      this.selectedItemOne.x < 0 ||
      this.selectedItemOne.y < 0 ||
      this.selectedItemTwo.x < 0 ||
      this.selectedItemTwo.y < 0
    )
      return false;
    const diffX = this.selectedItemTwo.x - this.selectedItemOne.x;
    const diffY = this.convertRowToBoard(this.selectedItemTwo.y) - this.convertRowToBoard(this.selectedItemOne.y);
    const positionOne: Match3position = {
      x: this.selectedItemOne.x,
      y: this.convertRowToBoard(this.selectedItemOne.y),
      diff_x: diffX,
      diff_y: diffY
    };
    const positionTwo: Match3position = {
      x: this.selectedItemTwo.x,
      y: this.convertRowToBoard(this.selectedItemTwo.y),
      diff_x: -diffX,
      diff_y: -diffY
    };
    return this.Match3Game.probeStep(positionOne) || this.Match3Game.probeStep(positionTwo);
  }

  completeMoving(): void {
    if (
      this.selectedItemOne.x < 0 ||
      this.selectedItemOne.y < 0 ||
      this.selectedItemTwo.x < 0 ||
      this.selectedItemTwo.y < 0
    )
      return;
    const gemOne = this.pool[this.selectedItemOne.y][this.selectedItemOne.x];
    const gemTwo = this.pool[this.selectedItemTwo.y][this.selectedItemTwo.x];
    const vector = new Phaser.Math.Vector2(
      gemOne.x - this.selectedItemOne.x * this.gemSize,
      gemOne.y - this.selectedItemOne.y * this.gemSize
    );
    const completeSize = this.gemSize * this.completePart;
    if (Math.abs(vector.x) < completeSize && Math.abs(vector.y) < completeSize) return;
    const tempFrame = gemOne.frame;
    gemOne.frame = gemTwo.frame;
    gemTwo.frame = tempFrame;
  }
}
