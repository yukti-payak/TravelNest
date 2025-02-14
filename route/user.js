const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const User = require("../models/user.js");
const passport = require("passport");
const { saveRedirectUrl} = require("../middleware.js");
const userController = require("../controllers/user.js");


router.route("/signup")
.get(userController.rendersignupForm)
.post(wrapAsync(userController.signup));


router.route("/login")
.get(userController.renderloginForm )
.post( saveRedirectUrl,passport.authenticate("local", {failureRedirect : '/login' , failureFlash : true}) , userController.login);


//Logout route for the user 
router.get("/logout" , userController.logout);

module.exports = router;