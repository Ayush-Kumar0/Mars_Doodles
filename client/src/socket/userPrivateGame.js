import Connection from ".";


class UserPrivateGame {
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
        this.socket.on("provide-private-room", (isAvailable, message) => {
            console.log(isAvailable);
            if (isAvailable && this.socket)
                this.nav(`private/`);
            else if (!isAvailable && message) {
                this.toast.error(message);
            } else {
                this.toast.error("You are not authorized");
            }
        });
    }

    // close the connection when exiting the room
    exitRoom() {
        this.connection.closeConnection();
    }

    // Get into available room or create new one
    createAndJoinRoom() {
        this.socket.emit("get-private-room", {});
    }
}

export default UserPrivateGame;