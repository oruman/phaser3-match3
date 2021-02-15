export namespace Match3 {
  // Author: Sergey Voronoy

  declare interface SimpleObject {
    [key: string]: any;
  }

  export const enum cellType {
    empty,
    fall,
    crystal,
    base,
    vertical,
    horizontal,
    bomb
  }

  export declare interface cell {
    type: cellType;
    color?: number;
    fire?: boolean;
    position?: string;
  }

  export declare interface position {
    x: number;
    y: number;
    diff_x?: number;
    diff_y?: number;
  }

  type board = cell[][];

  type IEventCallback<T> = (data: T) => void;

  interface IEventSubscribers {
    [eventType: number]: Array<IEventCallback<any>> | undefined;
  }

  export const enum EventType {
    REFILL,
    CLEAR,
    USE_BOMB,
    USE_HORIZONTAL,
    USE_VERTICAL,
    FALL_EXIT,
    CALCULATE_END,
    NEED_ADD
  }

  export class Game {
    private board: board = [];
    private readonly maxColors: number = 3;
    private readonly defaultArrayOfColors: number[] = [1, 2, 3];
    private arrayHint: string[] = [];
    private nonTestType: cellType[] = [cellType.empty, cellType.fall, cellType.crystal];
    private dispather: EventSystem;
    private isAutoMatch = false;

    constructor(maxColors = 3) {
      this.maxColors = Math.max(this.maxColors, maxColors);
      this.defaultArrayOfColors = [];
      for (let i = 1; i <= this.maxColors; i++) this.defaultArrayOfColors.push(i);
      this.dispather = new EventSystem();
    }

    public start(startBoard: board) {
      this.board = this.refillBoard(startBoard);
      this.dispather.publish(EventType.REFILL, this.getBoard());
    }

    public getBoard(): board {
      return Utils.copyBoard(this.board);
    }

    public probeStep(pos: position): boolean {
      if (this.board[pos.x][pos.y].type === cellType.crystal) return true;
      return this.arrayHint.indexOf([pos.x, pos.y, pos.diff_x || 0, pos.diff_y || 0].join("_")) != -1;
    }

    public makeStep(pos_1: position, pos_2: position) {
      if (
        !(
          (pos_1.x === pos_2.x && Math.abs(pos_1.y - pos_2.y) === 1) ||
          (pos_1.y === pos_2.y && Math.abs(pos_1.x - pos_2.x))
        )
      )
        return;
      const _board = Utils.copyBoard(this.board);
      [_board[pos_2.x][pos_2.y], _board[pos_1.x][pos_1.y]] = [_board[pos_1.x][pos_1.y], _board[pos_2.x][pos_2.y]]; // flip :)
      const types: cellType[] = [];
      types.push(_board[pos_1.x][pos_1.y].type);
      types.push(_board[pos_2.x][pos_2.y].type);
      if (types.indexOf(cellType.crystal) != -1) {
        this.calculateStepCrystal(_board, pos_1, pos_2);
      } else this.calculateStepBase(_board);
      this.isAutoMatch = false;
      this.dispather.publish(EventType.CALCULATE_END, null);
    }

    private calculateStepCrystal(_board: board, pos_1: position, pos_2: position) {
      const clear_all: boolean = _board[pos_1.x][pos_1.y].type == _board[pos_1.x][pos_1.y].type;
      const color = _board[pos_1.x][pos_1.y].color || _board[pos_2.x][pos_2.y].color;
      if (!color && !clear_all) {
        this.calculateStepBase(_board);
        return;
      }
      const all_match: string[] = [];
      all_match.push(`${pos_1.x}_${pos_1.y}`);
      all_match.push(`${pos_2.x}_${pos_2.y}`);
      for (let x = 0; x < _board.length; x++) {
        for (let y = 0; y < _board[x].length; y++) {
          const posStr = Utils.positionToString({ x, y });
          if (clear_all) {
            all_match.push(posStr);
            continue;
          }
          const curColor = _board[x][y].color || 0;
          if (curColor === color) all_match.push(posStr);
        }
      }
      console.log("Use crystal", all_match);
      _board = this.clearBoard(_board, all_match, {});
      this.start(_board);
      this.isAutoMatch = true;
      this.calculateStepBase(Utils.copyBoard(this.board));
    }

    private calculateStepBase(_board: board) {
      const hor_match: string[][] = [];
      const ver_match: string[][] = [];
      for (let y = 0; y < _board[0].length; y++) {
        let match: string[] = [];
        for (let x = 1; x < _board.length; x++) {
          const color_cur = _board[x][y].color || 0;
          const color_prv = _board[x - 1][y].color || 0;
          if (color_cur != 0 && color_cur == color_prv) {
            if (!match.length) match.push([x - 1, y].join("_"));
            match.push([x, y].join("_"));
          } else if (match.length) {
            if (match.length >= 3) hor_match.push(match);
            match = [];
          }
        }
        if (match.length >= 3) hor_match.push(match);
      }
      for (let x = 0; x < _board.length; x++) {
        let match: string[] = [];
        for (let y = 1; y < _board[x].length; y++) {
          const color_cur = _board[x][y].color || 0;
          const color_prv = _board[x][y - 1].color || 0;
          if (color_cur != 0 && color_cur === color_prv) {
            if (!match.length) match.push([x, y - 1].join("_"));
            match.push([x, y].join("_"));
          } else if (match.length) {
            if (match.length >= 3) ver_match.push(match);
            match = [];
          }
        }
        if (match.length >= 3) ver_match.push(match);
      }
      if (!ver_match.length && !hor_match.length) return;

      let all_match: string[] = [];
      const new_el: SimpleObject = {};
      detectCrystalOrLine(hor_match);
      detectCrystalOrLine(ver_match);
      detectBomb();
      detectCrystalOrLine(hor_match, true);
      detectCrystalOrLine(ver_match, true, true);
      all_match = all_match.concat(...hor_match).concat(...ver_match);
      all_match = Utils.removeDuplicates(all_match);

      _board = this.clearBoard(_board, all_match, new_el);
      this.start(_board);
      this.isAutoMatch = true;
      this.calculateStepBase(Utils.copyBoard(this.board));

      function detectCrystalOrLine(_arr: string[][], line = false, ver = false) {
        const length = !line ? 5 : 4;
        const type = !line ? cellType.crystal : ver ? cellType.horizontal : cellType.vertical;
        for (let i = _arr.length - 1; i >= 0; i--) {
          if (_arr[i].length != length) continue;
          const pos = Utils.makeIndexFromHalf((length - 1) / 2);
          new_el[_arr[i][pos]] = type;
          all_match = all_match.concat(_arr[i]);
          _arr.splice(i, 1);
        }
      }

      function detectBomb() {
        for (let i = hor_match.length - 1; i >= 0; i--) {
          for (let j = ver_match.length - 1; j >= 0; j--) {
            const posCross: string = Utils.detectCrossArr(hor_match[i], ver_match[j]);
            if (posCross) {
              new_el[posCross] = cellType.bomb;
              all_match = all_match.concat(hor_match[i]);
              all_match = all_match.concat(ver_match[i]);
              hor_match[i].splice(i, 1);
              ver_match[j].splice(j, 1);
              break;
            }
          }
        }
      }
    }

    private clearBoard(_board: board, match_el: string[], new_el: SimpleObject): board {
      const height: number = _board[0].length;
      const fired: string[] = [];
      const th = this;
      for (let x = 0; x < _board.length; x++) {
        for (let y = 0; y < _board[x].length; y++) {
          if (_board[x][y].type == cellType.fall) continue;
          const pos = { x, y };
          const posStr = Utils.positionToString(pos);
          if (match_el.indexOf(posStr) > -1 && !new_el.hasOwnProperty(posStr)) {
            fired.push(posStr);
            useType(pos);
          }
        }
      }

      for (let i = 0; i < fired.length; i++) {
        const pos: position = Utils.stringToPosition(fired[i]);
        _board[pos.x][pos.y] = { type: cellType.empty };
      }

      if (fired.length)
        this.dispather.publish(
          EventType.CLEAR,
          fired.map((val) => Utils.stringToPosition(val))
        );

      for (const key in new_el) {
        if (!new_el.hasOwnProperty(key)) continue;
        const pos = Utils.stringToPosition(key);
        _board[pos.x][pos.y].type = new_el[key];
        if (_board[pos.x][pos.y].type < cellType.base) delete _board[pos.x][pos.y].color;
      }

      const cntAppend: number[] = [];
      for (let x = 0; x < _board.length; x++) {
        _board[x] = _board[x].filter((value) => {
          return value.type != cellType.empty;
        });
        const diff = height - _board[x].length;
        for (let i = _board[x].length; i < height; i++) _board[x][i] = { type: cellType.empty };
        if (diff > 0) cntAppend[x] = diff;
      }

      // Test on fall
      const fallDownExist: position[] = [];
      for (let x = 0; x < _board.length; x++) {
        if (_board[x][0].type != cellType.fall) continue;
        fallDownExist.push({ x, y: 0 });
        _board[x][0] = { type: cellType.empty };
        _board[x] = _board[x].filter((value) => {
          return value.type != cellType.empty;
        });
        for (let i = _board[x].length; i < height; i++) _board[x][i] = { type: cellType.empty };
        if (!cntAppend[x]) cntAppend[x] = 0;
        cntAppend[x]++;
      }

      if (fallDownExist.length) this.dispather.publish(EventType.FALL_EXIT, fallDownExist);

      if (cntAppend.length) this.dispather.publish(EventType.NEED_ADD, cntAppend);

      if (this.isAutoMatch) console.log("AutoMatch", match_el);
      return _board;

      function useType(_pos: position) {
        switch (_board[_pos.x][_pos.y].type) {
          case cellType.bomb:
            useBomb(_pos);
            break;
          case cellType.horizontal:
            useHorizontal(_pos);
            break;
          case cellType.vertical:
            useVertical(_pos);
            break;
        }
      }

      function useBomb(_pos: position) {
        const start_x = Math.max(_pos.x - 1, 0);
        const end_x = Math.min(_pos.y + 1, _board.length - 1);
        const start_y = Math.max(_pos.x - 1, 0);
        const end_y = Math.min(_pos.y + 1, _board[_pos.x].length - 1);
        const used_cell: position[] = [];
        for (let x = start_x; x <= end_x; x++) {
          for (let y = start_y; y <= end_y; y++) {
            const pos = { x, y };
            const posStr = Utils.positionToString(pos);
            if (
              match_el.indexOf(posStr) > -1 ||
              fired.indexOf(posStr) > -1 ||
              th.nonTestType.indexOf(_board[x][y].type) > -1
            )
              continue;
            fired.push(posStr);
            useType(pos);
            used_cell.push(pos);
          }
        }
        th.dispather.publish(EventType.USE_BOMB, used_cell);
      }

      function useHorizontal(_pos: position) {
        const used_cell: position[] = [];
        for (let x = 0; x < _board.length; x++) {
          const pos = { x, y: _pos.y };
          const posStr = Utils.positionToString(pos);
          if (
            match_el.indexOf(posStr) > -1 ||
            fired.indexOf(posStr) > -1 ||
            th.nonTestType.indexOf(_board[x][_pos.y].type) > -1
          )
            continue;
          fired.push(posStr);
          useType(pos);
          used_cell.push(pos);
        }
        if (used_cell.length) th.dispather.publish(EventType.USE_HORIZONTAL, used_cell);
        console.log("Hor", used_cell);
      }

      function useVertical(_pos: position) {
        const used_cell: position[] = [];
        for (let y = 0; y < _board[_pos.x].length; y++) {
          const pos = { x: _pos.x, y };
          const posStr = Utils.positionToString(pos);
          if (
            match_el.indexOf(posStr) > -1 ||
            fired.indexOf(posStr) > -1 ||
            th.nonTestType.indexOf(_board[_pos.x][y].type) > -1
          )
            continue;
          fired.push(posStr);
          useType(pos);
          used_cell.push(pos);
        }
        if (used_cell.length) th.dispather.publish(EventType.USE_VERTICAL, used_cell);
        console.log("Ver", used_cell);
      }
    }

    private refillBoard(_board: board): board {
      let cnt = 0;
      do {
        try {
          return this._refillBoard(Utils.copyBoard(_board));
        } catch (e) {}
        cnt++;
        console.log("try again party");
      } while (cnt < 5);
      throw new Error("Max count limited");
    }

    private _refillBoard(_board: board): board {
      const newBoard: cell[][] = _board;
      let testOnHints = false;
      for (let x = 0; x < newBoard.length; x++) {
        for (let y = 0; y < newBoard[x].length; y++) {
          if (newBoard[x][y].type !== cellType.empty) continue;
          newBoard[x][y] = {
            type: cellType.base,
            color: 0
          };
          newBoard[x][y].color = this.getColor(Utils.copyBoard(newBoard), x, y);
          testOnHints = true;
        }
      }
      const hints = this.testHint(newBoard);
      if (testOnHints && !hints.length) throw new Error("No hints, may need new refill");
      this.arrayHint = hints;
      return newBoard;
    }

    private testHint(_board: board) {
      const arrayHint: string[] = [];
      for (let x = 0; x < _board.length; x++) {
        for (let y = 0; y < _board[x].length; y++) {
          if (x < _board.length - 1) {
            const testBoard = Utils.copyBoard(_board);
            testBoard[x][y].position = `${x}_${y}`;
            testBoard[x + 1][y].position = `${x + 1}_${y}`;
            [testBoard[x][y], testBoard[x + 1][y]] = [testBoard[x + 1][y], testBoard[x][y]]; // flip :)
            if (this.testCell(testBoard, x, y) || this.testCell(testBoard, x, y, true))
              arrayHint.push([x + 1, y, -1, 0].join("_"));
            if (this.testCell(testBoard, x + 1, y) || this.testCell(testBoard, x + 1, y, true))
              arrayHint.push([x, y, 1, 0].join("_"));
          }
          if (y < _board[x].length - 1) {
            const testBoard = Utils.copyBoard(_board);
            testBoard[x][y].position = `${x}_${y}`;
            testBoard[x][y + 1].position = `${x}_${y + 1}`;
            [testBoard[x][y], testBoard[x][y + 1]] = [testBoard[x][y + 1], testBoard[x][y]]; // flip :)
            if (this.testCell(testBoard, x, y) || this.testCell(testBoard, x, y, true))
              arrayHint.push([x, y + 1, 0, -1].join("_"));
            if (this.testCell(testBoard, x, y + 1) || this.testCell(testBoard, x, y + 1, true))
              arrayHint.push([x, y, 0, 1].join("_"));
          }
        }
      }
      return arrayHint;
    }

    private getColor(_board: cell[][], _x: number, _y: number): number {
      const colors: number[] = Utils.shuffleArray(this.defaultArrayOfColors);
      do {
        _board[_x][_y].color = colors[0];
        if (!this.testCell(_board, _x, _y) && !this.testCell(_board, _x, _y, true)) return colors[0];
        if (colors.length > 1) colors.shift();
        else throw new Error("Wrong party");
      } while (colors.length > 1);
      return colors[0];
    }

    private testCell(_board: cell[][], _x: number, _y: number, useOnY = false): boolean {
      const colors = [];
      const defaultColor = _board[_x][_y].color || 0;
      for (let i = -2; i <= 2; i++) {
        if (i === 0) continue;
        let color = 0;
        if (useOnY) {
          const diffY = _y + i;
          if (diffY >= 0 && diffY < _board[_x].length && this.nonTestType.indexOf(_board[_x][diffY].type) == -1)
            color = _board[_x][diffY].color || 0;
        } else {
          const diffX = _x + i;
          if (diffX >= 0 && diffX < _board.length && this.nonTestType.indexOf(_board[diffX][_y].type) == -1)
            color = _board[diffX][_y].color || 0;
        }
        colors.push(color);
      }
      for (let i = 0; i < colors.length - 1; i++) {
        if (defaultColor == colors[i] && defaultColor == colors[i + 1]) return true;
      }
      return false;
    }

    public subscribe<T>(event: EventType, callback: IEventCallback<T>): IEventCallback<T> {
      return this.dispather.subscribe(event, callback);
    }

    public unsubscribe(event: EventType, callback?: IEventCallback<any>) {
      this.dispather.unsubscribe(event, callback);
    }
  }

  class Utils {
    public static shuffleArray(a: number[]): number[] {
      let b: number[] = [];
      b = b.concat(a);
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    }

    public static copyBoard(_board: cell[][]) {
      return JSON.parse(JSON.stringify(_board));
    }

    public static detectCrossArr(_arr_1: string[], _arr_2: string[]): string {
      for (let i = 0; i < _arr_1.length; i++) {
        if (_arr_2.indexOf(_arr_1[i]) > -1) return _arr_1[i];
      }
      return "";
    }

    public static makeIndexFromHalf(_index: number) {
      if (_index % 1 > 0) _index += Math.round(Math.random()) - 0.5;
      return _index;
    }

    public static removeDuplicates(_arr: any[]) {
      const unique: any[] = [];
      for (let i = 0; i < _arr.length; i++) {
        if (unique.indexOf(_arr[i]) === -1) unique.push(_arr[i]);
      }
      return unique;
    }

    public static positionToString(_pos: position, _useDiff = false): string {
      const arr = [];
      arr.push(_pos.x);
      arr.push(_pos.y);
      if (_useDiff) {
        arr.push(_pos.diff_x);
        arr.push(_pos.diff_y);
      }
      return arr.join("_");
    }

    public static stringToPosition(_str: string): position {
      const arr: string[] = _str.split("_");
      const pos: position = {
        x: parseInt(arr[0], 10),
        y: parseInt(arr[1], 10)
      };
      if (arr.length === 4) {
        pos.diff_x = parseInt(arr[2], 10);
        pos.diff_y = parseInt(arr[3], 10);
      }
      return pos;
    }
  }

  class EventSystem {
    private subscribers: IEventSubscribers = {};

    public publish<T>(event: EventType, data: T): boolean {
      const queue = this.subscribers[event];

      if (!queue) return false;

      for (const cb of queue) cb(data);

      return true;
    }

    public subscribe<T>(event: EventType, callback: IEventCallback<T>): IEventCallback<T> {
      if (!this.subscribers[event]) this.subscribers[event] = [];

      this.subscribers[event]!.push(callback);
      return callback;
    }

    public unsubscribe(event: EventType, callback?: IEventCallback<any>) {
      const subs = this.subscribers[event];

      if (!subs) return;

      if (!callback) {
        this.subscribers[event] = undefined;
      } else {
        this.subscribers[event] = this.subscribers[event]!.filter((subCb) => {
          return subCb !== callback;
        });
      }
    }
  }
}
