const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const ejsMate = require('ejs-mate');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bodyParser = require('body-parser');

mongoose.connect('mongodb://localhost:27017/todo', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!")
    })
    .catch(err => {
        console.log("OHH NO MONGO CONNECTION ERROR!!!")
        console.log(err)
    });
// app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}))
app.use(require('flash')());
app.use(passport.initialize());
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
function isLoggedIn(req, res, next) {
    console.log(req.isAuthenticated());
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};
app.get('/', (req, res) => {
    res.render('home')
})
app.get('/todo', isLoggedIn, (req, res) => {
    console.log(req.user);
    res.render('index');
})
app.get('/register', async (req, res) => {
    res.render('users/register');
})
app.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // console.log(email, username, password);
        const user = new User({ email, username });
        const registeredUser = await User.register(user, password);
        passport.authenticate("local")(req, res, () => {
            User.findById(registeredUser._id, function (err, userFound) {
                userFound.email_id = req.body.email_id;
                userFound.save(function (err, newUser) {
                    if (err) {
                        console.log(err);
                    } else {
                        res.redirect("/todo");
                    }
                });
            });
        })
        // req.login(registeredUser, err => {
        //     if (err) return next(err);
        //     req.flash('success', 'Welcome to TODO LIST');
        //     res.redirect('/todo');
        // })
    } catch (e) {
        console.log(e);
        req.flash('error', e.message);
        res.redirect('/register')
    }

})



app.get('/login', (req, res) => {
    res.render('users/login');
})
// app.post('/login', function(req, res, next) {
//     passport.authenticate('local', function(err, user, info) {
//       if (err) { return next(err); }
//       if (!user) { return res.redirect('/login'); }
//       req.logIn(user, function(err) {
//         if (err) { return next(err); }
//         return res.redirect('/todo' + user.username);
//       });
//     })(req, res, next);
//   },);

app.post('/login', passport.authenticate("local",
 { successRedirect:"/todo",
  failureRedirect: "/login"
 }), (req, res) => {});
 
app.get('/logout', async (req, res) => {
    req.logout();
    res.redirect('/login');
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = "Oh no,Something went wrong"
    res.status(statusCode).render('error', { err })

})
app.listen(3000, () => {
    console.log("lstening on port 3000")
});