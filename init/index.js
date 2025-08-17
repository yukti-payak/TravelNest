const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const path = require('path')
if (process.env.NODE_ENV != "production") {
  // Modify this line
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
}
const MONGO_URL =process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}




const initDB = async () => {
  await Listing.deleteMany({});
  initData.data = initData.data.map((obj)=>({...obj, owner:"689f804b0fcabdbbad12cbd1"}));
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();