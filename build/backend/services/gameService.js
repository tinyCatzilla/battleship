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
    }
    joinGame(gameId) {
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers += 1;
            game.boards.push(game.createEmptyBoard());
            return {
                success: true,
                playerNumber: game.totalPlayers
            };
        }
        return {
            success: false,
            playerNumber: -1
        };
    }
    leaveGame(gameId, playerNumber) {
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers -= 1;
            game.boards.splice(playerNumber, 1);
            return {
                success: true,
                playerNumber: game.totalPlayers
            };
        }
        return {
            success: false,
            playerNumber: -1
        };
    }
    confirmPlacement(gameId, playerNumber, shipCells = []) {
        const game = this.games.get(gameId);
        if (game) {
            game.playersReady += 1;
            game.placeShips(playerNumber, shipCells);
            if (game.playersReady === game.totalPlayers && game.totalPlayers > 1) {
                game.playerTurn = 1;
                return true;
            }
        }
        return false;
    }
    getTotalPlayers(gameId) {
        const game = this.games.get(gameId);
        return game ? game.getTotalPlayers : 0;
    }
    getPlayersReady(gameId) {
        const game = this.games.get(gameId);
        return game ? game.getPlayersReady : 0;
    }
}
