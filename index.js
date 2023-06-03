const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 1000;
require("dotenv").config();
// middleware
app.use(cors());
app.use(express.json());

// Verifying the users token before getting data.
const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "UnAuthorized Access" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    res.status(403).send({ error: true, message: "UnAuthorized User Token" });
  }
  // verify a token symmetric
  jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send(err);
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

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
    // checking the requested user is admin or not
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded?.user?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }
      next();
    };
    const userCollection = client.db("All-Foods").collection("users");
    const itemsCollection = client.db("All-Foods").collection("items");
    const reviewsCollection = client.db("All-Foods").collection("reviews");
    const cartCollection = client.db("All-Foods").collection("cart");

    // ------Get-----Get-----Get------Get-------Get--------Get
    // Getting all the users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // checking if the user is admin or not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (req.decoded?.user?.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
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
    app.get("/cart-items", verifyToken, async (req, res) => {
      const email = req.decoded.user.email;
      if (req.decoded.user.email !== email) {
        return res
          .status(401)
          .send({ error: true, message: "Forbidden Access" });
      }
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // ------Post-----Post-----Post------Post-------Post--------Post
    // Adding items to database
    app.post('/add-item', verifyToken, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      const price = parseInt(newItem?.price);
      const result = await itemsCollection.insertOne({...newItem, price});
      res.send(result);
    })
    // Adding the user to database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const checkUser = await userCollection.findOne(query);
      if (checkUser) {
        return res.send({ message: "User Exits in database" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // create json web token for the user
    app.post("/get-token", async (req, res) => {
      const user = req.body;
      const token = jwt.sign({ user }, process.env.JWT_TOKEN, {
        expiresIn: "10m",
      });
      res.send({ token });
    });
    // add the items to cart in database
    app.post("/add-to-cart", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    //----Patch-----Patch-----Patch------Patch-------Patch--------Patch
    // Updating users role
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    // ------Delete------Delete-------Delete-------Delete--------Delete
    // Delete item bu admin
    app.delete('/delete-item/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await itemsCollection.deleteOne(query);
      res.send(result);
    })
    // Deleting user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    // Deleting specific Item from user cart
    app.delete("/delete/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await cartCollection.deleteOne(query);
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
