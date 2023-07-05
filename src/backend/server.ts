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
        console.log(messageString);
        if (typeof messageString === 'string') {
            const { type, data } = JSON.parse(messageString);
            async function handleGameAction(type: string, data: any, ws: WS) {
                switch (type) {
                    case 'createGame':
                        await service.createGame(data.gameId);
                        await addToGameClients(data.gameId, ws);
                        currentGameId = data.gameId;
                        console.log('Game created:', data.gameId);
                        await broadcast(data.gameId, { type: 'totalPlayersUpdate', totalPlayers: 1 });
                        break;
                    case 'joinGame':
                        const joinResult = await service.joinGame(data.gameId);
                        await ws.send(JSON.stringify({ type: 'joinGame', success: joinResult.success, playerNumber: joinResult.playerNumber }));
                        if (joinResult.success) {
                            await addToGameClients(data.gameId, ws);
                            currentGameId = data.gameId;
                            console.log('Joined game:', data.gameId);
                            console.log('Broadcasting totalPlayersUpdate');
                            await broadcast(data.gameId, { type: 'totalPlayersUpdate', totalPlayers: service.getTotalPlayers(data.gameId) });
                        }
                        break;
                    case 'leaveGame':
                        const leaveResult = await service.leaveGame(data.gameId, data.playerNumber);
                        // Remove the client from the gameClients map
                        await ws.send(JSON.stringify({ type: 'leaveGame', success: leaveResult.success }));
                        const leavetotalPlayers = await service.getTotalPlayers(data.gameId);
                        await broadcast(data.gameId, { type: 'totalPlayersUpdate', totalPlayers: leavetotalPlayers });
                        break;
                    case 'confirmPlacement':
                        const confirmResult = await service.confirmPlacement(data.gameId, data.playerNumber, data.shipCells);
                        await ws.send(JSON.stringify({ type: 'confirmPlacement', start: confirmResult }));
                        const playersReady = await service.getPlayersReady(data.gameId);
                        await broadcast(data.gameId, { type: 'playersReadyUpdate', playersReady: playersReady });
                        break;
                    case 'fire':
                        // Handle firing logic
                        // ws.send(game.returnstate())
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
