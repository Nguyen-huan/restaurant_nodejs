const express = require("express");
const app = express();
const morgan = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");
const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');


// mongodb compass
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;


app.use(cors());
app.options("*", cors());

//middleware
app.use(express.json());
app.use(morgan("tiny"));
app.use(authJwt());
app.use(errorHandler);
//public image to browser
app.use('/public/uploads', express.static(__dirname + '/public/uploads'));


//Routes
const categoriesRoutes = require("./routes/categories");
const dishesRoutes = require("./routes/dishes");
const customersRoutes = require("./routes/customers");
const ordersRoutes = require("./routes/orders");

const api = process.env.API_URL;

app.use(`${api}/categories`, categoriesRoutes);
app.use(`${api}/dishes`, dishesRoutes);
app.use(`${api}/customers`, customersRoutes);
app.use(`${api}/orders`, ordersRoutes);

//Database
mongoose
    .connect(process.env.CONNECTION_STRING, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        // dbName: "deffzone",
    })
    .then(() => {
        console.log("Database Connection is ready...");
    })
    .catch((err) => {
        console.log(err);
    });

  


//Server
app.listen(3000, () => {
    console.log("server is running http://localhost:3000");
});
