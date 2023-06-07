const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5100;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Dojo is running");
});

app.listen(port, () => {
  console.log("listening from", port);
});
