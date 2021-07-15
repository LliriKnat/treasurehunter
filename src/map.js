class Tile {
	constructor(x, y, charOnMap) {
		this.x = x;
		this.y = y;
		this.charOnMap = charOnMap;

		this.explored = false;
		this._creature = null;
	}

	hasCreature() { return this._creature != null; }

	set creature(creature) { this._creature = creature; }
	get creature() { return this._creature; }
}

class Wall extends Tile {
	constructor(x, y) {
		super(x, y, "#");
	}
}

class Blank extends Tile {
	constructor(x, y) {
		super(x, y, ".");
		this._content = [];
	}

	pushItem(item) {
		this._content.push(item);
		if(item.charOnMap)
			this.charOnMap = item.charOnMap;
	}

	popItem() {
		let item = this._content.pop();
		if(this.isEmpty())
			this.charOnMap = ".";

		return item;
	}

	isEmpty() {
		if(this._content.length)
			return false;
		else
			return true;
	}
}

class Stairs extends Tile{
	constructor(x, y) {
		super(x, y, ">");
		this._creature = null;
	}
}
