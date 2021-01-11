const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const axios = require('axios');

let urlUsers = 'http://users:8080/twitter';
//if (process.argv.length > 3) urlUsers = process.argv[3];
let url = 'mongodb://localhost:27017';
if (process.argv.length > 3) url = process.argv[3];
console.log('Using MongoDB url ' + url + ' and user microservice ' + urlUsers);

/**
 * verificar que el usuario dispone de autorización, 
 * comprobando el token
 */
function getSession(token, cb) {
    axios.get(urlUsers + '/sessions', {
            params: { token: token }
        })
        .then(res => {
            cb(null, res.data);
        })
        .catch(err => {
            cb(err);
        });
}

/**
 * Añade un nuevo tweet. El callback recibe el tweet creado.
 * @param {*} token 
 * @param {*} content 
 * @param {*} cb 
 */
function addTweet(token, content, cb) {
    if (!content) cb(new Error('Tweet empty.'));
    else {
        getSession(token, (err, user) => {
            if (err) cb(err);
            else {
                MongoClient.connect(url, function(err, client) {
                    if (err) cb(err)
                    else {
                        // create new callback for closing connection
                        function _cb(err, res) {
                            client.close();
                            cb(err, res);
                        }
                        let db = client.db('twitter_lite');
                        let tweets = db.collection('tweets');
                        let tweet = {
                            owner: new mongodb.ObjectID(user.id),
                            content: content,
                            date: Date.now(),
                            likes: [],
                            dislikes: []
                        };

                        tweets.insertOne(tweet, (err, result) => {
                            if (err) _cb(err);
                            else {
                                _cb(null, {
                                    id: result.insertedId.toHexString(),
                                    owner: tweet.owner,
                                    content: tweet.content,
                                    date: tweet.date,
                                    likes: [],
                                    dislikes: []
                                });
                            }
                        });
                    }
                });
            }
        });
    }
}

/**
 * El usuario autenticado reteetea otro tweet
   El callback recibe el retweet creado.
 * @param {*} token 
 * @param {*} tweetId 
 * @param {*} cb 
 */
function addRetweet(token, tweetId, cb) {

    getSession(token, (err, user) => {
        if (err) cb(err);
        else {
            MongoClient.connect(url, function(err, client) {
                if (err) _cb(err)
                else {
                    // create new callback for closing connection
                    function _cb(err, res) {
                        client.close();
                        cb(err, res);
                    }
                    let db = client.db('twitter_lite');
                    let tweets = db.collection('tweets');
                    tweets.findOne({ _id: new mongodb.ObjectID(tweetId) }, (err, _tweet) => {
                        if (err) _cb(err);
                        else if (!_tweet) _cb(new Error('Tweet does not exist.'));
                        else {
                            if (err) _cb(err);
                            else if (!user) _cb(new Error('Wrong token'));
                            else {
                                console.log("HERE " + user)
                                let retweet = {
                                    owner: new mongodb.ObjectID(user.id),
                                    date: Date.now(),
                                    ref: _tweet,
                                    likes: [],
                                    dislikes: []
                                };
                                tweets.insertOne(retweet, (err, result) => {
                                    if (err) _cb(err);
                                    else _cb(null, retweet);
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}

/**
 * Hace uso del microservicio users para obtener el 
 * usuario con el identificador del parametro owner
 * @param {*} token 
 * @param {*} owner 
 */
function getUser(token, owner) {
    return axios.get(urlUsers + '/users/' + owner.toHexString(), {
            params: { token: token }
        })
        .then(res => {
            return res.data;
        })
        .catch(err => {
            console.log(err)
        });
}

/**
 * El usuario autenticado lista todos los tweets, con diversas opciones.
   El callback recibe un vector con cada tweet incluyendo retweet
 * @param {*} opts -opts.query: contiene la consulta
                               query: {name:['Pepe','Juan']};
                   -opts.ini: Indica desde que resultado quieres obtener.
                   -opts.count: Numero de resultados a obtener.
                   -opts.sort: ordenar resultados por (+|-) campo
                               {sort: '+name'} 
 * @param {*} cb 
 */
function listTweets(token, opts, cb) {
    getSession(token, (err, user) => {
        if (err) cb(err);
        else {
            MongoClient.connect(url, function(err, client) {
                if (err) console.log(err)
                else {
                    // create new callback for closing connection
                    function _cb(err, result) {
                        client.close();
                        cb(err, result);
                    }

                    let db = client.db('twitter_lite');
                    let tweets = db.collection('tweets');
                    if (opts.query.owner) {
                        let objIds = [];
                        opts.query.owner.forEach((elem) => {
                            objIds.push(new mongodb.ObjectID(elem));
                        });
                        opts.query.owner = objIds;
                    }
                    // adapt query
                    let _query = opts.query || {};
                    for (let key in _query) {
                        if (Array.isArray(_query[key])) _query[key] = { $in: _query[key] };

                    }
                    // adapt options
                    let _opts = {};
                    if (opts.sort) _opts.sort = [
                        [opts.sort.slice(1),
                            (opts.sort.charAt(0) == '+' ? 1 : -1)
                        ]
                    ];
                    if (_query.content != null) _query.content = new RegExp(_query.content);
                    tweets.find(_query)
                        .skip(parseInt(opts.ini))
                        .limit(parseInt(opts.count))
                        .sort(_opts.sort)
                        .toArray(async(err, tweets) => {
                            await Promise.all(tweets.map(async(tweet) => {
                                let tweetOwner = await getUser(token, tweet.owner).then(res => { return res[0]; });
                                if (tweet.ref) {
                                    let tweetRefOwner = await getUser(token, tweet.ref.owner).then(res => { return res[0]; });
                                    return {
                                        id: tweet._id,
                                        owner: tweetRefOwner._id,
                                        ownerName: tweetRefOwner.name,
                                        ownerSurname: tweetRefOwner.surname,
                                        ownerNick: tweetRefOwner.nick,
                                        date: tweet.date,
                                        ref: tweet.ref,
                                        refDate: tweet.ref.date,
                                        refOwner: tweet.owner,
                                        refOwnerName: tweetOwner.name,
                                        refOwnerSurname: tweetOwner.surname,
                                        refOwnerNick: tweetOwner.nick,
                                        likes: tweet.likes.length,
                                        dislikes: tweet.dislikes.length,
                                        avatar: tweetRefOwner.avatar
                                    }
                                } else {
                                    return {
                                        id: tweet._id,
                                        owner: tweet.owner,
                                        ownerName: tweetOwner.name,
                                        ownerSurname: tweetOwner.surname,
                                        ownerNick: tweetOwner.nick,
                                        date: tweet.date,
                                        ref: tweet.ref,
                                        content: tweet.content,
                                        likes: tweet.likes.length,
                                        dislikes: tweet.dislikes.length,
                                        avatar: tweetOwner.avatar
                                    }
                                }
                            })).then(values => {
                                _cb(null, values);
                            })
                        });
                }
            });
        }
    });
}

/**
 * El usuario indica que le gusta un tweet.
 * Si el usuario ya le dio like, lo quita.
 * @param {*} token 
 * @param {*} tweetId 
 * @param {*} cb 
 */
function like(token, tweetId, cb) {
    MongoClient.connect(url, function(err, client) {
        if (err) console.log(err);
        else {
            // create new callback for closing connection
            function _cb(err, result) {
                client.close();
                cb(err, result);
            }

            let db = client.db('twitter_lite');

            let tweets = db.collection('tweets');
            tweets.findOne({ _id: new mongodb.ObjectID(tweetId) }, (err, tweet) => {
                if (err) _cb(err);
                else {
                    // Si tiene dislike lo quita
                    if (tweet.dislikes.length > 0) {
                        tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $pull: { dislikes: new mongodb.ObjectID(token) } });
                    }
                    // Poner like
                    if (tweet.likes.length > 0) {
                        tweet.likes.forEach(elem => {
                            if (elem.toHexString() == token)
                                tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $pull: { likes: new mongodb.ObjectID(token) } });

                            else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $push: { likes: new mongodb.ObjectID(token) } });
                        });
                    } else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $push: { likes: new mongodb.ObjectID(token) } });
                }
                _cb(null);
            });
        }
    });
}


/**
 * El usuario indica que no le gusta un tweet.
 * Si ya le dio dislike, lo quita.
 * @param {*} token 
 * @param {*} tweetId 
 * @param {*} cb 
 */
function dislike(token, tweetId, cb) {
    MongoClient.connect(url, function(err, client) {
        if (err) console.log(err);
        else {
            // create new callback for closing connection
            function _cb(err, result) {
                client.close();
                cb(err, result);
            }

            let db = client.db('twitter_lite');
            let tweets = db.collection('tweets');
            tweets.findOne({ _id: new mongodb.ObjectID(tweetId) }, (err, tweet) => {
                if (err) _cb(err);
                else {
                    // Si tiene like lo quita
                    if (tweet.likes.length > 0) {
                        tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $pull: { likes: new mongodb.ObjectID(token) } });
                    }
                    // Poner dislike
                    if (tweet.dislikes.length > 0) {
                        tweet.dislikes.forEach(elem => {
                            if (elem.toHexString() == token)
                                tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $pull: { dislikes: new mongodb.ObjectID(token) } });

                            else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $push: { dislikes: new mongodb.ObjectID(token) } });
                        });
                    } else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) }, { $push: { dislikes: new mongodb.ObjectID(token) } });
                }
                _cb(null);
            });
        }
    });
}

module.exports = {
    listTweets,
    addTweet,
    addRetweet,
    like,
    dislike
};