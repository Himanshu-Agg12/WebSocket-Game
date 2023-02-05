const http = require("http");
const app = require("express")();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.listen(9091, () => console.log("Listening on http port 9091"));
const webSocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log("Listening on 9090"));

const clients = {};
const games = {};
const wsServer = new webSocketServer({
  httpServer: httpServer,
});

wsServer.on("request", (request) => {
  //connect
  const connection = request.accept(null, request.origin);
  connection.on("open", () => console.log("Opened!"));
  connection.on("close", () => console.log("Closed!"));
  connection.on("message", (message) => {
    //I have recied the message from the client.
    const result = JSON.parse(message.utf8Data);

    //a new user want to create new game
    if (result.method === "create") {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
      };
      const payLoad = {
        method: "create",
        game: games[gameId],
      };
      const con = clients[clientId].connection;
      con.send(JSON.stringify(payLoad));
    }

    // a user want to join the game
    if (result.method === "join") {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game.clients?.length >= 3) {
        //sorry max players reached!
        return;
      }

      const color = { 0: "Red", 1: "Blue", 2: "Green" }[game.clients?.length];
      game.clients.push({
        clientId: clientId,
        color: color,
      });

      //start the game
      if (game.clients.length === 3) updateGameState();

      const payLoad = {
        method: "join",
        game: game,
      };
      game.clients?.forEach((c) => {
        clients[c.clientId].connection.send(JSON.stringify(payLoad));
      });
    }

    if (result.method === "play") {
      const gameId = result.gameId;
      const ballId = result.ballId;
      const color = result.color;
      let state = games[gameId].state;
      if (!state) state = {};

      state[ballId] = color;
      games[gameId].state = state;
    }
  });

  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  const payLoad = {
    method: "connect",
    clientId: clientId,
  };

  connection.send(JSON.stringify(payLoad));
});

function updateGameState() {
  //{"gameid", fasdfsf}
  for (const g of Object.keys(games)) {
    const game = games[g];
    const payLoad = {
      method: "update",
      game: game,
    };

    game.clients.forEach((c) => {
      clients[c.clientId].connection.send(JSON.stringify(payLoad));
    });
  }

  setTimeout(updateGameState, 500);
}

//Utility function to generate guid
function S4() {
  return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

// then to call it, plus stitch in '4' in the third group
const guid = () =>
  (
    S4() +
    S4() +
    "-" +
    S4() +
    "-4" +
    S4().substring(0, 3) +
    "-" +
    S4() +
    "-" +
    S4() +
    S4() +
    S4()
  ).toLowerCase();
