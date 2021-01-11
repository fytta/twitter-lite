const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const url = 'mongodb://localhost:27017';

// API Implementation //
/**
 * Añade un nuevo usuario. El callback recibe el usuario creado. 
 * @param {*} user 
 * @param {*} cb 
 */
function addUser(user, cb) {
    if (!user.name) cb(new Error('Property name missing'));
    else if (!user.surname) cb(new Error('Property surname missing'));
    else if (!user.email) cb(new Error('Property email missing'));
    else if (!user.nick) cb(new Error('Property nick missing'));
    else if (!user.password) cb(new Error('Property password missing'));
    else {
        MongoClient.connect(url, function (err, client) {
            if (err) _cb(err)
            else {
                // create new callback for closing connection
                _cb = function (err, res) {
                    client.close();
                    cb(err, res);
                }
                let db = client.db('twitter_lite');
                let users = db.collection('users');
                users.findOne({ $or: [{ email: user.email }, { nick: user.nick }] },
                    (err, _user) => {
                        if (err) _cb(err);
                        else if (_user) _cb(new Error('User already exists'));
                        else {
                            user.following = [];
                            users.insertOne(user, (err, result) => {
                                if (err) _cb(err);
                                else {
                                    _cb(null, {
                                        id: result.insertedId.toHexString(),
                                        name: user.name,
                                        surname: user.name,
                                        email: user.email,
                                        nick: user.nick,
                                        avatar: user.avatar
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
 * Autentica a un usuario.
   El callback recibe un token y el usuario autenticado. 
   El token identifica al usuario y permitirá el acceso al resto de operaciones.
 * @param {*} email 
 * @param {*} password 
 * @param {*} cb 
 */
function login(email, password, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) cb(err);
        else {
            console.log('connected');

            function _cb(err, resToken, resUser) {
                client.close();
                cb(err, resToken, resUser);
            }

            var db = client.db('twitter_lite');
            var col = db.collection('users');
            col.findOne({ email: email, password: password }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) cb(new Error('User not found'));
                else {
                    _cb(null, _user._id.toHexString(), {
                        id: _user._id.toHexString(),
                        name: _user.name,
                        surname: _user.surname,
                        email: _user.email,
                        nick: _user.nick,
                        password: _user.password,
                        following: _user.following,
                        avatar: _user.avatar
                    });
                }
            });
        }
    });
}

/**
 * Actualiza el usuario autenticado con los datos suministrados.
   El callback recibe el usuario actualizado.
 * @param {*} token 
 * @param {*} user 
 * @param {*} cb 
 */
function updateUser(token, user, cb) {
    if (!user.name) cb(new Error('Property name missing'));
    else if (!user.surname) cb(new Error('Property surname missing'));
    else if (!user.email) cb(new Error('Property email missing'));
    else if (!user.nick) cb(new Error('Property nick missing'));
    else if (!user.password) cb(new Error('Property password missing'));
    else {
        MongoClient.connect(url, function (err, client) {
            if (err) _cb(err)
            else {
                // create new callback for closing connection
                _cb = function (err, res) {
                    client.close();
                    cb(err, res);
                }
                let db = client.db('twitter_lite');
                let users = db.collection('users');
                let myQuery = { _id: mongodb.ObjectID(token) };
                let newValue = {
                    $set: {
                        name: user.name,
                        surname: user.surname,
                        email: user.email,
                        password: user.password,
                        nick: user.nick,
                        avatar: user.avatar
                    }
                };
                users.updateOne(myQuery, newValue, (err, queryResult) => {
                    if (err) _cb(err);
                    else if (!queryResult) cb(new Error('User not found'));
                    else {
                        _cb(null, queryResult);
                    }
                });
            }
        });
        cb(null, user);
    }
}

/**
 * Lista los usuarios, con diversas opciones.
   El callback recibe un vector de usuarios.
 * @param {*} token 
 * @param {*} opts 
 * @param {*} cb 
 */
function listUsers(token, opts, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) console.log(err)
        else {
            // create new callback for closing connection
            function _cb(err, result) {
                client.close();
                cb(err, result);
            }

            let db = client.db('twitter_lite');
            let users = db.collection('users');
            users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
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
                    if (_query.name != null) _query.name = new RegExp(_query.name);
                    users.find(_query, _opts)
                        .skip(parseInt(opts.ini))
                        .limit(parseInt(opts.count))
                        .sort(_opts.sort)
                        .toArray((err, _results) => {
                            if (err) _cb(err);
                            else {
                                let results = _results.map((user) => {
                                    return {
                                        id: user._id.toHexString(),
                                        name: user.name,
                                        surname: user.surname,
                                        email: user.email,
                                        nick: user.nick,
                                        avatar: user.avatar
                                    };
                                });
                                _cb(null, results);
                            }
                        });
                }
            });
        }
    });
}

/**
 * Lista los usuarios a los que sigue el usuario especificado por token,
   con diversas opciones. El callback recibe un vector de usuarios.
 * @param {*} token 
 * @param {*} opts -opts.query: contiene la consulta
                   -opts.ini: índice del primer resultado
                   -opts.count: número máximo de resultados
                   -opts.sort: ordenar resultados por (+|-) campo 
 * @param {*} cb 
 */
function listFollowing(token, opts, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) cb(err)
        else {
            // create new callback for closing connection
            function _cb(err, results) {
                client.close();
                cb(err, results);
            }
            let db = client.db('twitter_lite');
            let users = db.collection('users');
            users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
                    // adapt query
                    let _query = opts.query || {};
                    for (let key in _query) {
                        if (Array.isArray(_query[key])) _query[key] = { $in: _query[key] };
                    }
                    // adapt options
                    let _opts = {}
                    if (opts.sort) _opts.sort = [
                        [opts.sort.slice(1),
                        (opts.sort.charAt(0) == '+' ? 1 : -1)
                        ]
                    ];
                    if (_query.name != null) _query.name = new RegExp(_query.name);
                    let andQuery = { _id: { $in: _user.following } };
                    users.find({ $and: [_query, andQuery] })
                        .skip(parseInt(opts.ini))
                        .limit(parseInt(opts.count))
                        .sort(_opts.sort)
                        .toArray((err, _results) => {
                            if (err) _cb(err);
                            else {
                                let results = _results.map((user) => {
                                    return {
                                        id: user._id.toHexString(),
                                        name: user.name,
                                        surname: user.surname,
                                        email: user.email,
                                        nick: user.nick,
                                        avatar: user.avatar
                                    };
                                });
                                _cb(null, results);
                            }
                        });
                }
            });
        }
    });
}

/**
* Lista los usuarios que siguen al usuario especificado por token,
  con diversas opciones. El callback recibe un vector de usuarios.
 * @param {*} token 
 * @param {*} opts -opts.query: contiene la consulta
                   -opts.ini: índice del primer resultado
                   -opts.count: número máximo de resultados
                   -opts.sort: ordenar resultados por (+|-) campo  
 * @param {*} cb 
 */
function listFollowers(token, opts, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) cb(err)
        else {
            // create new callback for closing connection
            function _cb(err, results) {
                client.close();
                cb(err, results);
            }
            let db = client.db('twitter_lite');
            let users = db.collection('users');

            // adapt query
            let _query = opts.query || {};
            for (let key in _query) {
                if (Array.isArray(_query[key])) _query[key] = { $in: _query[key] };
            }
            // adapt options
            let _opts = {}
            if (opts.sort) _opts.sort = [
                [opts.sort.slice(1),
                (opts.sort.charAt(0) == '+' ? 1 : -1)
                ]
            ];

            users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
                    let inQuery = { $and: [{ following: { $in: [new mongodb.ObjectID(token)] } }, _query] };
                    users.find(inQuery)
                        .skip(parseInt(opts.ini))
                        .limit(parseInt(opts.count))
                        .sort(_opts.sort)
                        .toArray((err, _results) => {
                            let results = _results.map((user) => {
                                return {
                                    id: user._id.toHexString(),
                                    name: user.name,
                                    surname: user.surname,
                                    email: user.email,
                                    nick: user.nick,
                                    avatar: user.avatar
                                };
                            });
                            _cb(null, results);
                        });
                }
            });
        }
    });
}

/**
 * El usuario solicita seguir a otro.
 * @param {*} token 
 * @param {*} userId 
 * @param {*} cb 
 */
function follow(token, userId, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) cb(err)
        else {
            // create new callback for closing connection
            function _cb(err, results) {
                client.close();
                cb(err, results);
            }
            let db = client.db('twitter_lite');
            let users = db.collection('users');
            users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
                    _user.following.forEach(element => {
                        if (element.toHexString() == userId) _cb(new Error('You are following this user'));
                    });
                    users.updateOne({ _id: new mongodb.ObjectID(token) }, { $push: { following: new mongodb.ObjectID(userId) } },
                        (err) => {
                            if (err) _cb(err);
                            else _cb(null);
                        });
                }
            });
        }
    });
}

/**
 * El usuario solicita dejar de seguir a otro.
 * @param {*} token 
 * @param {*} userId 
 * @param {*} cb 
 */
function unfollow(token, userId, cb) {
    MongoClient.connect(url, function (err, client) {
        if (err) cb(err)
        else {
            // create new callback for closing connection
            function _cb(err, results) {
                client.close();
                cb(err, results);
            }
            let db = client.db('twitter_lite');
            let users = db.collection('users');
            users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                if (err) _cb(err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
                    _user.following.forEach(element => {
                        if (element.toHexString() == userId) {
                            users.findOneAndUpdate({ _id: new mongodb.ObjectID(token) }, { $pull: { following: new mongodb.ObjectID(userId) } },
                                (err) => {
                                    if (err) _cb(err);
                                    else _cb(null);
                                });
                        }
                    });
                }
            });
        }
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
        MongoClient.connect(url, function (err, client) {
            if (err) cb(err)
            else {
                // create new callback for closing connection
                function _cb(err, res) {
                    client.close();
                    cb(err, res);
                }
                let db = client.db('twitter_lite');
                let tweets = db.collection('tweets');
                let users = db.collection('users');
                if (err) _cb(err);
                else {
                    users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                        if (err) _cb(err);
                        else if (!_user) _cb(new Error('Wrong token'));
                        else {
                            let tweet = {
                                owner: _user._id,
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

    MongoClient.connect(url, function (err, client) {
        if (err) _cb(err)
        else {
            // create new callback for closing connection
            function _cb(err, res) {
                client.close();
                cb(err, res);
            }
            let db = client.db('twitter_lite');
            let tweets = db.collection('tweets');
            let users = db.collection('users');

            tweets.findOne({ _id: new mongodb.ObjectID(tweetId) }, (err, _tweet) => {
                if (err) _cb(err);
                else if (!_tweet) _cb(new Error('Tweet does not exist.'));
                else {
                    users.findOne({ _id: new mongodb.ObjectID(token) }, (err, _user) => {
                        if (err) _cb(err);
                        else if (!_user) _cb(new Error('Wrong token'));
                        else {
                            let retweet = {
                                owner: _user._id,
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
                    });
                }
            });
        }
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
    console.log(opts)
    MongoClient.connect(url, function (err, client) {
        if (err) console.log(err)
        else {
            // create new callback for closing connection
            function _cb(err, result) {
                client.close();
                cb(err, result);
            }

            let db = client.db('twitter_lite');
            let tweets = db.collection('tweets');
            let users = db.collection('users');
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
                .toArray(async (err, tweets) => {
                    await Promise.all(tweets.map(async (tweet) => {
                        let tweetOwner = await users.findOne({ _id: tweet.owner });
                        if (tweet.ref) {
                            let tweetRefOwner = await users.findOne({ _id: tweet.ref.owner });
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
                        }
                        else {
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

/**
 * El usuario indica que le gusta un tweet.
 * Si el usuario ya le dio like, lo quita.
 * @param {*} token 
 * @param {*} tweetId 
 * @param {*} cb 
 */
function like(token, tweetId, cb) {
    MongoClient.connect(url, function (err, client) {
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
                        tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                            { $pull: { dislikes: new mongodb.ObjectID(token) } });
                    }
                    // Poner like
                    if (tweet.likes.length > 0) {
                        tweet.likes.forEach(elem => {
                            if (elem.toHexString() == token)
                                tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                                    { $pull: { likes: new mongodb.ObjectID(token) } });

                            else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                                { $push: { likes: new mongodb.ObjectID(token) } });
                        });
                    } else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                        { $push: { likes: new mongodb.ObjectID(token) } });
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
    MongoClient.connect(url, function (err, client) {
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
                        tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                            { $pull: { likes: new mongodb.ObjectID(token) } });
                    }
                    // Poner dislike
                    if (tweet.dislikes.length > 0) {
                        tweet.dislikes.forEach(elem => {
                            if (elem.toHexString() == token)
                                tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                                    { $pull: { dislikes: new mongodb.ObjectID(token) } });

                            else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                                { $push: { dislikes: new mongodb.ObjectID(token) } });
                        });
                    } else tweets.updateOne({ _id: new mongodb.ObjectID(tweetId) },
                        { $push: { dislikes: new mongodb.ObjectID(token) } });
                }
                _cb(null);
            });
        }
    });
}

module.exports = {
    addUser,
    login,
    listUsers,
    updateUser,
    listFollowing,
    listFollowers,
    follow,
    unfollow,
    listTweets,
    addTweet,
    addRetweet,
    like,
    dislike
};