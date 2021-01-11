const axios = require('axios');
const urlUsers = 'http://localhost:8080/twitter';
const urlTweets = 'http://localhost:8081/twitter';

function login(email, password, cb) {
    axios.post(urlUsers + '/sessions', { email: email, password: password })
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
        axios.post(urlUsers + '/users', user)
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
        axios.put(urlUsers + '/users/' + token + '/update', { user: user, token: token }, { params: { token: token } })
            .then(res => {
                cb(null, res.data)
            }).catch(err => {
                cb(err);
            });
    }
}

function listUsers(token, opts, cb) {
    axios.get(urlUsers + '/users/' + token + '/all', {
        params: { token: token, opts: JSON.stringify(opts) }
    }).then(res => {
        cb(null, res.data)
    }).catch(err => {
        cb(err);
    });
}

function listFollowing(token, opts, cb) {
    axios.get(urlUsers + '/users/' + token + '/following', {
        params: { token: token, opts: JSON.stringify(opts) }
    }).then(res => {
        cb(null, res.data)
    }).catch(err => {
        cb(err);
    });
}

function listFollowers(token, opts, cb) {
    axios.get(urlUsers + '/users/' + token + '/followers', {
        params: { token: token, opts: JSON.stringify(opts) }
    }).then(res => {
        cb(null, res.data)
    }).catch(err => {
        cb(err);
    });
}

function follow(token, userId, cb) {
    axios.post(urlUsers + '/users/' + token + '/following', { userId: userId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.userId)
        })
        .catch(err => {
            cb(err);
        });
}

function unfollow(token, userId, cb) {
    axios.delete(urlUsers + '/users/' + token + '/following/' + userId, { data: { userId: userId, token: token }, params: { token: token } }) // El parametro debe llamarse "data"
        .then(res => {
            cb(null, res.body.token, res.body.userId)
        })
        .catch(err => {
            cb(err);
        });
}

function getUser(token, userId, cb) {
    axios.get(urlUsers + '/users/' + userId, {
        params: { token: token }
    }).then(res => {
        cb(null, res.data)
    }).catch(err => {
        cb(err);
    });
}

function listTweets(token, opts, cb) {
    axios.get(urlTweets + '/tweets', { params: { token: token, opts: JSON.stringify(opts) } })
        .then(res => {
            cb(null, res.data)
        })
        .catch(err => {
            cb(err);
        });
}

function addTweet(token, content, cb) {
    axios.post(urlTweets + '/tweets/', { token: token, content: content }, { params: { token: token } })
        .then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function addRetweet(token, tweetId, cb) {
    axios.post(urlTweets + '/tweets/' + tweetId + '/retweets', { token: token, tweetId: tweetId }, { params: { token: token } })
        .then(res => {
            cb(null, res.data)
        }).catch(err => {
            cb(err);
        });
}

function like(token, tweetId, cb) {
    axios.post(urlTweets + '/tweets/' + tweetId + '/likes', { tweetId: tweetId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.tweetId)
        })
        .catch(err => {
            cb(err);
        });
}

function dislike(token, tweetId, cb) {
    axios.post(urlTweets + '/tweets/' + tweetId + '/dislikes', { tweetId: tweetId, token: token }, { params: { token: token } })
        .then(res => {
            cb(null, res.data.token, res.data.tweetId)
        })
        .catch(err => {
            cb(err);
        });
}

function getTweet(token, tweetId, cb) {
    axios.get(urlTweets + '/tweets/' + tweetId, { params: { token: token } })
        .then(res => {
            cb(null, res.data)
        })
        .catch(err => {
            cb(err);
        });
}