const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const { check, validationResult } = require("express-validator");
const config = require("./config/database");

// connecting to mongo db
mongoose.connect(config.database);
let db = mongoose.connection;

db.once("open", () => {
  console.log("Connected to MongoDB");
});

db.on("error", (err) => {
  console.error("DB Error:", err);
});

const app = express();
const router = express.Router();

// user model
let Users = require("./models/user");
require("./config/passport")(passport);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

router.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
  });
});

router
  .route("/register")
  .get((req, res) => {
    res.render("register", {
      title: "Register",
      errors: [],
      message: "",
    });
  })
  .post(
    [
      check("name", "Name is required").notEmpty(),
      check("username", "Username is required").notEmpty(),
      check("email", "Email is required").notEmpty(),
      check("email", "Email is invalid").isEmail(),
      check("password", "Password is required").notEmpty(),
      check("confirmPassword", "Confirm Password is required").notEmpty(),
      check("confirmPassword", "Passwords do not match").custom(
        (value, { req }) => value === req.body.password
      ),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("register", {
          title: "Register",
          errors: errors.array(),
          message: "",
        });
      }

      const { name, username, email, password } = req.body;

      try {
        const existingUser = await Users.findOne({ email });
        if (existingUser) {
          return res.render("register", {
            title: "Register",
            errors: [{ msg: "Email already registered" }],
            message: "",
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new Users({
          name,
          email,
          password: hashedPassword,
        });

        await newUser.save();
        return res.render("login", {
          title: "Login",
          errors: [],
          message: "Registration successful. Please log in.",
        });
      } catch (err) {
        console.error(err);
        return res.render("register", {
          title: "Register",
          errors: [{ msg: "Server error occurred" }],
          message: "",
        });
      }
    }
  );

router
  .route("/login")
  .get((req, res) => {
    res.render("login", {
      title: "Login",
      errors: [],
      message: "",
    });
  })
  .post((req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.render("login", {
          title: "Login",
          errors: [{ msg: info.message }],
          message: "",
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.redirect("/");
      });
    })(req, res, next);
  });

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

app.use("/", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
