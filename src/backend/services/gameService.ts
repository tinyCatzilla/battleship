// src/backend/services/gameService.ts

import {Game} from '../models/game.js';
import {Board} from '../models/game.js';

export class GameService {
    games: Map<string, Game>;
    // usernames: Map<string, string[]>;
    // make username a map, where the key is gameId and the value is an array of arrays of usernames and statuses
    usernames: Map<string, [string, string][]>;

    constructor() {
        this.games = new Map();
        this.usernames = new Map();
    }

    createGame(gameId: string, username: string){
        const game = new Game(gameId);
        this.games.set(gameId, game);
        if (!this.usernames.has(gameId)) {
                this.usernames.set(gameId, [[username, 'notReady']]);
                return;
            }
        // this.usernames.get(gameId)!.push(username);
    }

    joinGame(gameId: string, username: string){
        const game = this.games.get(gameId);
        if (game) {
            game.totalPlayers += 1;
            var newplayer = new Board();
            game.boards.push(newplayer.board); 
            if (!this.usernames.has(gameId)) {
                console.log('fatal error: usernames map does not have gameId key')
            }
        this.usernames.get(gameId)!.push([username, 'notReady']);
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

    confirmPlacement(
        gameId: string,
        playerNumber: number,
        shipCells: { row: number, column: number, shipId: number }[] = [])
    {
        const game = this.games.get(gameId);
        if (game) {
            game.playersReady += 1;
            var gameUsernames = this.usernames.get(gameId);
            gameUsernames![playerNumber - 1][1] = 'ready';
            game.placeShips(playerNumber, shipCells);
            if (game.playersReady === game.totalPlayers && game.totalPlayers > 1) {
                game.playerTurn = 1;
                return {start: true, usernames: gameUsernames};
            }
            return {start: false, usernames: gameUsernames};
        }
        return { status: 'error', message: 'Game not found' };
    }

    getTotalPlayers(gameId: string): number {
        const game = this.games.get(gameId);
        return game ? game.getTotalPlayers : 0;
    }

    getPlayersReady(gameId: string): number {
        const game = this.games.get(gameId);
        return game ? game.getPlayersReady : 0;
    }

    startGame(gameId: string) {
        const game = this.games.get(gameId);
        if (!game) { return { status: 'error', message: 'Game not found' };  }
        var turn = Math.floor(Math.random() * game.totalPlayers+1);
        return {turn: turn};
    }

    fire(gameId: string, opponentNumber: number, cell: { row: number, column: number, shipId: number }) {
        const game = this.games.get(gameId);
        if (!game) { return { status: 'error', message: 'Game not found' };  }
    
        var opponentBoard = game.boards[opponentNumber]
        if (opponentBoard[cell.row][cell.column].isHit) {
            console.log('FRONTEND/BACKEND DESYNC: cell already hit');
            return {hit: false, sunk: false};
        }
    
        if (opponentBoard[cell.row][cell.column].hasShip) {
            opponentBoard[cell.row][cell.column].isHit = true;
            game.remaining[opponentNumber][cell.shipId]--;
            const isSunk = game.remaining[opponentNumber][cell.shipId] === 0;
            const isGameOver = game.isGameOver(opponentNumber);
    
            game.boards[opponentNumber] = opponentBoard;
            return {hit: true, sunk: isSunk, gameOver: isGameOver};
        }
        else {
            opponentBoard[cell.row][cell.column].isHit = true;
            game.boards[opponentNumber] = opponentBoard;
            return {hit: false, sunk: false, gameOver: false};
        }
    }
    // Add other methods to manage the game state (e.g., make a move, check for win/lose, etc.)
}
