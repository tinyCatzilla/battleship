// src/backend/services/gameService.ts

import { Game} from '../models/game.js';

export class GameService {
    private games: Map<string, Game>;

    constructor() {
        this.games = new Map();
    }

    createGame(gameId: string){
        const game = new Game(gameId);
        this.games.set(gameId, game);
    }

    joinGame(gameId: string){
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers += 1;
            game.boards.push(game.createEmptyBoard()); 
            return {
                success: true,
                playerNumber: game.totalPlayers
            }
        }
        return {
            success: false,
            playerNumber: -1
        }
    }
    

    leaveGame(gameId: string, playerNumber: number){
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers -= 1;
            game.boards.splice(playerNumber, 1);
            return{
                success: true,
                playerNumber: game.totalPlayers
            }
        }
        return{
            success: false,
            playerNumber: -1
        }
    }

    confirmPlacement(gameId: string,
        playerNumber: number,
        shipCells: { row: number, column: number, shipId: number }[] = [])
    {
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

    getTotalPlayers(gameId: string): number {
        const game = this.games.get(gameId);
        return game ? game.getTotalPlayers : 0;
    }

    getPlayersReady(gameId: string): number {
        const game = this.games.get(gameId);
        return game ? game.getPlayersReady : 0;
    }


    // Add other methods to manage the game state (e.g., make a move, check for win/lose, etc.)
}
