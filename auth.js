require('dotenv').config()
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const GithubStrategy = require('passport-github');

module.exports = (app,myDatabase) => {
  passport.serializeUser((user, done) => {
    done(null,user._id);
  });

  passport.deserializeUser((id, done) => {
    myDatabase.find({_id: new ObjectID(id)}, (err, doc) => {
      done(null,doc);
    })
  });

  passport.use(new LocalStrategy(
    (username, password, done) => {
      myDatabase.findOne({username: username}, (err, user) => {
        console.log('User '+ username +' attempted to log in.');
        if(err){return done(err);}
        if(!user){return done(null,false);}
        if(!bcrypt.compareSync(password, user.password)){
          return done(null,false);
        }
        return done(null,user);
      });
    }
  ));

  passport.use(new GithubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'https://boilerplate-advancednode.saileshkumar1.repl.co/auth/github/callback'
    },
    (accessToken, refreshToken, profile, cb) => {
      myDatabase.findOneAndUpdate(
        { id: profile.id },
        {
          $setOnInsert: {
            id: profile.id,
            name: profile.displayName || 'John Doe',
            username: profile.username || '',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails)
              ? profile.emails[0].value
              : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        },
        { upsert: true, new: true },
        (err, doc) => {
          return cb(null, doc.value);
        }
      );
    }
  ));
}