const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5100;

// middleware
app.use(cors());
app.use(express.json());

// verify jwt
function verifyJwt(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@clustersss.lzzpxzj.mongodb.net/?retryWrites=true&w=majority`;

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

    // collections
    const classCollection = client.db("campDB").collection("classes");
    const userCollection = client.db("campDB").collection("users");
    const selectedClassCollection = client
      .db("campDB")
      .collection("selected-class");
    const paymentCollection = client.db("campDB").collection("payments");
    const enrolledCollection = client.db("campDB").collection("enrolled-class");

    // jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "10m",
      });
      res.send({ token });
    });

    // all classes
    app.get("/classes", async (req, res) => {
      const result = await classCollection
        .find({ status: "approved" })
        .sort({ enrolledStudents: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    app.get("/approved-classes", async (req, res) => {
      const result = await classCollection
        .find({ status: "approved" })
        .toArray();
      res.send(result);
    });

    // selected classes
    app.get("/selected-classes", verifyJwt, async (req, res) => {
      const result = await selectedClassCollection
        .find({
          studentEmail: req.query.email,
        })
        .toArray();
      res.send(result);
    });

    app.post("/selected-classes", async (req, res) => {
      const singleClass = req.body;
      const result = await selectedClassCollection.insertOne(singleClass);
      res.send(result);
    });

    app.delete("/selected-classes/:id", async (req, res) => {
      const result = await selectedClassCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // enrolled classes
    app.get("/enrolled-classes", verifyJwt, async (req, res) => {
      const result = await enrolledCollection
        .find({
          studentEmail: req.query.email,
        })
        .toArray();
      res.send(result);
    });

    /*  user api */

    // get instructors
    app.get("/users", async (req, res) => {
      const result = await userCollection
        .find({ role: "instructor" })
        .toArray();
      res.send(result);
    });

    // save users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: "user already registered" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // payment intents
    app.post("/create-payment-intents", verifyJwt, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment api
    app.get("/payment-history", verifyJwt, async (req, res) => {
      const result = await paymentCollection
        .find({ email: req.query.email })
        .sort({ date: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const paymentResult = await paymentCollection.insertOne(req.body);
      const insertResult = await enrolledCollection.insertOne(
        req.body.classItem
      );
      const deleteResult = await selectedClassCollection.deleteOne({
        _id: new ObjectId(req.body.classItem._id),
      });
      const filter = { _id: new ObjectId(req.body.classItem?.classId) };
      const updateDoc = {
        $inc: {
          availableSeats: -1,
          enrolledStudents: 1,
        },
      };
      const updateDocResult = await classCollection.updateOne(
        filter,
        updateDoc
      );
      res.send({ paymentResult, insertResult, deleteResult, updateDocResult });
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
  res.send("Dojo is running");
});

app.listen(port, () => {
  console.log("listening from", port);
});
