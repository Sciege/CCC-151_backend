console.log("🔥 server.js is running...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Firebase Admin SDK with service account credentials
admin.initializeApp({
  credential: admin.credential.cert(require("C:/CODE ONLY/important_files/furhome-d9926-firebase-adminsdk-fbsvc-cb3031f626.json")),
});

const petRoutes = require("./routes/petRoutes");

app.use("/api/pets", petRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to the Pet Adoption API');
});


mongoose.connect(process.env.MONGO_URI)
    .then(()=> {
        app.listen(process.env.PORT, ()=> {
            console.log('connected to db & listening on port', process.env.PORT);
        });
    })
    .catch((error)=>{
        console.log(error);
    });
