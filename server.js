var app             = require('express')();
var http            = require('http').Server(app);
var io              = require('socket.io')(http);
var port            = process.env.PORT || 5000;

var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var sessions        = require('./routes/sessions');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(methodOverride());      // simulate DELETE and PUT

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  //res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Origin", "http://localhost:8100");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

// CORS (Cross-Origin Resource Sharing) headers to support Cross-site HTTP requests
//app.all('*', function(req, res, next) {
//  res.header("Access-Control-Allow-Origin", "*");
//  res.header("Access-Control-Allow-Headers", "X-Requested-With");
//  next();
//});

app.get('/sessions', sessions.findAll);
app.get('/sessions/:id', sessions.findById);

// usernames which are currently connected to the chat
var usernames = {};

io.on('connection', function (socket) {
  var addedUser = false;

  socket.on('new message', function (data) {
    socket.broadcast.emit('new message', {
      username: socket.username,
      content: data
    });
  });

  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    addedUser = true;
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username
      });
    }
  });

});

http.listen(port, function () {
  console.log('listening on *:' + port);
});
