const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5100;

// middleware
app.use(cors());
app.use(express.json());

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
    app.get("/selected-classes", async (req, res) => {
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

    // instructors
    app.get("/instructors", async (req, res) => {
      const result = await userCollection
        .find({ role: "instructor" })
        .toArray();
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
  res.send("Dojo is running");
});

app.listen(port, () => {
  console.log("listening from", port);
});
