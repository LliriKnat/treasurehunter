class Game {
	constructor() {
		this.DISPLAY_WIDTH = 69;
		this.DISPLAY_HEIGHT = 49;

		this.display;

		this.engine = null; 
		this._digger = null;
		this._scheduler = null;

		this.map = [];
		for (let i = 0; i < this.DISPLAY_HEIGHT; i++) { 
			this.map[i] = new Array(this.DISPLAY_WIDTH); 
		} 

		this.player;
		this.mobs = [];

		this.log = [];

		this.level = 1;
	}

	pushToLog(string) {
		this.log.push(string);

		document.body.dispatchEvent(new CustomEvent("log-updated"));
	}

	init() {
		this.pushToLog("New Game");

		this.display = new ROT.Display({
			width: this.DISPLAY_WIDTH,
			height: this.DISPLAY_HEIGHT,
			fontSize: 18,
			fontFamily: "Arial",
			forceSquareRatio: true
		});

		document.body.appendChild(this.display.getContainer());

		this.generateMap();

		this._scheduler = new ROT.Scheduler.Simple();

		// adding a player
		let free = this.getBlank(); // free tile for the player
		this.addPlayer(free.x, free.y);

		this._scheduler.add(this.player, true);
		for(let actor of this.mobs) {
			this._scheduler.add(actor, true);
		}

		this.engine = new ROT.Engine(this._scheduler);
		this.engine.start();
	}

	nextLevel() {
		this.pushToLog("Entering the next level");
		this.level++;
		document.body.dispatchEvent(new CustomEvent("level-updated"));

		this.map = [];
		for (let i = 0; i < this.DISPLAY_HEIGHT; i++) {
			this.map[i] = new Array(this.DISPLAY_WIDTH);
		}

		this.clearDisplay();

		this._scheduler.remove(this.player);
		for(let actor of this.mobs) {
			this._scheduler.remove(actor)
		}

		this.generateMap();

		this._scheduler = new ROT.Scheduler.Simple();

		// Select random tile for player to appear in.
		// Can't use moveTo because it can reset the creature
		// on the spot where the player were on the previous level.
		let freeTile = this.getBlank();
		this.player.x = freeTile.x;
		this.player.y = freeTile.y;
		freeTile.creature = this.player;

		this._scheduler.add(this.player, true);
		for(let actor of this.mobs) {
			this._scheduler.add(actor, true);
		}

		this.engine = new ROT.Engine(this._scheduler);
		this.engine.start();
	}

	generateMap() {
		this._digger = new ROT.Map.Digger(
			this.DISPLAY_WIDTH,
			this.DISPLAY_HEIGHT,
			{
				//roomWidth: [2, 15],
				//roomHeight: [2, 15]
			});

		let blankTiles = [];

		let digCallback = function (x, y, value) {
			// if (value) { return; } /* do not store walls */
			if (value) {
				this.map[y][x] = new Wall(x, y);
			} else {
				let tile = new Blank(x, y);
				this.map[y][x] = tile;
				blankTiles.push(tile);
			}
		}
		this._digger.create(digCallback.bind(this));

		this.addStairs(blankTiles);
		this.generateBoxes(10, blankTiles);
		this.generateMobs(3 * this.level, blankTiles);
	}

	drawExplored() {
		for(let row = 0; row < this.DISPLAY_HEIGHT; row++) {
			for(let col = 0; col < this.DISPLAY_WIDTH; col++) {
				let tile = this.map[row][col];
				if(tile.explored)
					this.display.draw(col, row, tile.charOnMap, "#737373");
			}
		}
	}

	clearDisplay() {
		for(let row = 0; row < this.DISPLAY_HEIGHT; row++) {
			for(let col = 0; col < this.DISPLAY_WIDTH; col++) {
				this.display.draw(col, row, "", "black");
			}
		}

	}

	drawVicinity() {
		let fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
			if(this.map[y] == undefined || this.map[y][x] == undefined)
				return false;

			return this.map[y][x] instanceof Blank
			       || this.map[y][x] instanceof Stairs;
		});

		fov.compute(this.player.x, this.player.y, 5, (x, y, r) => {
			let tile = this.map[y][x];
			tile.explored = true;
			this.display.draw(x, y, tile.charOnMap);

			if(tile.creature) {
				this.display.draw(
					x, y,
					tile.creature.charOnMap.symbol,
					tile.creature.charOnMap.color);
			}
		});
	}

	drawWholeMap() {
		for(let row = 0; row < this.DISPLAY_HEIGHT; row++) {
			for(let col = 0; col < this.DISPLAY_WIDTH; col++) {
				this.display.draw(col, row, this.map[row][col].charOnMap);
			}
		}
	}

	drawMap() {
		let displayCenter = {
			x: Math.floor(this.DISPLAY_WIDTH / 2),
			y: Math.floor(this.DISPLAY_HEIGHT / 2)
		};

		let isInRangeOfPlayer = (coords) => {
		let parts = coords.split(",");
		let point = {
			x: parts[0],
			y: parts[1]
		};

		return this.isInRange(
			point,
			{
				x: this.player.x,
				y: this.player.y
			},
			Math.ceil(this.DISPLAY_WIDTH / 2),
			Math.ceil(this.DISPLAY_HEIGHT / 2),
		);
		};

		let localMap = {};
		Object.keys(this.map)
			.filter(isInRangeOfPlayer)
			.forEach((key) => {
				localMap[key] = this.map[key];
			});

		let displayMap = {};

		let tempx = parseInt(Object.keys(localMap)[0].split(",")[0]);
		let tempy = parseInt(Object.keys(localMap)[0].split(",")[1]);
		for (let key in localMap) {
			let parts = key.split(",");
			let x = parseInt(parts[0]);
			let y = parseInt(parts[1]);
			x -= tempx;
			y -= tempy;
			displayMap[x + "," + y] = localMap[key];
		}

		console.log(displayMap);



		for (let key in displayMap) {
			let parts = key.split(",");
			let x = parseInt(parts[0]);
			let y = parseInt(parts[1]);
			this.display.draw(x, y, displayMap[key]);
		}
	}

	// returns random free blank tile
	getBlank() {
		let blanks = this.map.flat().filter(tile => {
			if(tile instanceof Blank)
				return !tile.hasCreature();
			else
				return false;
		});

		return ROT.RNG.getItem(blanks);
	}

	// checks if pointA is in range from center
	isInRange(point, center, rangeX, rangeY) {
		if (arguments.length < 4)
		rangeY = rangeX;

		if ((point.x > (center.x - rangeX)
			&& (point.x < (center.x + rangeX)
			&& (point.y > (center.y - rangeY)
			&& (point.y < (center.y + rangeY))))))
			return true;
		else
			return false;
	}

	// returns all tiles that are in range from center
	getRange(mx, center, range) { // TODO add test if range goes out of mx' bounds
		let localMap = [];
		for (let i = 0; i < range * 2 + 1; i++) {
			localMap[i] = new Array(range * 2 + 1);
		}

		for(let y = center.y - range, i = 0; y < center.y + range + 1; y++, i++) {
			for(let x = center.x - range, j = 0; x < center.x + range + 1; x++, j++) {
				localMap[i][j] = mx[y][x];
			}
		}

		return localMap;
	}

	addPlayer(x, y) {
		this.player = new Player(x, y);
		this.map[y][x].creature = this.player;

		document.body.dispatchEvent(new CustomEvent("health-updated"));
	}

	generateBoxes(number, blankTiles) {
		let items = [
			new Weapon("Longsword", "l", 2, 1),
			new Weapon("Bow", "b", 0.5, 5),
			new Weapon("Dagger", "d", 1, 1),
			new Weapon("Claymore", "c", 3, 2),
			new Weapon("Axe", "a", 4, 1),
			new Weapon("Crossbow", "x", 1.5, 4),
			new Weapon("Mace", "m", 3.5, 1),
		];
		for(let i = 0; i < number; i++) {
			let free = this.getBlank();
			free.pushItem(ROT.RNG.getItem(items));
		}
	}

	generateMobs(number, blankTiles) {
		for(let i = 0; i < number; i++) {
			let free = this.getBlank();

			let moblist = [
				new Zombie(free.x, free.y),
				new Ghost(free.x, free.y),
				new Skeleton(free.x, free.y),
				new Minotaur(free.x, free.y)
			];

			let mob = ROT.RNG.getItem(moblist);
			this.map[free.y][free.x].creature = mob;

			this.mobs.push(mob);
		}
	}

	addStairs(blankTiles) {
		let free = this.getBlank();
		this.map[free.y][free.x] = new Stairs(free.x, free.y);
	}
}
