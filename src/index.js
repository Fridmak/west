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
    constructor() {
        super("Изгой", 2);
    }

    beforeAttack(gameContext, continuation) {
        const target = gameContext.oppositePlayer.table.find(c => c);
        if (!target) return continuation();

        const targetProto = Object.getPrototypeOf(target);
        const stolenProps = ['modifyDealedDamageToCreature', 'modifyDealedDamageToPlayer', 'modifyTakenDamage'];
        
        stolenProps.forEach(prop => {
            if (targetProto.hasOwnProperty(prop)) {
                this[prop] = targetProto[prop];
                delete targetProto[prop];
            }
        });

        gameContext.updateView();
        continuation();
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
