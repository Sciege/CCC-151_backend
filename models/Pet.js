const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
  // if we will not set required, getting queries will also include the imageurl 
//   name: { type: String, required: true },
//   breed: { type: String, required: true },
//   age: { type: Number, required: true },
//   location: { type: String, required: false },  // Optional field
//   imageUrl: { type: String, required: false }, 
  name : String,
  breed: String,
  age: Number,
  location: String,  
  imageUrl: String, 
  imageFileId: String, //appwrite
  ownerId: { type: String, required: true },
  //ownerId: String, // Reference to Firebase User ID
  /// NEW
  about: String,
  ownerName: String,
  contactNumber: String
});

const Pet = mongoose.model("Pet", petSchema);

module.exports = Pet; //to use in other file and import it
