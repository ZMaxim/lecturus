// var keyword_extractor = require("keyword-extractor");
var express = require('express');
var mysql = require('mysql');
var path = require('path');
var bodyParser  = require('body-parser');
var app = express();

app.use(express.static(path.join(__dirname ,'views')));
app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
// middleware to check: 'Passport' -> for users managing

var port = process.env.PORT || 8080;
app.set('port', port);
app.set('view engine', 'ejs');

if (port == 8080)
config ={
	host:"127.0.0.1",
	user:"root",
	password:"",
	database:"lecturus",
	port: 3306
}
else
config ={
	host: "us-cdbr-iron-east-01.cleardb.net",
    user: "b23c6d0f964532",
    password: "1fc1c4ed",
    database: "heroku_f00102faee97288",
    port: 3306,
    databaseURL: "postgres://pyfekaqvrthvgq:PBcXHR3GCO3WE3pkiycfbNqoFK@ec2-184-73-165-193.compute-1.amazonaws.com:5432/ddsmieiqgh77je",
    Psql: "heroku pg:psql --app heroku-postgres-31992389 HEROKU_POSTGRESQL_AQUA",
    mySql: "mysql://b23c6d0f964532:1fc1c4ed"
};

pool = mysql.createPool(config);

app.listen(app.get('port'), function () {
    console.log('Server running...'+app.get('port'));
});

function keepAlive(){
  pool.getConnection(function(err, connection){
    if(err) { return; }
    connection.ping();
    connection.end();
  });
}
setInterval(keepAlive, 30000);

var lec_users = require('./s_users'); // can use app.use( '/folderName' ,require('lecturus_users'));
app.use(lec_users); 
var session = require('./s_session'); // can use app.use( '/folderName' ,require('lecturus_users'));
app.use(session); 

/*
app.get('/', function(req, res, next) {
  // Handle the get for this route
});

app.post('/', function(req, res, next) {
 // Handle the post for this route
});*/


app.get('/', function (req, res) {
	res.render('index',{
		title:"LecturuS"
	});
});



app.get('/*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});
