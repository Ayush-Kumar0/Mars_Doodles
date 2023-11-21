import Connection from ".";


class UserPublicGame {
    connection;
    socket;
    static nav;
    static toast;
    // Get connection for the player
    constructor(navigation, toastify, setSocket) {
        this.connection = new Connection();
        this.connection.getNewSocket();
        this.socket = this.connection.socket;
        setSocket(this.socket);
        this.eventListeners();
        this.nav = navigation;
        this.toast = toastify;
    }

    eventListeners() {
        // Event listeners
        this.socket.on("provide-public-room", (isAvailable) => {
            console.log(isAvailable);
            if (isAvailable && this.socket)
                this.nav(`public/`);
            else {
                this.toast.error("You are not authorized");
            }
        });
    }

    // close the connection when exiting the room
    exitRoom() {
        this.connection.closeConnection();
    }

    // Get into available room or create new one
    getRoom() {
        this.socket.emit("get-public-room");
    }
}

export default UserPublicGame;