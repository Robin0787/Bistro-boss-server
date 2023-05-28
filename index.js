const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 1000;
require("dotenv").config();
// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oava4mu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const itemsCollection = client.db("All-Foods").collection("items");
    const reviewsCollection = client.db("All-Foods").collection("reviews");
    const cartCollection = client.db("All-Foods").collection("cart");

    // create json web token for the user
    app.post("/get-token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(
        {
          user
        },
        process.env.JWT_TOKEN,
        { expiresIn: '5m' }
      );
      res.send({token});
    });

    // Getting all the items from database
    app.get("/all-items", async (req, res) => {
      const result = await itemsCollection.find().toArray();
      res.send(result);
    });
    // Getting all the clients reviews form the database
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });
    // getting the cart items based on the user email
    app.get('/cart-items', async (req, res) => {
      const email = req.query.email;
      if(!email){
        res.send([]);
      }
      const query = {email: email};
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    })
    // add the items to cart in database
    app.post("/add-to-cart", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log("Server running on port", port);
});
