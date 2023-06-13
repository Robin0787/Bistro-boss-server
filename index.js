const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 1000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_PAYMENT_SECRET_KEY);
// middleware
app.use(cors());
app.use(express.json());

// Verifying the users token before getting data.
// const verifyToken = async (req, res, next) => {
//   const authorization = req.headers.authorization;
//   if (!authorization) {
//     return res
//       .status(401)
//       .send({ error: true, message: "UnAuthorized Access" });
//   }
//   const token = authorization.split(" ")[1];
//   if (!token) {
//     res.status(403).send({ error: true, message: "UnAuthorized User Token" });
//   }
//   // verify a token symmetric
//   jwt.verify(token, process.env.JWT_TOKEN, function (err, decoded) {
//     if (err) {
//       return res.status(403).send(err);
//     } else {
//       req.decoded = decoded;
//       next();
//     }
//   });
// };
const verifyToken = async (req, res, next) => {
  next();
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
    // await client.connect();
    // checking the requested user is admin or not
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded?.user?.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   if (user?.role !== "admin") {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "Forbidden access" });
    //   }
    //   next();
    // };
    const verifyAdmin = async (req, res, next) => {
      next();
    };

    const userCollection = client.db("All-Foods").collection("users");
    const itemsCollection = client.db("All-Foods").collection("items");
    const reviewsCollection = client.db("All-Foods").collection("reviews");
    const cartCollection = client.db("All-Foods").collection("cart");
    const paymentCollection = client.db("All-Foods").collection("payments");

    // ------Get-----Get-----Get------Get-------Get--------Get
    // Getting all the users
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // checking if the user is admin or not
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // if (req.decoded?.user?.email !== email) {
      //   res.send({ admin: false });
      // }
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
      const email = req.query.email;
      // if (req.decoded.user.email !== email) {
      //   return res
      //     .status(401)
      //     .send({ error: true, message: "Forbidden Access" });
      // }
      // if (!email) {
      //   res.send([]);
      // }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    // getting the stats for admin
    app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const products = await itemsCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();
      const payments = await paymentCollection.find().toArray();
      const revenue = payments.reduce((sum, item) => sum + item.totalPrice ,0);
      res.send({users, products, orders, revenue});
    })
    // Get data for charts // second system to get 
    // ------------------------------------------------------------------------//
    app.get('/chart-data', verifyToken, verifyAdmin, async(req, res) => {
      const payment = await paymentCollection.find().toArray();
      let menuItemsId = payment.map(item => item.menuItemsId);
      menuItemsId = menuItemsId.flat(Infinity);
      const query = {_id: {$in: menuItemsId.map((id) => new ObjectId(id))}};
      const orderedItems = await itemsCollection.find(query).toArray();
      // Getting all items of each categories
      const salad = orderedItems.filter(item => item.category === 'salad');
      const pizza = orderedItems.filter(item => item.category === 'pizza');
      const soup = orderedItems.filter(item => item.category === 'soup');
      const dessert = orderedItems.filter(item => item.category === 'dessert');
      const drinks = orderedItems.filter(item => item.category === 'drinks');
      // Getting total of all categories;
      const saladsTotal = salad.reduce((sum, item) => sum+item.price, 0);
      const pizzasTotal = pizza.reduce((sum, item) => sum+item.price, 0);
      const soupsTotal = soup.reduce((sum, item) => sum+item.price, 0);
      const dessertsTotal = dessert.reduce((sum, item) => sum+item.price, 0);
      const drinksTotal = drinks.reduce((sum, item) => sum+item.price, 0);
      // Making well-structured objects for client-side;
      const saladsInfo = {category: 'salad', ordered: salad.length, totalPrice: saladsTotal.toFixed(2)};
      const pizzasInfo = {category: 'pizza', ordered: pizza.length, totalPrice: pizzasTotal.toFixed(2)};
      const soupsInfo = {category: 'soup', ordered: soup.length, totalPrice: soupsTotal.toFixed(2)};
      const dessertsInfo = {category: 'dessert', ordered: dessert.length, totalPrice: dessertsTotal.toFixed(2)};
      const drinksInfo = {category: 'drinks', ordered: drinks.length, totalPrice: drinksTotal.toFixed(2)};
      res.send([saladsInfo, pizzasInfo, soupsInfo, dessertsInfo, drinksInfo]);
    })
    // ------------------------------------------------------------------------//
    // Get data for charts the best system (aggregation)
    // app.get('/chart-data', async (req, res) => {
    //   const pipeline = [
    //     {
    //       $lookup: {
    //         from: 'items',
    //         localField: 'menuItemsId',
    //         foreignField: '_id',
    //         as: 'menuItemsData'
    //       }
    //     },
    //     {
    //       $unwind: '$menuItemsData'
    //     },
    //     {
    //       $group: {
    //         _id: '$menuItemsData.category',
    //         count: { $sum: 1},
    //         totalPrice: { $sum: '$menuItemsData.price'}
    //       },
    //     }
    //   ];
    //   const result = await paymentCollection.aggregate(pipeline).toArray();
    //   res.send(result);
    // })
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
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // add the items to cart in database
    app.post("/add-to-cart", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });
    // Create payment intent
    app.post('/create-payment-intent', verifyToken, async(req, res) => {
      const {price} = req.body;
      const amount = Math.round((price*100));
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    // Storing the payment to the database;
    app.post('/payments', verifyToken, async(req, res) => {
      const {payment} = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = {_id: {$in: payment.cartItemsId.map((id) => new ObjectId(id))}};
      const deleteResult = await cartCollection.deleteMany(query);
      res.send({
        insertResult, deleteResult
      });
    })
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
      const query = { _id: new ObjectId(id)};
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
