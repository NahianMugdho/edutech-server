require('dotenv').config()


const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;


app.use(cors())
app.use(express.json()); // This enables JSON parsing


const { MongoClient, ServerApiVersion, ObjectId  } = require('mongodb');
const uri = ``;
// Replace with your actual MongoDB connection string
// Example: const uri = "mongodb+srv://<username>:<password>@cluster.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

//products
//const colllection = client.db('product').collection('server'); // Collection for product queries


// ============================
// ✅ PRODUCT ROUTES
// ============================

// @route   GET /product
// @desc    Get all product queries
// @access  Public
app.get('/product', async (req, res) => {
  // Fetch all products from MongoDB
});


// @route   POST /product
// @desc    Add a new product query
// @access  Public
app.post('/product', async (req, res) => {
  // Get data from req.body
  // Insert into productCollection
});


// @route   GET /product/:id
// @desc    Get a single product query by ID
// @access  Public
app.get('/product/:id', async (req, res) => {
  // Extract ID from req.params
  // Fetch from productCollection by _id
});


// @route   DELETE /product/:id
// @desc    Delete a product query by ID
// @access  Public/Admin
app.delete('/product/:id', async (req, res) => {
  // Extract ID from req.params
  // Delete from productCollection
});


// ============================
// ⭐ RECOMMENDATION ROUTES
// ============================

// @route   GET /recommendation
// @desc    Get all recommendations OR filter by user email (?email=user@example.com)
// @access  Public
app.get('/recommendation', async (req, res) => {
  // Optional: filter by userEmail using req.query.email
  // Fetch from recommendationCollection
});


// @route   GET /recommendation/query/:queryId
// @desc    Get recommendations for a specific product query
// @access  Public
app.get('/recommendation/query/:queryId', async (req, res) => {
  // Extract queryId from req.params
  // Fetch related recommendations from recommendationCollection
});


// @route   POST /recommendation
// @desc    Add a new recommendation to a product query
// @access  Public
app.post('/recommendation', async (req, res) => {
  // Get data from req.body
  // Insert into recommendationCollection
  // Optional: increment recommendationCount in productCollection
});



  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);









app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })