import Connection from ".";

class PublicGame {
    connection;
    constructor() {
        this.connection = new Connection();
        this.connection.getNewSocket();
    }

    getRoom() {
        console.log("Got room");
    }
}

export default PublicGame;