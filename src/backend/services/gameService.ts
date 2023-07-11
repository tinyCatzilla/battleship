// src/backend/services/gameService.ts

import { get } from 'http';
import {Game} from '../models/game.js';
import {Board} from '../models/game.js';
import {Cell} from '../models/game.js';

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
                return{
                    status: 'error',
                    message: 'usernames map does not have gameId key'
                }
            }
            this.usernames.get(gameId)!.push([username, 'notReady']);
            if (game.started === true) return {success: false, playerNumber: -1}
            return {
                success: true,
                playerNumber: game.totalPlayers
            }
        }
        return{
            status: 'error',
            message: 'Game not found'
        }
    }
    

    leaveGame(gameId: string, playerNumber: number){
        const game = this.games.get(gameId);
        if (game) {
            // Get array of usernames for this game
            let usernamesArray = this.usernames.get(gameId);

            if (game.started === false) {
                // Decrement total number of players
                game.totalPlayers -= 1;
                if (usernamesArray) {
                    // Remove the leaving player's username
                    usernamesArray.splice(playerNumber, 1);
    
                    // Store back the updated array of usernames in the Map
                    this.usernames.set(gameId, usernamesArray);
                }

                if (game.totalPlayers === 0) {
                    this.games.delete(gameId);
                    this.usernames.delete(gameId);
                }
            }
    
            return {
                success: true,
                playerNumber: game.totalPlayers,
                usernames: usernamesArray,
                totalPlayers: game.totalPlayers
            };
        }
        return {
            status: 'error',
            message: 'Game not found'
        };
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
        game.choosePlayerTurn();
        var turn = game.playerTurn;
        game.started = true;
        return {turn: turn};
    }

    fire(gameId: string, opponentNumber: number, row: number, column: number) {
        const game = this.games.get(gameId);
        if (!game) { return { status: 'error', message: 'Game not found' };  }
    
        var opponentBoard = game.boards[opponentNumber];
        if (opponentBoard[row][column].isHit) {
            console.log('FRONTEND/BACKEND DESYNC: cell already hit');
            return { status: 'error', message: 'cell already hit' };
        }
    
        if (opponentBoard[row][column].hasShip) {
            opponentBoard[row][column].isHit = true;
            const cell = game.getShipCell(opponentNumber, row, column);
            if (!cell) { return { status: 'error', message: 'Cell not found' }; }
            const shipId = cell.shipId;
            game.remaining[opponentNumber][shipId]--;
            const isSunk = game.remaining[opponentNumber][shipId] === 0;
            const isGameOver = game.isGameOver(opponentNumber);
            
            let sunkShipCells: { row: number, column: number, shipId: number }[] = [];
    
            if (isSunk) {
                const shipCells = game.allshipCells.get(opponentNumber);
                if (shipCells) {
                    sunkShipCells = shipCells.filter(cell => cell.shipId === shipId);
                }
            }
    
            game.boards[opponentNumber] = opponentBoard;
            return {hit: true, sunk: isSunk, sunkShipCells, gameOver: isGameOver};
        }
        else {
            opponentBoard[row][column].isHit = true;
            game.boards[opponentNumber] = opponentBoard;
            return {hit: false, sunk: false, gameOver: false};
        }
    }
    
    
    // Add other methods to manage the game state (e.g., make a move, check for win/lose, etc.)
}
