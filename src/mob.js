class Creature {
	constructor(x, y) {
		this.x = x;
		this.y = y;

		this.charOnMap = { symbol: "C" };
		this.name = "Someone";

		this._hp = 1;

		// how close the player should be to mob for him to be spotted
		this.sense = 1;
	}

	set hp(newhp) {
		this._hp = newhp;
		if(this instanceof Player)
			document.body.dispatchEvent(new CustomEvent("health-updated"));
	}

	get hp() { return this._hp; }

	act() {
		if(this.hp <= 0) {
			this.die();

			return;
		}

		let fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
			if(game.map[y] == undefined || game.map[y][x] == undefined)
				return false;

			return game.map[y][x] instanceof Blank;
		});

		let x = game.player.x;
		let y = game.player.y;
		var astar = new ROT.Path.AStar(x, y, (x,y) => {
			return game.map[y][x] instanceof Blank;
		},{ topology: 4 });

		fov.compute(this.x, this.y, this.sense, (x, y, r) => {
			let player = game.player;
			if(x == player.x && y == player.y) {
				let pathToPlayer = [];

				astar.compute(this.x, this.y, (x, y) => {
					pathToPlayer.push(game.map[y][x]);
				});

				// select next tile in path to the player
				let targetTile = pathToPlayer[1];
				if(targetTile.creature == player)
					this.attack(player);
				else if(!targetTile.hasCreature())
					this.moveTo(targetTile.x, targetTile.y);
			}
		});
	}

	die() {
		if(this instanceof Player) {
			var audio = new Audio('you_died.mp3');
			audio.play();
		}

		game.map[this.y][this.x].creature = null;

		for(let i in game.mobs) {
			if(game.mobs[i] == this)
				game.mobs.splice(i, 1);
		}

		game._scheduler.remove(this);

		game.pushToLog(`${this.name} died!`);

		delete this;
	}

	moveTo(x, y) {
		game.map[this.y][this.x].creature = null;

		this.x = x;
		this.y = y;

		game.map[y][x].creature = this;
	}

	attack(player) {
		game.pushToLog(`Waaaghh! ${this.name} attacks ${player.name} for ${this.damage} damage`);
		player.hp -= this.damage;
	}
}

class Ghost extends Creature {
	constructor(x, y) {
		super(x,y);

		this.charOnMap = { symbol: "G", color: "aqua" };
		this.name = "Ghost";
		this.damage = 1;
		this.sense = 10;

		this._hp = 1;
	}

	act() {
		if(this.hp <= 0) {
			this.die();

			return;
		}

		let fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
			if(game.map[y] == undefined || game.map[y][x] == undefined)
				return false;

			return true;
		});

		let x = game.player.x;
		let y = game.player.y;
		var astar = new ROT.Path.AStar(x, y, (x,y) => {
			return game.map[y][x] instanceof Tile;
		},{ topology: 4 });

		fov.compute(this.x, this.y, this.sense, (x, y, r) => {
			let player = game.player;
			if(x == player.x && y == player.y) {
				let pathToPlayer = [];

				astar.compute(this.x, this.y, (x, y) => {
					pathToPlayer.push(game.map[y][x]);
				});

				// select next tile in path to the player
				let targetTile = pathToPlayer[1]; 
				if(targetTile.creature == player)
					this.attack(player);
				else if(!targetTile.hasCreature())
					this.moveTo(targetTile.x, targetTile.y);
			}
		});
	}
}

class Skeleton extends Creature {
	constructor(x, y) {
		super(x, y);

		this.charOnMap = { symbol: "S", color: "white" };
		this.name = "Skeleton";
		this.damage = 2;
		this.sense = 5;

		this._hp = 1;
	}
}

class Minotaur extends Creature {
	constructor(x, y) {
		super(x, y);

		this.charOnMap = { symbol: "M", color: "#800000" };
		this.name = "Minotaur";
		this.damage = 5;
		this.sense = 4;

		this._hp = 20;
	}
}

class Zombie  extends Creature {
	constructor(x, y) {
		super(x, y);

		this.charOnMap = { symbol: "Z", color: "green" };
		this.name = "Zombie";
		this.damage = 1;
		this.sense = 3;

		this._hp = 3;
	}


	_getRandomDirection() {
		// to find possible directions for zombie to go to
		// we get map of his surroundings and filter it
		// to make sure we dont go in to a wall,
		// then we populate the possibleDirections array
		// and pick random element from it
		let possibleDirections = [];

		let surroundings = game.getRange(
			game.map,
			{ x: this.x, y: this.y },
			1);

		for(let row of surroundings) {
			row.filter((tile) => {
				return tile instanceof Blank;
			}).forEach((tile) => {
				possibleDirections.push(tile);
			});
		}

		return ROT.RNG.getItem(possibleDirections);
	}

}
