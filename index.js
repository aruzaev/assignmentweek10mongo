const express = require("express");
const path = require("path");

const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/Users");
let db = mongoose.connection;

db.once("open", () => {
  console.log("Connected to MongoDB");
});

db.on("error", (err) => {
  console.log("DB Error");
});

const app = express();

app.set("/", path.join(__dirname, "views"));
app.set("view engine", "pug");

let Users = require("./models/user");

app.get("/", async (req, res) => {
  try {
    const users = await Users.find({});
    console.log(users);
    res.render("index", {
      title: "User List",
      users: users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("An error occurred");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
