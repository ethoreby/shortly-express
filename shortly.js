var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var knex = require('knex');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();



app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(partials());
  app.use(express.bodyParser())
  // app.use(express.cookieSession());  //imports from V3
  app.use(express.cookieParser('secret')); //imports from V3
  app.use(express.session()); //imports from V3
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function(req, res) {
  res.render('login');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.get('/restricted', function(req, res) {
  res.render('index');
});

app.get('/create', function(req, res) {
  res.render('index');
});

app.get('/links', function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/login', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username }).fetch().then(function(model) {
    if (model) {
      var sysPassword = model.attributes.password;
      console.log(sysPassword, " ", password);
      if(sysPassword === password) {
        console.log("MATCH!!");
        res.redirect('/restricted');
      }
    } else {
      console.log("REDIRECT");
      res.redirect('/login');
    }
  });

  // if(username === 'demo' && password === 'demo'){
  //   req.session.regenerate(function() {
  //     req.session.user = username;
  //     res.redirect('/restricted');
  //   });
  // }else {
  //   res.redirect('/login');
  // }
});

app.post('/signup', function(req, res) {

  var username = req.body.username;
  var password = req.body.password;

  // db.knex('users').insert({username: username, password: password});

  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      console.log("FOUND USER", found);
      // res.send(200, found.attributes);
    } else {
      var user = new User({
        username: username,
        password: password
      });

      user.save().then(function(newLink) {
        Users.add(newLink);
        res.send(201, newLink);
      });
    }
  });

  // var userDump = db.knex('users').select().then(function(data) {
  //   console.log(data);
  // });
});

app.post('/links', function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
