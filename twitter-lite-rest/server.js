const model = require('./model_mongo');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
// Para poder pasar las fotos 
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.use(function (req, res, next) {
    console.log('authorize ' + req.method + ' ' + req.originalUrl);
    /* Authorization */
    if ((req.path == '/twitter/sessions' && req.method == 'POST') ||
        (req.path == '/twitter/users' && req.method == 'POST')) {
        next();
    } else if (!req.query.token) res.status(401).send('Token not found');
    else next();
});

/** LOGIN
 * POST /twitter/sessions 
 * Abre una nueva sesión.
 * Datos (JSON): {email, password}
 * Resultado (JSON): {token, user}
 */
app.post('/twitter/sessions', function (req, res) {
    if (!req.body.email || !req.body.password)
        res.status(400).send('Parameters missing');
    else {
        model.login(req.body.email, req.body.password, (err, token, user) => {
            if (err) {
                console.log(err.stack);
                res.status(400).send(err);
            } else {
                res.send({ token: token, user: user });
            }
        });
    }
});

/** REGISTER
 * POST /twitter/users  
 * Crea un nuevo usuario
 * Datos (JSON): user
 * Resultado (JSON): user
 */
app.post('/twitter/users', function (req, res) {
    model.addUser(req.body, (err, user) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else res.send(user);
    });
});

/** UPDATE USER
 * PUT /twitter/users/XXX   
 * Actualiza el usuario con id XXX
 * Parámetros: token
 * Datos (JSON): user
 * Resultado (JSON): user
 */
app.put('/twitter/users/:me/update', function (req, res) { // TODO: ERROR 500
    model.updateUser(req.body.token, req.body.user, (err, resp) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            console.log(resp.data)
            res.send(resp.data);
        }
    });
});

/** LIST USERS
 * GET /twitter/users/XXX/all   
 * Recupera todos los usuarios del sistema
 * Parámetros: token, opts (JSON) {query, ini,count, sort}
 * Resultado (JSON): [user]
 */
app.get('/twitter/users/:me/all', function (req, res) {
    let opts = {};
    if (req.query.opts) opts =  JSON.parse(req.query.opts);
    model.listUsers(req.query.token, opts, (err, users) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(users);
        }
    });
});


/** List following users
* GET /twitter/users/XXX/following
* Recupera todos los usuarios a quien sigue el usuario con id XXX
* Parámetros: token, opts (JSON) {query, ini,count, sort}
* Resultado (JSON): [user]
*/
app.get('/twitter/users/:me/following', function (req, res) {
    let opts = {};
    if (req.query.opts) opts =  JSON.parse(req.query.opts);
    model.listFollowing(req.query.token, opts, (err, users) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(users);
        }
    });
});

/** List followers users
* GET /twitter/users/XXX/followers 
* Recupera todos los usuarios que siguen al usuario XXX
* Parámetros: token, opts (JSON) {query, ini,count, sort}
* Resultado (JSON): [user]
*/
app.get('/twitter/users/:me/followers', function (req, res) {
    let opts = {};
    if (req.query.opts) opts =  JSON.parse(req.query.opts);
    model.listFollowers(req.query.token, opts, (err, users) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(users);
        }
    });
});

/** Follow user
* POST /twitter/users/XXX/following
* Añade un nuevo usuario a la lista de usuarios seguidos
* Parámetros: token
* Datos (JSON): {id}
*/
app.post('/twitter/users/:me/following', function (req, res) {
    model.follow(req.body.token, req.body.userId, (err) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.sendStatus(204);
        }
    });
});

/** Unfollow user
* DELETE /twitter/users/XXX/following/YYY 
* Elimina al usuario YYY de la lista de usuarios seguidos del usuario XXX
* Parámetros: token
*/
app.delete('/twitter/users/:me/following/:you', function (req, res) {
    model.unfollow(req.body.token, req.body.userId, (err) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.sendStatus(204);
        }
    });
});

/** List tweets 
* GET /twitter/tweets 
* Recupera todos los tweets del sistema
* Parámetros: token, opts (JSON) {query, ini,count, sort}
* Resultado (JSON): [tweets]
*/
app.get('/twitter/tweets', function (req, res) {
    let opts = {};
    if (req.query.opts) opts =  JSON.parse(req.query.opts);
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
app.post('/twitter/tweets', function (req, res) {
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
app.post('/twitter/tweets/:me/retweets', function (req, res) {
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
app.post('/twitter/tweets/:me/likes', function (req, res) {
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
app.post('/twitter/tweets/:me/dislikes', function (req, res) {
    model.dislike(req.body.token, req.body.tweetId, (err) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.sendStatus(204);
        }
    });
});

/** GET USER
 * GET /twitter/users/XXX 
 * Recupera el usuario con id XXX
 * Parámetros: token
 * Resultado (JSON): user
 */
app.get('/twitter/users/:me', function (req, res) {
    model.listUsers(req.query.token, {query:{_id:req.userId}}, (err, user) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(user);
        }
    });
});

/** Get Tweet by ID 
* GET /twitter/tweets/XXX 
* Recupera el tweet con id XXX
* Parámetros: token
* Resultado (JSON): tweet
*/
app.get('/twitter/tweets/:me', function (req, res) {
    model.listTweets(req.query.token, {query:{_id:req.tweetId}}, (err, tweet) => {
        if (err) {
            console.log(err.stack);
            res.status(400).send(err);
        } else {
            res.send(tweet);
        }
    });
});

app.listen(8080);
