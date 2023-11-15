import io from 'socket.io-client';

class Connection {
    socket = null;

    getNewSocket() {
        const socket = io(process.env.REACT_APP_SERVER_URL, {
            withCredentials: true
        });
        return this.socket = socket;
    }

    startConnection() {
        const socket = this.socket;
        if (socket) {
            socket.on('connect', () => {
                console.log(socket.id, 'connected');
            });
        } else {
            console.log('Null socket');
        }
    }
    closeConnection() {
        const socket = this.socket;
        if (socket) {
            console.log('Connection closed');
            socket.disconnect();
        }
        else {
            console.log('Null socket');
        }
    }
}

export default Connection;
