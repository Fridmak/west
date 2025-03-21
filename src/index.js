import Card from './Card.js';
import Game from './Game.js';
import TaskQueue from './TaskQueue.js';
import SpeedRate from './SpeedRate.js';

// Отвечает является ли карта уткой.
function isDuck(card) {
    return card instanceof Duck;
}

// Отвечает является ли карта собакой.
function isDog(card) {
    return card instanceof Dog;
}

function isTrasher(card){
    return card instanceof Trasher;
}

// Дает описание существа по схожести с утками и собаками
function getCreatureDescription(card) {
    if (isDuck(card) && isDog(card)) {
        return 'Утка-Собака';
    }
    if (isDuck(card)) {
        return 'Утка';
    }
    if (isDog(card)) {
        return 'Собака';
    }
    if (isTrasher(card)){
        return 'громила';
    }
    return 'Существо';
}

class Creature extends Card {
    getDescriptions() {
        return [getCreatureDescription(this), ...super.getDescriptions()];
    }
}

class Dog extends Creature {
    constructor() {
        super("Пес-бандит", 3);
    }
}

class Trasher extends Dog {
    constructor() {
        super('Громила', 5);
    }
    
    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const newDamage = Math.max(value - 1, 0);
        if (this.view) {
            this.view.signalAbility(() => {continuation(newDamage);});
        }
    }
    
    getDescriptions() {
        return [...super.getDescriptions(), 'При получении урона получает на 1 меньше'];
    }
}

class Duck extends Creature {
    constructor() {
        super("Мирная утка", 2);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;')
    }
}

class Gatling extends Creature {
    constructor() {
        super("Гатлинг", 6);
    }

    attack(gameContext, continuation) {
        const taskQueue = new TaskQueue();
        const {oppositePlayer} = gameContext;

        taskQueue.push(onDone => this.view.showAttack(onDone));
        
        oppositePlayer.table.forEach((card, index) => {
            taskQueue.push(onDone => {
                if (card) {
                    this.dealDamageToCreature(2, card, gameContext, onDone);
                } else {
                    onDone();
                }
            });
        });

        taskQueue.continueWith(continuation);
    }

    getDescriptions() {
        return [...super.getDescriptions(), 'При атаке наносит 2 урона всем картам противника по очереди'];
    }
}

class Rogue extends Creature {
    constructor(name = "Изгой", maxPower = 2, image) {
        super(name, maxPower, image);
    }

    static get abilitiesToSteal() {
        return ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage'];
    }

    attack(gameContext, continuation) {
        const { currentPlayer, oppositePlayer, updateView } = gameContext;
        const targetCard = oppositePlayer.table.find(card => card);

        if (!targetCard) {
            continuation();
            return;
        }

        if (targetCard instanceof Rogue) {
            this.dealDamageToCreature(this.maxPower, targetCard, gameContext, continuation);
            return;
        }

        const targetProto = Object.getPrototypeOf(targetCard);

        const allCards = [...currentPlayer.table, ...oppositePlayer.table];
        for (const card of allCards) {
            if (card && Object.getPrototypeOf(card) === targetProto) {
                Rogue.abilitiesToSteal.forEach(ability => {
                    if (targetProto.hasOwnProperty(ability)) {
                        this[ability] = targetProto[ability]; 
                        delete targetProto[ability]; 
                    }
                });
            }
        }

        updateView();

        this.dealDamageToCreature(this.maxPower, targetCard, gameContext, continuation);
    }
}

class PseudoDuck extends Dog{
    constructor(name = "Псевдо-утка", maxPower = 3) {
        super(name, maxPower);
    }

    quacks() {
        console.log('quack');
    }

    swims() {
        console.log('float: both;')
    }
    
}

class Lad extends Card {
    constructor() {
        super('Браток', 2);
    }

    static getInGameCount() {
        return this.inGameCount || 0;
    }

    static setInGameCount(value) {
        this.inGameCount = value;
    }

    static getBonus() {
        const count = this.getInGameCount();
        return count * (count + 1) / 2;
    }

    doAfterComingIntoPlay(gameContext, continuation) {
        Lad.setInGameCount(Lad.getInGameCount() + 1);
        super.doAfterComingIntoPlay(gameContext, continuation);
    }

    doBeforeRemoving(continuation) {
        Lad.setInGameCount(Lad.getInGameCount() - 1);
        super.doBeforeRemoving(continuation);
    }

    modifyDealedDamageToCreature(value, toCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(value + bonus);
    }

    modifyTakenDamage(value, fromCard, gameContext, continuation) {
        const bonus = Lad.getBonus();
        continuation(Math.max(value - bonus, 0));
    }

    getDescriptions() {
        const desc = [];
        if (Lad.prototype.hasOwnProperty('modifyDealedDamageToCreature')  || 
            Lad.prototype.hasOwnProperty('modifyTakenDamage')) {
            desc.push('Чем их больше, тем они сильнее');
        }
        return desc.concat(super.getDescriptions());
    }
}

const seriffStartDeck = [
    new Duck(),
    new Duck(),
    new Duck(),
    new Rogue(),
];
const banditStartDeck = [
    new Lad(),
    new Lad(),
    new Lad(),
];
// Создание игры.
const game = new Game(seriffStartDeck, banditStartDeck);

// Глобальный объект, позволяющий управлять скоростью всех анимаций.
SpeedRate.set(1);

// Запуск игры.
game.play(false, (winner) => {
    alert('Победил ' + winner.name);
});
