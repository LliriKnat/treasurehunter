class Player extends Creature {
	constructor(x, y) {
		super(x, y);

		this.charOnMap = { symbol: "@", color: "red" };
		this.name = "You"

		this._hp = 10;

		this.inventory = [];
		this.equipment = {
			hands: new Weapon("fists", null, 0.25, 1),
		};
	}


	draw() {
		game.drawExplored();
		game.drawVicinity();
	}

	act() {
		this.draw();
		if(this.hp <= 0) {
			this.die();
			game.engine.lock();
			return;
		}
		game.engine.lock();
		window.addEventListener("keydown", this);
	}

	get damage() { return this.equipment.hands.damage; }
	get range() { return this.equipment.hands.range; }

	handleEvent(event) {
		event.preventDefault();

		let keymap = [];
		keymap[ROT.KEYS.VK_SPACE]     = () => { return this.checkBox() };
		keymap[ROT.KEYS.VK_RETURN]    = () => { return this.checkBox() };
		keymap[ROT.KEYS.VK_UP]        = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][0], this.range) : this.moveTo(this.x, this.y - 1)
		};
		keymap[ROT.KEYS.VK_PAGE_UP]   = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][1], this.range) : this.moveTo(this.x + 1, this.y - 1)
		};
		keymap[ROT.KEYS.VK_LEFT]      = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][6], this.range) : this.moveTo(this.x - 1, this.y)
		};
		keymap[ROT.KEYS.VK_RIGHT]     = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][2], this.range) : this.moveTo(this.x + 1, this.y)
		};
		keymap[ROT.KEYS.VK_END]       = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][5], this.range) : this.moveTo(this.x - 1, this.y + 1)
		};
		keymap[ROT.KEYS.VK_DOWN]      = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][4], this.range) : this.moveTo(this.x, this.y + 1)
		};
		keymap[ROT.KEYS.VK_PAGE_DOWN] = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][3], this.range) : this.moveTo(this.x + 1, this.y + 1)
		};
		keymap[ROT.KEYS.VK_HOME]      = (altKey) => {
			return altKey ? this.rangeAttack(ROT.DIRS[8][7], this.range) : this.moveTo(this.x - 1, this.y - 1)
		};
		keymap[ROT.KEYS.VK_E]         = () => { return this.climbDown(); };

		if(keymap[event.keyCode] === undefined)
			return;

		let altKey = false;
		if(event.altKey)
			altKey = true;

		let actionFunc = keymap[event.keyCode];

		// don't waste turn if had error
		let statusCode = actionFunc(altKey);
		if(statusCode) {
			return;
		}

		game.display.draw(this.x, this.y, game.map[this.y][this.x].charOnMap);

		this.draw();

		window.removeEventListener("keydown", this);
		game.engine.unlock();
	}

	// returns status code:
	// 0 : SUCCESS
	// 1 : WALL
	// 2 : OCCUPIED
	// 3 : NEXT LEVEL
	moveTo(x, y) {
		let targetTile = game.map[y][x];	
		if(targetTile instanceof Wall) {
			return 1;
		}

		if(targetTile.hasCreature()) {
			this.attack(x, y);
			return 0;
		}

		game.map[this.y][this.x].creature = null;

		this.x = x;
		this.y = y;

		targetTile.creature = this;

		return 0;
	}

	// returns status code:
	// 0 : LOOT
	// 1 : EMPTY
	checkBox() {
		let tile = game.map[this.y][this.x];

		// check if the has any items on it
		if(tile.isEmpty())
			return 1;

		let item = tile.popItem();
		game.pushToLog(`You pick up ${item.name}`);

		document.body.dispatchEvent(new CustomEvent("inventory-updated", {
			detail: {item: item, index: this.inventory.length}
		}));

		this.inventory.push(item);
		return 0;
	}

	attack(x, y) {
		let target = game.map[y][x].creature;
		if(!target)
			return;

		game.pushToLog(`You attack ${target.name} for ${this.damage} damage.`);
		target.hp -= this.damage;
	}

	// attacks first target in range, if no target found attack air.
	// always wastes a turn
	rangeAttack(direction, r) {
		let attackLine = this.getTilesInDirection(direction, r).filter(tile => {
			return tile instanceof Blank;
		});

		let attackedCreature = false;
		for(let tile of attackLine) {
			if(tile.hasCreature()) {
				this.attack(tile.x, tile.y);
				attackedCreature = true;
				break;
			}
		}

		if(!attackedCreature)
			game.pushToLog(`${this.name} attack air.`);

		return 0;
	}

	equip(item) {
		game.pushToLog(`${this.name} equipped ${item.name}`);
		this.equipment.hands = item;
	}

	getTilesInDirection(direction, r) {
		let tiles = [];
		let currentTile = { x: this.x, y: this.y };

		for(let i = 0; i < r; i++) {
			let tile = this.peekDirection(currentTile, direction);
			if(tile instanceof Wall)
				break;
			tiles.push(tile);
			currentTile = tile;
		}

		return tiles;
	}

	peekDirection(from, direction) {
		return game.map[from.y + direction[1]][from.x + direction[0]];
	}

	climbDown() {
		let tile = game.map[this.y][this.x];
		if(tile instanceof Stairs) {
			window.removeEventListener("keydown", this);
			game.nextLevel();
		} else {
			return 1;
		}
	}
}
