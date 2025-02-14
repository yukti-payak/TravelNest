const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email:{
        type:String,
        required:true,
    }
});
userSchema.plugin(passportLocalMongoose);//plugin passport will automatically add username and hashed and salted password to the field.....
module.exports = mongoose.model('User', userSchema);
