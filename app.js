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


const listingsRouter = require("./route/listing.js");
const reviewsRouter = require("./route/review.js");
const userRouter = require("./route/user.js");
const dbUrl = process.env.ATLASDB_URL;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// async function main(){
//     await mongoose.connect('mongodb://127.0.0.1:27017/wanderlust');
// }
async function main() {
  await mongoose.connect(dbUrl);
}
main()
  .then((req, res) => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret:process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", () => {
  console.log("ERROR IN  SESSION STORE", err);
});

const sessionOptions = {
  store, //mongostore information which goes in our session
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

//   app.get("/" ,(req,res) =>{
//     res.send("welcome to route");
// });
app.get("/", (req, res)=>{
  res.redirect("/listings");
})
app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.successMsg = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  ``;
  // console.log(res.locals.successMsg);
  next();
});
// app.get("/testListing",async (req,res) =>{
//     let sampleListing = new Listing({
//         title: "My new Villa",
//         description:"By the Beach",
//         price:1200,
//         location:"Goa",
//         country:"India",
//     });
//     await sampleListing.save();
//         console.log("sample was saved");
//         res.send("successfull");
// });

// app.get("/demouser" ,async(req,res) =>{
//     let fakeuser =  new User({
//         email:"abc@gmail.com",
//         username:"abc"
//     });
//     let registeredUser = await User.register(fakeuser,"helloworld");
//     res.send(registeredUser);
// });

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page not found!!"));
});

app.use((err, req, res, next) => {
  let { status = 500, message = "Some Error Occurred" } = err;
  res.status(status).render("error.ejs", { message });
  // res.status(status).send(message);
});
app.listen(8080, () => {
  console.log("server is listening to port ");
});
