const http = require("http");
const WebSocketServer = require("websocket").server
const uuid = require('uuid').v4;

let connection = null;
let rooms = [];
let messages = [];

//create a raw http server (this will help us create the TCP which will then pass to the websocket to do the job)
const httpserver = http.createServer((req, res) =>
    console.log("we have received a request"))

//pass the httpserver object to the WebSocketServer library to do all the job, this class will override the req/res 
const websocket = new WebSocketServer({
    "httpServer": httpserver
})

httpserver.listen(8083, () => console.log("My server is listening on port 8083"))

websocket.on("request", request => {

    connection = request.accept(null, request.origin);
    let actualConnectionRoom = '_' + request.resourceURL.query.room;
    let initiaInnerCoords = JSON.parse(request.resourceURL.query.innerCoords);

    let roomFound = rooms[actualConnectionRoom];
    let generatedUuid = uuid();

    let player = {
        connection: connection,
        position: roomFound ?
            percentage(initiaInnerCoords, { x: initiaInnerCoords.x * (3 / 4), y: initiaInnerCoords.y / 2 }, initiaInnerCoords) :
            percentage(initiaInnerCoords, { x: initiaInnerCoords.x / 4, y: initiaInnerCoords.y / 2 }, initiaInnerCoords),
        initialCoords: initiaInnerCoords,
        index: -1
    }

    if (!roomFound) {
        rooms[actualConnectionRoom] = [];
        player.index = 0;
    }
    rooms[actualConnectionRoom][generatedUuid] = {};
    rooms[actualConnectionRoom][generatedUuid].player = player;
    rooms[actualConnectionRoom][generatedUuid].player.index = Object.keys(rooms[actualConnectionRoom]).length - 1;

    console.log(rooms);

    connection.send(JSON.stringify({ uuid: generatedUuid, index: rooms[actualConnectionRoom][generatedUuid].player.index }));
    sendRelevantPositions(actualConnectionRoom);


    connection.on("open", () => console.log("Opened!!!"))
    connection.on("close", (conn) => console.log("CLOSED!!!", conn))
    connection.on("message", message => {
        parsedMessageObj = JSON.parse(message.utf8Data);
        messages.push(parsedMessageObj.message);

        let actualPlayer = { ...rooms[actualConnectionRoom][parsedMessageObj.uuid].player }

        if (actualPlayer.index > -1 && actualPlayer.index < 2) {
            rooms[actualConnectionRoom][parsedMessageObj.uuid].player.position = movePlayer(parsedMessageObj.message, actualPlayer.position);
            sendRelevantPositions(actualConnectionRoom);
        }

        console.log(`Received message ${parsedMessageObj.message}`)
    })

})


sendRelevantPositions = (actualConnectionRoom) => {

    let firstPlayer = Object.values(rooms[actualConnectionRoom]).find((elem, index) => {
        return index === 0;
    })?.player;

    let secondPlayer = Object.values(rooms[actualConnectionRoom]).find((elem, index) => {
        return index === 1;
    })?.player;

    Object.values(rooms[actualConnectionRoom]).forEach(elem => {
        let sentObject = {
            first: percentage(firstPlayer?.initialCoords, firstPlayer?.position, elem.player.initialCoords),
            second: percentage(secondPlayer?.initialCoords, secondPlayer?.position, elem.player.initialCoords),
        }
        elem.player.connection.send(JSON.stringify(sentObject));
        console.log(sentObject);
    });
}

movePlayer = (message, pos) => {

    switch (message) {
        case 'UP':
            return { x: pos.x, y: pos.y - 10 };
        case 'DOWN':
            return { x: pos.x, y: pos.y + 10 };
        case 'LEFT':
            return { x: pos.x - 10, y: pos.y };
        case 'RIGHT':
            return { x: pos.x + 10, y: pos.y };
        case 'STOP':
        default:
            return { x: pos.x, y: pos.y };
    }
}

percentage = (screenDimentions, desiredPos, referringSystemCoords) => {

    // screenDimentions sta desiredPos come referringSystemCoords sta ad x
    let finalPos = {
        x: (desiredPos?.x * referringSystemCoords?.x) / screenDimentions?.x,
        y: (desiredPos?.y * referringSystemCoords?.y) / screenDimentions?.y
    }

    // let finalPos = {
    //     x: (screenDimentions?.x * 100) / desiredPos?.x,
    //     y: (screenDimentions?.y * 100) / desiredPos?.y,
    // }
    // console.log(finalPos);
    return finalPos;
}
