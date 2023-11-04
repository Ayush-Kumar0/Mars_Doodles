const fs = require('fs');
require('dotenv').config();

// Server related
const express = require('express');
const app = express();

// Body parsing
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// Database
const mongoose = require('mongoose');
const db = require('./config/mongoose');

const cors = require('cors');


/*====================================================================================================================================*/

// Allowing Cors
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Parsing the Body {application/json  and  application/x-www-form-urlencoded}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Parsing the Cookies
app.use(cookieParser());


// Using Routes
app.use('/', require('./routes'));


// Listening to the port
const port = process.env.PORT || 8000;
const server = app.listen(port, (err) => {
  if (err)
    console.log(`Error while starting server.`);
  else
    console.log(`Server started at http://localhost:${port}`);
});


// Using Sockets
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    allowedHeaders: ['Cookie']
  }
});
require('./sockets/index')(io);