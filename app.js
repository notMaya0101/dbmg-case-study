const express = require("express");
const app = express();
const connectDB = require("./db/connect");
require("express-async-errors");
require("dotenv").config();
const morgan = require("morgan");

//const cors = require("cors");
//const helmet = require("helmet");

// template engine, parse json objects, and static files
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.static("./public"));

app.use(morgan("dev"));
//app.use(cors());
//app.use(helmet())

// router
const pageRouter = require("./routes/pages.js");
const authRouter = require("./routes/auth.js");
const fileRouter = require("./routes/files.js");
const formData = require("./routes/formData.js");

// error handler
const notFoundMiddleWare = require("./middlewares/not-found.js");
const errorHandlerMiddeWare = require("./middlewares/error-handler.js");

// routes
app.use("/", pageRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/files", fileRouter);
app.use("/api/v1/tmp-form-data", formData);

app.use(notFoundMiddleWare);
app.use(errorHandlerMiddeWare);

const port = process.env.PORT || 3000;

// connect db && start server
const startServer = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => {
      console.log(`Server running on port ${port}....`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();
