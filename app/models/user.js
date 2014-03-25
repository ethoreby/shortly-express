var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  links: function() {
    return this.hasMany(Link);
  },

  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      var userPassword = model.get('password');
      bcrypt.hash(userPassword, null, null, function(err, hash){
        model.set('password', hash);
      });
    });
  }
});

module.exports = User; // must be last
