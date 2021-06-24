'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const passport = require('passport');
const session = require('express-session');
const routes = require('./routes');
const auth = require('./auth');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongodb-session')(session);
const store = new MongoStore({uri: process.env.MONGO_URI, collection: 'sessions'});


app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: true, 
  saveUninitialized: true,
  cookie: {secure: false},
  key: 'express.sid',
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async (client) => {
  const myDatabase = await client.db('boilerplate-advancenode').collection('users');
  routes(app,myDatabase);
  auth(app,myDatabase);

  let currentUsers = 0;
  io.on('connection', (socket) => {
    console.log(socket.request.user.id)
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.username,
      currentUsers,
      connected: true
    });
    console.log('A user has connected');

    socket.on('chat message', message => {
      io.emit('chat message', {name: socket.request.user.username, message});
    })

    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    });
  });

}).catch(err => {
  app.route('/').get((req,res) => {
    res.render(process.cwd() + '/views/pug/index', {title: err, message: 'Unable to login'});
  });
});


function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
