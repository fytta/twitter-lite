const model = require('./model_tweets');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
// Para poder pasar las fotos 
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

let port = 8081;
if (process.argv.length > 2) port = parseInt(process.argv[2]);

app.use(function(req, res, next) {
    console.log('authorize ' + req.method + ' ' + req.originalUrl);
    if (!req.query.token) res.status(401).send('Token not found');
    else next();
});

/** List tweets 
 * GET /twitter/tweets 
 * Recupera todos los tweets del sistema
 * Parámetros: token, opts (JSON) {query, ini,count, sort}
 * Resultado (JSON): [tweets]
 */
app.get('/twitter/tweets', function(req, res) {
    let opts = {};
    if (req.query.opts) opts = JSON.parse(req.query.opts);
    model.listTweets(req.query.token, opts, (err, tweets) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(tweets);
        }
    });
});

/** Add tweet
 * POST /twitter/tweets 
 * Crea un nuevo tweet
 * Datos (JSON): tweet
 * Resultado (JSON): tweet
 */
app.post('/twitter/tweets', function(req, res) {
    model.addTweet(req.body.token, req.body.content, (err, tweet) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else res.send(tweet);
    });
});

/** Add Retweet 
 * POST /twitter/tweets/XXX/retweets 
 * Crea un nuevo retweet a partir del tweet con id XXX
 * Parámetros: token
 * Resultado (JSON): tweet 
 */
app.post('/twitter/tweets/:me/retweets', function(req, res) {
    model.addRetweet(req.body.token, req.body.tweetId, (err, retweet) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else res.send(retweet);
    });
});

/** Like 
 * POST /twitter/tweets/XXX/likes 
 * Añade un like al tweet con id XXX
 * Parámetros: token
 */
app.post('/twitter/tweets/:me/likes', function(req, res) {
    model.like(req.body.token, req.body.tweetId, (err) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.sendStatus(204);
        }
    });
});

/** Dislike 
 * POST /twitter/tweets/XXX/dislikes 
 * Añade un dislike al tweet con id XXX
 * Parámetros: token
 */
app.post('/twitter/tweets/:me/dislikes', function(req, res) {
    model.dislike(req.body.token, req.body.tweetId, (err) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.sendStatus(204);
        }
    });
});

/** Get Tweet by ID 
 * GET /twitter/tweets/XXX 
 * Recupera el tweet con id XXX
 * Parámetros: token
 * Resultado (JSON): tweet
 */
app.get('/twitter/tweets/:me', function(req, res) {
    model.listTweets(req.query.token, { query: { _id: req.tweetId } }, (err, tweet) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(tweet);
        }
    });
});

app.listen(port);
console.log('Tweets microservice listening on port ' + port + ' ...');