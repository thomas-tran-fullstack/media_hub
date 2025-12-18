require('dotenv').config();// import express from 'express';   // es modules
const express = require('express'); // commonjs
const path = require('path');       // commonjs
const configViewEngine = require('./config/viewEngine.js');
const webRoutes = require('./routes/web.js')
const connection = require('./config/database.js')
const app = express(); // app express
const port = process.env.PORT || 8888;     // port => hardcode
const hostname = process.env.HOST_NAME;

// config template engine
configViewEngine(app);

// khai báo route
app.use('/',webRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



connection.query(
  'select *from Users u',
  function (err,result, fields){
    console.log(">>>results= ",result);
  }
)