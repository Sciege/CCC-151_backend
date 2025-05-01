// utils/appwriteClient.js
const { Client, Storage } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // e.g., 'https://cloud.appwrite.io/v1'
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);

module.exports = { storage };
