const http = require("http");
const WebSocketServer = require("websocket").server
let connection = null;
instances = [];
messages = [];

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
    let actualConnectionInstance = request.resourceURL.query.instance;

    let index = -1;
    let instanceFound = instances.find((elem, i) => {
        index = i;
        return elem.instanceID === actualConnectionInstance;
    })
    if (instanceFound) {
        instanceFound.clients = [...instanceFound.clients, connection];
        instances[index] = instanceFound;
    } else {
        instances.push({ clients: [connection], instanceID: actualConnectionInstance });
    }

    connection.on("open", () => console.log("Opened!!!"))
    connection.on("close", (conn) => console.log("CLOSED!!!", conn))
    connection.on("message", message => {
        message = `${message.utf8Data}`;
        messages.push(message);
        let filteredByIDInstances = instances.find(instance => {
            return instance.instanceID === actualConnectionInstance;
        });
        filteredByIDInstances.clients.forEach(element => {
            element.send(message);
        });
        console.log(`Received message ${message}`)
    })
})