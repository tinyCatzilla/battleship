// src/backend/services/gameService.ts
import { Game } from '../models/game.js';
export class GameService {
    games;
    constructor() {
        this.games = new Map();
    }
    createGame(gameId) {
        const game = new Game(gameId);
        this.games.set(gameId, game);
        return game;
    }
    addPlayerShips(gameId, ships) {
        const game = this.games.get(gameId);
        if (game) {
            game.playerShips = ships;
        }
    }
}
