// src/backend/controllers/gameController.ts
import { GameService } from '../services/gameService.js';
const gameService = new GameService();
export const createGame = (req, res) => {
    const gameId = req.body.gameId;
    const game = gameService.createGame(gameId);
    res.json(game);
};
export const addPlayerShips = (req, res) => {
    const gameId = req.params.gameId;
    const ships = req.body.ships;
    gameService.addPlayerShips(gameId, ships);
    res.status(204).send();
};
// Define other controller functions for making moves, getting game state, etc.
