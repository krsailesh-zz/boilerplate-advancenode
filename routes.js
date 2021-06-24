const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = (app, myDatabase) => {
  app.route('/').get((req,res) => {
    res.render(process.cwd() + '/views/pug/index', {title: 'Connected to Database', message: 'Please login', showLogin: true, showRegistration: true, showSocialAuth: true});
  }); 

  app.route('/register').post((req,res,next) => {
    myDatabase.findOne({username: req.body.username}, (err, user) => {
      if(err){
        next(err);
      }else if(user){
        res.redirect('/');
      }else{
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDatabase.insertOne({
          username: req.body.username,
          password: hash
        }, (err, doc) => {
          if(err){
            res.redirect('/');
          }else{
            next(null, doc.ops[0]);
          }
        })
      }
    })
  }, passport.authenticate('local', {failureRedirect: '/'}), (req, res, next) => {
      res.redirect('/profile');
    }
  );

  app.post('/login', passport.authenticate('local', {failureRedirect: '/'}), (req,res) => {
    res.redirect('/profile');
  })

  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.get('/auth/github', passport.authenticate('github'));

  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    req.session.user_id = req.user.id;
    res.redirect('/chat');
  });

  app.get('/chat', ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/chat', {user: req.user});
  })
}

const ensureAuthenticated = (req, res, next) => {
  if(req.isAuthenticated()){
    return next();
  }
  return res.redirect('/');
}    