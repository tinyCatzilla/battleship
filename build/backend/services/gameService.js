// src/backend/services/gameService.ts
import { Game } from '../models/game.js';
import { Board } from '../models/game.js';
export class GameService {
    games;
    // usernames: Map<string, string[]>;
    // make username a map, where the key is gameId and the value is an array of arrays of usernames and statuses
    usernames;
    constructor() {
        this.games = new Map();
        this.usernames = new Map();
    }
    createGame(gameId, username) {
        const game = new Game(gameId);
        this.games.set(gameId, game);
        if (!this.usernames.has(gameId)) {
            this.usernames.set(gameId, [[username, 'notReady']]);
            return;
        }
        // this.usernames.get(gameId)!.push(username);
    }
    joinGame(gameId, username) {
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers += 1;
            var newplayer = new Board();
            game.boards.push(newplayer.board);
            if (!this.usernames.has(gameId)) {
                console.log('fatal error: usernames map does not have gameId key');
            }
            this.usernames.get(gameId).push([username, 'notReady']);
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
            this.usernames.get(gameId)[playerNumber][1] = 'ready';
            game.placeShips(playerNumber, shipCells);
            if (game.playersReady === game.totalPlayers && game.totalPlayers > 1) {
                game.playerTurn = 1;
                return true;
            }
        }
        return false;
    }
    // getTotalPlayers(gameId: string): number {
    //     const game = this.games.get(gameId);
    //     return game ? game.getTotalPlayers : 0;
    // }
    getPlayersReady(gameId) {
        const game = this.games.get(gameId);
        return game ? game.getPlayersReady : 0;
    }
}
