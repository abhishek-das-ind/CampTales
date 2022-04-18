if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

console.log(process.env.SECRET)


const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const { campgroundSchema, reviewSchema, UserSchema } = require('./schema.js')
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const meethodOverride = require('method-override');
const Campground = require('./models/campground');
const Review = require('./models/review');
const User = require('./models/user');
const { populate } = require('./models/campground');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const { isLoggedIn } = require('./middleware');
const campgrounds = require('./controllers/campgrounds');
const reviews = require('./controllers/reviews');
const users = require('./controllers/users');
const multer = require('multer');
const { storage } = require('./cloudinary');
const upload = multer({ storage });




// const campgrounds = require('./routes/campgrounds');
//const dbUrl = process.env.DB_URL;
mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

// app.use('/campgrounds', campgrounds)

app.get('/', (req, res) => {
    res.render('home')
});

app.use(express.urlencoded({ extended: true }));
app.use(meethodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig))
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    console.log(req.session);
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

// app.get('/fakeuser', async (req, res) => {
//     const user = new User({ email: 'ad@gmail.com', username: 'ad' });
//     const newUser = await User.register(user, 'chicken');
//     res.send(newUser);
// })

const validateCampground = (req, res, next) => {

    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

const validateUser = (req, res, next) => {
    const { error } = UserSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

const isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

const isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/campgrounds/${id}`);
    }
    next();
}

app.get('/campgrounds', catchAsync(campgrounds.index));

app.get('/campgrounds/new', isLoggedIn, campgrounds.renderNewForm);

app.post('/campgrounds', isLoggedIn, upload.array('image'), validateCampground, catchAsync(campgrounds.createCampground));


app.get('/campgrounds/:id', catchAsync(campgrounds.showCampground));

app.get('/campgrounds/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm));

app.put('/campgrounds/:id', isLoggedIn, isAuthor, upload.array('image'), validateCampground, catchAsync(campgrounds.updateCampground));

app.delete('/campgrounds/:id', isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

app.post('/campgrounds/:id/reviews', isLoggedIn, validateReview, catchAsync(reviews.createReview));

app.delete('/campgrounds/:id/reviews/:reviewId', isLoggedIn, isReviewAuthor, catchAsync(reviews.deleteReview));

//register

app.get('/register', users.renderRegister);

app.post('/register', catchAsync(users.register));

//login

app.get('/login', users.renderLogin);

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), users.login);

//logout

app.get('/logout', users.logout);

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err });
})

app.listen(3000, () => {
    console.log('Serving on port 3000')
})


