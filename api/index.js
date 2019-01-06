const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgress client setup
const { Pool } = require('pg');
const pgClient = new Pool({
	user: keys.pgUser,
	password: keys.pgPassword,
	host: keys.pgHost,
	post: keys.pgPort,
	database: keys.pgDatabase
});
pgClient.on('error', () => console.error('Lost connection to PostgreSQL database.'));

pgClient
	.query('CREATE TABLE IF NOT EXISTS values(number INT)')
	.catch(err => console.error(err));

// Redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();


// Express route handles
app.get('/', (req, res) => {
	res.send('Hi');
});

app.get('/values/all', async(req, res) => {
	const values = await pgClient.query('select * from values');
	
	res.send(values.rows);
});

app.get('/values/current', async(req, res) => {
	redisClient.hgetall('values', (err, values) => {
		res.send(values);
	});
});

app.post('/values/input', async(req, res) => {
	const index = req.body.index;
	
	if (parseInt(index) > 40) {
		res.status(422).send('Index too high.');
	}
	
	console.log('LOG: Index is' + index);
	
	redisClient.hset('values', index, 'Nothing yet!');
	redisPublisher.publish('insert', index);
	
	pgClient.query('INSERT into values VALUES($1)', [index])
	
	res.send({working: true});
});

app.listen(5000, err=> {
	console.log('Listening.');
});
