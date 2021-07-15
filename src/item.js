class Item {
	constructor(name) {
		this.name = name;
		this.charOnMap = { symbol: "*" };
	}
}

class Weapon extends Item {
	constructor(name, charOnMap, damage = 1, range = 1) {
		super(name);
		this.charOnMap = charOnMap;
		this.damage = damage;
		this.range = range;
	}
}
