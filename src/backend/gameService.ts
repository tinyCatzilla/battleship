// src/backend/services/gameService.ts

import {Game} from './game.js';
import {Board} from './game.js';

import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

export class GameService {
    games: Map<string, Game>;
    // usernames: Map<string, string[]>;
    // make username a map, where the key is gameId and the value is an array of arrays of usernames and statuses
    usernames: Map<string, [string, string][]>;

    constructor() {
        this.games = new Map();
        this.usernames = new Map();
    }

    escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
    
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }    

    createGame(gameId: string, username: string){
        const window = new JSDOM('').window;
        const DOMPurify = createDOMPurify(window);
        const cleanUsername = DOMPurify.sanitize(username);

        const escapedUsername = this.escapeHtml(cleanUsername);

        const game = new Game(gameId);
        this.games.set(gameId, game);
        if (!this.usernames.has(gameId)) {
                this.usernames.set(gameId, [[escapedUsername, 'notReady']]);
                return;
            }
        // this.usernames.get(gameId)!.push(username);
    }
    
    joinGame(gameId: string, username: string){
        const window = new JSDOM('').window;
        const DOMPurify = createDOMPurify(window);
        const cleanUsername = DOMPurify.sanitize(username);

        const escapedUsername = this.escapeHtml(cleanUsername);

        const game = this.games.get(gameId);
        if (game) {
            if (!this.usernames.has(gameId)) {
                console.log('fatal error: usernames map does not have gameId key')
                return{
                    status: 'error',
                    message: 'usernames map does not have gameId key'
                }
            }
            if (game.started === true) return {success: false, playerNumber: -1}
            game.totalPlayers += 1;
            var newplayer = new Board();
            game.boards.push(newplayer.board); 
            this.usernames.get(gameId)!.push([escapedUsername, 'notReady']);
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
    

    leaveGame(gameId: string, playerNumber: number, isReady: string){
        const game = this.games.get(gameId);
        let justStarted = false;
        if (game) {
            // Get array of usernames for this game
            let usernamesArray = this.usernames.get(gameId);
            game.totalPlayers -= 1;

            if (game.started === false) {
                // Decrement total number of players
                if (isReady === 'ready') game.playersReady -= 1;
                if (usernamesArray) {
                    // Remove the leaving player's username
                    usernamesArray.splice(playerNumber-1, 1);
    
                    // Store back the updated array of usernames in the Map
                    this.usernames.set(gameId, usernamesArray);
                }

                if (game.totalPlayers === 0) {
                    this.games.delete(gameId);
                    this.usernames.delete(gameId);
                }

                if (game.playersReady === game.totalPlayers && game.totalPlayers > 1) {
                    game.playerTurn = 1;
                    game.started = true;
                    justStarted = true;
                }
            }
    
            return {
                success: true,
                playerNumber: playerNumber,
                usernames: usernamesArray,
                totalPlayers: game.totalPlayers,
                started: game.started,
                justStarted: justStarted
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
            console.log(game.playersReady, game.totalPlayers, game.started)
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
        console.log(game?.started);
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
}
