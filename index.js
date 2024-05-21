const cors = require("cors");
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const { log } = require("console");

const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: ["http://127.0.0.1:8888"],
  })
);
app.use(cookieParser());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

const port = 8000;
const secret = "mysecret";

let conn = null;

// function init connection mysql
const initMySQL = async () => {
  conn = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root_password",
    database: "tutorial",
  });
};

/* เราจะแก้ไข code ที่อยู่ตรงกลาง */
app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const userData = {
      email,
      password: passwordHash,
    };
    const [results] = await conn.query("INSERT INTO users SET ?", userData);
    res.json({
      message: "insert ok",
      results,
    });
  } catch (error) {
    console.log("error", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({
        message: "Email already exists",
      });
    } else {
      res.status(500).json({
        message: "insert error",
        error,
      });
    }
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const [result] = await conn.query(
    "SELECT * from users WHERE email = ?",
    email
  );
  const user = result[0];
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).send({ message: "Invalid email or password" });
  }

  //สร้าง token jwt token
  /*   const token = jwt.sign({ email, role: "admin" }, secret, { expiresIn: "1h" });
  res.cookie("token", token, {
    maxAge: 300000,
    secure: true,
    httpOnly: true,
    sameSite: "none",
  }); */

  req.session.userId = user.id;
  req.session.user = user;
  console.log("req.session 1:", req.session);

  res.send({
    message: "Login successful",
  });
});

app.get("/api/users", async (req, res) => {
  try {
    //code V.1 แนบ token ไปใน headers
    /*  const authHeader = req.headers["authorization"];
    let authToken = "";
    if (authHeader) {
      authToken = authHeader.split(" ")[1];
    } */

    //code V.2 ใช้จาก cookies
    /* const authToken = req.cookies.token; */

    //const user = jwt.verify(authToken, secret); // ใช้ตอน V.1, V.2

    /*     const [checkResults] = await conn.query( //ใช้ตอน V.1, V.2
      "SELECT * from users where email = ?",
      user.email
    );
    if (!checkResults[0]) {
      throw { message: "user not found" };
    } */
    console.log("req.session 2:", req.session);
    if (!req.session.userId) {
      throw { message: "Auth fail" };
    }
    console.log(req.session);

    const [results] = await conn.query("SELECT * FROM users");
    // const users = results.map((row) => row.email);
    res.json({ users: results });
  } catch (er) {
    console.error(er);
    res.status(403).json({
      message: "authenication fail",
      er,
    });
  }
});

// Listen
app.listen(port, async () => {
  await initMySQL();
  console.log("Server started at port 8000");
});
