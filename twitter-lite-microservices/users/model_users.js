const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
let url = 'mongodb://localhost:27017';

if (process.argv.length > 3) url = process.argv[3];
console.log('Using MongoDB url ' + url);

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
        MongoClient.connect(url, function(err, client) {
            if (err) _cb(err)
            else {
                // create new callback for closing connection
                _cb = function(err, res) {
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
    MongoClient.connect(url, function(err, client) {
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
        MongoClient.connect(url, function(err, client) {
            if (err) _cb(err)
            else {
                // create new callback for closing connection
                _cb = function(err, res) {
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
    MongoClient.connect(url, function(err, client) {
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
                if (err) _cb("model_users, list users: " + err);
                else if (!_user) _cb(new Error('Wrong token'));
                else {
                    // adapt query
                    let _query = opts.query || {};
                    for (let key in _query) {
                        if (key == '_id') _query[key] = new mongodb.ObjectID(_query[key]);
                        else if (Array.isArray(_query[key])) _query[key] = { $in: _query[key] };
                    }
                    // adapt options
                    let _opts = {};
                    if (opts.sort) _opts.sort = [
                        [opts.sort.slice(1),
                            (opts.sort.charAt(0) == '+' ? 1 : -1)
                        ]
                    ];
                    if (_query.name != null) _query.name = new RegExp(_query.name);
                    console.log(JSON.stringify(_query) + " " + JSON.stringify(_opts))

                    users.find(_query, _opts)
                        .skip(parseInt(opts.ini))
                        .limit(parseInt(opts.count))
                        .sort(_opts.sort)
                        .toArray((err, _results) => {
                            if (err) _cb("model_users, list users IN: " + err);
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
    MongoClient.connect(url, function(err, client) {
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
    MongoClient.connect(url, function(err, client) {
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
    MongoClient.connect(url, function(err, client) {
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
    MongoClient.connect(url, function(err, client) {
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

module.exports = {
    addUser,
    login,
    listUsers,
    updateUser,
    listFollowing,
    listFollowers,
    follow,
    unfollow
};