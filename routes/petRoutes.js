const express = require("express");
const Pet = require("../models/Pet");
const admin = require("firebase-admin");
//const verifyToken = (req, res, next) => next();  // TEMPORARY dummy middleware

const { storage } = require('../utils/appwriteClient'); // Ensure you have appwriteClient set up

const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    //TEST
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    // TEST
    console.log("Token verified for user:", decodedToken.uid);
    req.user = decodedToken; // This will contain uid and other user info
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const router = express.Router();
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../utils/s3Client");
const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
// router.get("/test", (req, res) => {
//   res.send("Pet route is working!");
// });  

//const storage = multer.memoryStorage();
const upload = multer({ storage });


//GET All Pets (For Guests) 
// explanation
router.get("/", async (req, res) => {
  try {
    const pets = await Pet.find();
    res.json(pets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 
//tried removine /pets in /pets/registered
router.get("/registered",verifyToken ,async (req,res)=>{
  try {
    //TESTING
    console.log("Finding pets for user ID:", req.user.uid);
    const userPets = await Pet.find({ ownerId: req.user.uid });
    //TESTING
    console.log("Found pets count:", userPets.length);
    console.log("Pet IDs:", userPets.map(pet => pet._id));
    res.json(userPets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})
// For registered user getting pets
// router.get("/pets", async (req, res) => {
//   try {
//     // Assuming `req.user.uid` holds the user ID for authentication
//     const pets = await Pet.find({ ownerId: req.user.uid });
//     res.json(pets);
//   } catch (error) {
//     res.status(500).send("Error fetching pets.");
//   }
// });

// New endpoint to serve pet images
// /////COMMENT FOR NOW
// router.get("/image/:filename", async (req, res) => {
//   try {
//     const filename = req.params.filename;
//     const bucketName = process.env.S3_BUCKET_NAME;
    
//     // Create the command to get the object from MinIO
//     const command = new GetObjectCommand({
//       Bucket: bucketName,
//       Key: filename
//     });
    
//     // Get the object from MinIO
//     const response = await s3.send(command);
    
//     // Set the content type
//     res.set('Content-Type', response.ContentType || 'image/jpeg');
    
//     // Stream the image data directly to the client
//     response.Body.pipe(res);
//   } catch (error) {
//     console.error("Error fetching image:", error);
//     res.status(404).send("Image not found");
//   }
// });

// For registered user getting pets
// Replace your current image route with this fixed version
router.get('/image/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const imageUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

    // Redirect to the Appwrite-hosted image
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Error generating image view URL:', error);
    res.status(500).send('Failed to fetch image');
  }
});


// Post a new pet for registered user
router.post("/pets", async (req, res) => {
  try {
    const newPet = new Pet({
      name: req.body.name,
      breed: req.body.breed,
      ownerId: req.user.uid,  // This ensures only the owner can post a pet
      // new
      about: req.body.about,
      contactNumber: req.body.contactNumber,
      ownerName: req.body.owner
    });
    await newPet.save();
    res.status(201).json(newPet);
  } catch (error) {
    res.status(500).send("Error posting pet.");
  }
});

//POST /api/pets/upload
// ////COMMENT FOR NOW
// router.post("/upload", upload.single("image"), async (req, res) => {
//   try {
//     const file = req.file;
//     if (!file) return res.status(400).json({ error: "No file uploaded" });

//     const fileName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
//     const bucketName = process.env.S3_BUCKET_NAME;
    
//     // Make sure to set the proper content type
//     const contentType = file.mimetype || 'image/jpeg';
    
//     const uploadParams = {
//       Bucket: bucketName,
//       Key: fileName,
//       Body: file.buffer,
//       ContentType: contentType, // Explicitly set the content type
//       ACL: "public-read", // Make sure it's publicly accessible
//     };

//     await s3.send(new PutObjectCommand(uploadParams));
    
//     // Use your machine's IP address instead of localhost for Flutter
//     const fileUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/${fileName}`;
//     res.status(200).json({ imageUrl: fileUrl });
//   } catch (error) {
//     console.error("Upload error:", error);
//     res.status(500).json({ error: "Failed to upload image" });
//   }
// });


//POST /api/pets/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Upload file to Appwrite storage
    const response = await storage.createFile(
      process.env.APPWRITE_BUCKET_ID, // Bucket ID
      'unique()', // Unique file ID
      new File([file.buffer], file.originalname, { type: file.mimetype })
    );

    const fileId = response.$id;
    const imageUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// routes/petRoutes.js
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, breed, age, healthStatus, location, ownerContact, imageUrl, imageFileId, ownerName, contactNumber, about } = req.body;
    const newPet = new Pet({
      name,
      breed,
      age,
      healthStatus,
      location,
      ownerContact,
      imageUrl, // Image URL from upload
      imageFileId,
      ownerName,
      contactNumber,
      about,
      ownerId: req.user.uid,
    });
    await newPet.save();
    res.status(201).json(newPet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//POST Add Pet (Only for Owner)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, breed, age, healthStatus, location, ownerContact, imageUrl, ownerName, contactNumber, about } = req.body;
    const newPet = new Pet({
      name,
      breed,
      age,
      healthStatus,
      location,
      ownerContact,
      imageUrl, // Image URL from upload
      ownerName,
      contactNumber,
      about,
      ownerId: req.user.uid,
    });
    await newPet.save();
    res.status(201).json(newPet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
//PUT Update Pet (Only for Owner)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ message: "Pet not found" });

    if (pet.ownerId !== req.user.uid)
      return res.status(403).json({ message: "Unauthorized" });

    Object.assign(pet, req.body);
    await pet.save();
    res.json(pet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// //DELETE Remove Pet (Only for Owner)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ message: "Pet not found" });
    }

    // Delete the image from Appwrite if it exists
    if (pet.imageFileId) {
      await storage.deleteFile(process.env.APPWRITE_BUCKET_ID, pet.imageFileId);
      console.log("Image deleted from Appwrite Storage");
    }

    // Delete the pet from MongoDB
    await pet.deleteOne();
    res.json({ message: "Pet and image (if any) deleted successfully" });
  } catch (error) {
    console.error("Error deleting pet or image:", error);
    res.status(500).json({ error: error.message });
  }
});


// //DELETE Remove Pet (Only for Owner)
///////COMMENT FOR NOW
// router.delete("/:id", verifyToken, async (req, res) => {
//   try {
//     const pet = await Pet.findById(req.params.id);
//     if (!pet) {
//       return res.status(404).json({ message: "Pet not found" });
//     }

//     const bucketName = process.env.S3_BUCKET_NAME;

//     // Log the bucket name for debugging
//     console.log(`Bucket name: ${bucketName}`);

//     // Check if the pet has an image URL before attempting to delete the image
//     if (pet.imageUrl) {
//       const imageKey = pet.imageUrl.split('/').pop(); // Extract the image file name from the URL
//       console.log(`Deleting image with key: ${imageKey}`);

//       const deleteParams = {
//         Bucket: bucketName,
//         Key: imageKey,
//       };

//       await s3.send(new DeleteObjectCommand(deleteParams)); // Delete the image from MinIO
//       console.log('Image deleted from MinIO');
//     }

//     // Delete the pet from MongoDB
//     await pet.deleteOne();
//     console.log(`Pet with ID ${pet._id} deleted successfully`);

//     res.json({ message: "Pet and image (if any) deleted successfully" });
//   } catch (error) {
//     console.error('Error deleting pet or image:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;
