// src/backend/routes/gameRoutes.ts
import express from 'express';
import { createGame, addPlayerShips } from '../controllers/gameController.js';
const router = express.Router();
router.post('/games', createGame);
router.post('/games/:gameId/ships', addPlayerShips);
// Define other routes for making moves, getting game state, etc.
export default router;
