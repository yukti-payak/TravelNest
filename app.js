if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const searchRouter = require("./route/search.js");
const listingsRouter = require("./route/listing.js");
const reviewsRouter = require("./route/review.js");
const userRouter = require("./route/user.js");

const dbUrl = process.env.ATLASDB_URL;

// --- Database Connection ---
async function main() {
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log("DB Connection Error:", err);
    });

// --- Settings and Static Files ---
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// --- Session Store Setup ---
const store = MongoStore.create({
    mongoUrl: dbUrl,
    secret: process.env.SECRET, // Use secret directly here
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR IN SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

// --- Middleware Initialization (ORDER MATTERS) ---

app.use(session(sessionOptions)); // 1. Session must be first
app.use(flash());                 // 2. Flash after session

app.use(passport.initialize());   // 3. Passport initialize
app.use(passport.session());      // 4. Passport session after express-session
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// 5. Global Variables Middleware (MUST be before routes)
app.use((req, res, next) => {
    res.locals.successMsg = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user; // Fixes "currUser is not defined"
    next();
});

// --- Routes ---

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/search", searchRouter);
app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

// --- Error Handling ---

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found!!"));
});

app.use((err, req, res, next) => {
    let { status = 500, message = "Some Error Occurred" } = err;
    // Check if headers are already sent to prevent the app from crashing
    if (res.headersSent) {
        return next(err);
    }
    res.status(status).render("error.ejs", { message });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`server is listening to port ${port}`);
});