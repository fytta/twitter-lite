const axios = require('axios');
const url = 'http://localhost:8080/twitter';

function login(email, password, cb) {
    axios.post(url + '/sessions',
        { email: email, password: password })
        .then(res => {
            cb(null, res.data.token, res.data.user)
        }).catch(err => {
            cb(err);
        });
}

function addUser(user, cb) {
    if (!user.name) cb(new Error('Property name missing'));
    else if (!user.surname) cb(new Error('Property surname missing'));
    else if (!user.email) cb(new Error('Property email missing'));
    else if (!user.nick) cb(new Error('Property nick missing'));
    else if (!user.password) cb(new Error('Property password missing'));
    else {
        axios.post(url + '/users', user)
            .then(res => {
                cb(null, res.data)
            })
            .catch(err => {
                cb(err);
            });
    }
}

function updateUser(token, user, cb) {
    if (!user.name) cb(new Error('Property name missing'));
    else if (!user.surname) cb(new Error('Property surname missing'));
    else if (!user.email) cb(new Error('Property email missing'));
    else if (!user.nick) cb(new Error('Property nick missing'));
    else if (!user.password) cb(new Error('Property password missing'));
    else {
        axios.put(url + '/users/' + token + '/update',
            { user: user, token: token },
            { params: { token: token } })
            .then(res => {
                cb(null, res.data)
            }).catch(err => {
                cb(err);
            });
    }
}

function listUsers(token, opts, cb) {
    axios.get(url + '/users/' + token + '/all',
        {
            params: { token: token, opts: JSON.stringify(opts) }
        }).then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function listFollowing(token, opts, cb) {
    axios.get(url + '/users/' + token + '/following',
        {
            params: { token: token, opts: JSON.stringify(opts) }
        }).then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function listFollowers(token, opts, cb) {
    axios.get(url + '/users/' + token + '/followers',
        {
            params: { token: token, opts: JSON.stringify(opts) }
        }).then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function follow(token, userId, cb) {
    axios.post(url + '/users/' + token + '/following',
        { userId: userId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.userId)
        })
        .catch(err => {
            cb(err);
        });
}

function unfollow(token, userId, cb) {
    axios.delete(url + '/users/' + token + '/following/' + userId,
        { data: { userId: userId, token: token }, params: { token: token } }) // El parametro debe llamarse "data"
        .then(res => {
            cb(null, res.body.token, res.body.userId)
        })
        .catch(err => {
            cb(err);
        });
}

function listTweets(token, opts, cb) {
    axios.get(url + '/tweets',
        { params: { token: token, opts: JSON.stringify(opts) } })
        .then(res => {
            cb(null, res.data)
        })
        .catch(err => {
            cb(err);
        });
}

function addTweet(token, content, cb) {
    axios.post(url + '/tweets/',
        { token: token, content: content },
        { params: { token: token } })
        .then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function addRetweet(token, tweetId, cb) {
    axios.post(url + '/tweets/' + tweetId + '/retweets',
        { token: token, tweetId: tweetId },
        { params: { token: token } })
        .then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function like(token, tweetId, cb) {
    axios.post(url + '/tweets/' + tweetId + '/likes',
        { tweetId: tweetId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.tweetId)
        })
        .catch(err => {
            cb(err);
        });
}

function dislike(token, tweetId, cb) {
    axios.post(url + '/tweets/' + tweetId + '/dislikes',
        { tweetId: tweetId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.tweetId)
        })
        .catch(err => {
            cb(err);
        });
}

function getUser(token, userId, cb) { //TODO: probar como llega en MONGO
    axios.get(url + '/users/' + userId,
        { params: { token: token} })
        .then(res => {
            cb(null, res.data)
        })
        .catch(err => {
            cb(err);
        });
}

function getTweet(token, tweetId, cb) {
    axios.get(url + '/tweets/' + tweetId,
        { params: { token: token} })
        .then(res => {
            cb(null, res.data)
        })
        .catch(err => {
            cb(err);
        });
}