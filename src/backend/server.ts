import express, { Request, Response } from 'express';
import gameRoutes from './routes/gameRoutes.js';
import { GameService } from './services/gameService.js';
import http from 'http';
import { WebSocketServer } from 'ws';
import WS from 'ws';
import { Game } from './models/game.js';
import { send } from 'process';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Register game routes
app.use('/api', gameRoutes);

// Simple route for testing if the server is running
app.get('/', (req: Request, res: Response) => {
    res.send('Battleship Game Server is running!');
});

// Initialize WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
var service = new GameService;
const gameClients = new Map<string, WS[]>();

wss.on('connection', (ws: WS) => {
    let currentGameId: string | null = null;
    ws.on('message', (message) => {
        const messageString = message.toString();
        if (typeof messageString === 'string') {
            const { type, data } = JSON.parse(messageString);
            handleGameAction(type, data, ws);
            async function handleGameAction(type: string, data: any, ws: WS) {
                switch (type) {
                    case 'createGame':
                        service.createGame(data.gameId, data.username);
                        addToGameClients(data.gameId, ws);
                        console.log(service.usernames.get(data.gameId));
                        ws.send(JSON.stringify({ type: 'createGame', usernames: service.usernames.get(data.gameId) }));
                        console.log('Game created:', data.gameId);
                        break;
                    case 'joinGame':
                        const joinResult = service.joinGame(data.gameId, data.username);
                        const usernames = service.usernames.get(data.gameId);
                        ws.send(JSON.stringify({ type: 'joinGame', success: joinResult.success, playerNumber: joinResult.playerNumber, usernames: usernames }));
                        if (joinResult.success) {
                            addToGameClients(data.gameId, ws);
                            currentGameId = data.gameId;
                            console.log('Joined game:', data.gameId);
                        }
                        break;
                    case 'leaveGame':
                        const leaveResult = service.leaveGame(data.gameId, data.playerNumber);
                        // Remove the client from the gameClients map
                        ws.send(JSON.stringify({ type: 'leaveGame', success: leaveResult.success }));
                        break;
                    case 'confirmPlacement':
                        const confirmPlacement = service.confirmPlacement(data.gameId, data.playerNumber, data.shipCells);
                        console.log('confirmPlacement result:', confirmPlacement);
                        ws.send(JSON.stringify({ type: 'confirmPlacement', start: confirmPlacement.start, usernames: confirmPlacement.usernames }));
                        console.log('sent confirmPlacement result to client');
                        const playersReady = service.getPlayersReady(data.gameId); // this just calls number of players ready, doesnt do anything rn
                        broadcast(data.gameId, { type: 'playersReadyUpdate', playersReady: playersReady });
                        break;
                    case 'startGame':
                        const startGame = service.startGame(data.gameId);
                        const totalPlayers = service.getTotalPlayers(data.gameId);
                        console.log('startGame result:', startGame);
                        ws.send(JSON.stringify({ type: 'startGame', totalPlayers: totalPlayers, turn: startGame.turn}));
                        console.log('sent startGame result to client');
                    case 'fire':
                        // Assuming data is { gameId, opponentNumber, cell }
                        const fireResult = service.fire(data.gameId, data.opponentNumber, data.cell);
                        console.log('fire result:', fireResult);
                        if (fireResult.status === 'error') {
                            // The fire function could not be executed successfully. Respond accordingly.
                            ws.send(JSON.stringify({ type: 'error', message: fireResult.message }));
                            console.log('sent error to client');
                        } else {
                            ws.send(JSON.stringify({ type: 'fire', hit: fireResult.hit, sunk: fireResult.sunk, gameOver: fireResult.gameOver }));
                            console.log('sent fire result to client');
                        }
                        break;
                }
            
                // Handle other messages
                
            }
        }
    });
    ws.on('close', () => {
        if (currentGameId) {
            const clients = gameClients.get(currentGameId);
            if (clients) {
                gameClients.set(currentGameId, clients.filter(client => client !== ws));
            }
        }
    });

    function broadcast(gameId: string, message: any) {
        const clients = gameClients.get(gameId) || [];
        console.log('Broadcasting to game:', gameId, 'Number of clients:', clients.length);
        clients.forEach((client: WS) => {
            if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    function addToGameClients(gameId: string, client: WS) {
        let clients = gameClients.get(gameId);
        if (!clients) {
            clients = [];
            gameClients.set(gameId, clients);
            console.log('First client initialized', gameId);
        }
        clients.push(client);
        console.log('Client added to game:', gameId);
    }
});


// Start the HTTP server
server.listen(3050, () => {
    console.log('Listening on port 3050');
});
