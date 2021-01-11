/**
 * Diccionario de ventanas pages que contendrá una entrada
 * por cada ventana, y su valor será un objeto con todas las funciones que necesitaremos para
 * gestionar dicha ventana. Todas las ventanas dispondrán de dos funciones show()/hide() que serán
 * invocadas cuando la ventana se muestra/oculta, y serán responsables de inicializar/finalizar la
 * ventana respectivamente. Además, añadiremos todas las funciones necesarias para reaccionar a
 * los eventos.
 */
const fs = require('fs');
const pathViews = 'app/www';
const mongodb = require('mongodb');

let pages = {};
let currentPage = null;

/**
 * implementará el mecanismo de navegación propiamente dicho.
 * Esta función se encargará de ocultar la ventana actual (si había), 
 * cargar la ventana destino y de mostrarla.
 * @param {*} page 
 * @param {*} data 
 * @param {*} cb 
 */
function navigateTo(page, data, cb) {
    console.log(`navigateTo(${page}, ${data})`);
    if (!pages[page]) {
        if (cb) cb(new Error('Target page not found'));
    } else {
        // - scanning page
        if (pages[page].content) {
            // - content cached
            if (currentPage) currentPage.hide();
            document.getElementById('app').innerHTML = pages[page].content;
            currentPage = pages[page];
            currentPage.show(data);
            if (cb) cb();
        } else {
            // - content not cached
            fs.readFile(pathViews + '/' + page + '.html', (err, content) => {
                if (err) {
                    if (cb) cb(err);
                } else {
                    // - cache content
                    let parser = new DOMParser();
                    let doc = parser.parseFromString(content, "text/html");
                    let nodes = doc.getElementsByTagName('body');
                    pages[page].content = nodes[0].innerHTML;
                    if (currentPage) currentPage.hide();
                    document.getElementById('app').innerHTML = pages[page].content;
                    currentPage = pages[page];
                    currentPage.show(data);
                    if (cb) cb();
                }
            });
        }
    }
}


pages.login = {
    show: function (data) { console.log('login.show()'); },
    hide: function () { console.log('login.hide()'); },
    register: function () {
        console.log('login.register()');
        navigateTo('register');
    },
    login: function () {
        console.log('login.login()');
        let email = document.getElementById('inputEmail').value;
        let password = document.getElementById('inputPassw').value;
        login(email, password, (err, token, user) => {
            if (err) document.getElementById('lblWrongLogin').innerText = 'User or password incorrect.';
            else {
                document.getElementById('lblWrongLogin').innerText = '';
                window.token = token;
                window.currentUser = user;
                navigateTo('home');
            }
        });
    }
};

pages.register = {
    properties: [
        user = {
            name: '',
            surname: '',
            password: '',
            email: '',
            nick: '',
            avatar: ''
        }
    ],
    show: function (data) {
        console.log('register.show()');
        var nodes = document.querySelectorAll('.modal');
        var modals = M.Modal.init(nodes, {});

        // Evento para actualizar la imagen al clickar en el avatar
        var uploadImg = document.getElementById('file');
        var avatarImg = document.getElementById('avatar-img');
        avatarImg.addEventListener('click', () => {
            uploadImg.click();
        });
        uploadImg.addEventListener('change', () => {
            let file = uploadImg.files[0];
            var reader = new FileReader();
            reader.onloadend = function () {
                pages.register.properties[0].avatar = reader.result;
                document.getElementById('avatar-img').src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    },
    hide: function () { console.log('register.hide()'); },
    addUser: function () {
        let modalContent = document.getElementById('modal-content');

        let name = document.getElementById('inputName').value;
        let password = document.getElementById('inputPassw').value;
        let surname = document.getElementById('inputSurname').value;
        let email = document.getElementById('inputEmail').value;
        let nick = document.getElementById('inputNick').value;
        let u = pages.register.properties[0];
        let uavatar = u.avatar == '' ? 'images/user.svg' : u.avatar;
        user = {
            name: name,
            surname: surname,
            password: password,
            email: email,
            nick: '@' + nick,
            avatar: uavatar
        };

        addUser(user, (err, result) => {
            if (err) {
                modalContent.innerHTML = `<h4>Register error!</h4>
                                          <p>You have to fill in all the fields.</p>`;
            } else {
                modalContent.innerHTML = `<h4>Welcome to our app!</h4>
                                        <p>We send you an email to confirm your application</p>`;
                document.getElementById('welcome-modal-btn').addEventListener('click', () => {
                    pages.register.login();
                });
            }
        });
        u = {
            name: '',
            surname: '',
            password: '',
            email: '',
            nick: '',
            avatar: ''
        }
    },
    login: function () {
        console.log('login.show()');
        navigateTo('login');
    }
};

pages.home = {
    show: function (data) {
        console.log('home.show()');
        // Init sidenav
        var nodes = document.querySelectorAll('.sidenav');
        var sidenavs = M.Sidenav.init(nodes, { edge: 'left' });
        // Init modal
        var nodes = document.querySelectorAll('.modal');
        var modals = M.Modal.init(nodes, {});
        // Change user template
        document.getElementById('lblUser').innerHTML = currentUser.name + ' ' + currentUser.surname;
        document.getElementById('lblEmail').innerHTML = currentUser.email;
        document.getElementById('avatar-img').src = currentUser.avatar;
        // Generate tweets dynamically
        pages.home.refresh();
    },
    hide: function () { console.log('home.hide()'); },
    refresh: function () {
        console.log('home.refresh()');
        // 1. get query
        let search = document.getElementById('txtSearch').value;
        let query = {};
        if (search) {
            if (search.indexOf(',') == -1) query.content = search;
            else {
                search.split(',').forEach((cond) => {
                    [field, value] = cond.split('=');
                    query[field] = value;
                });
            }
        }
        // 2. get following users
        listFollowing(token, {}, (err, following) => {
            if (err) {
                alert('Unable to list following: ' + err.stack);
                return;
            }
            
            let ids = following.map((user) => new mongodb.ObjectID(user.id));
            ids.push(new mongodb.ObjectID(token)); //para que se vean tambien mis propios tweets.
            query.owner = ids;
            // 3. search tweets
            let html = '';
            listTweets(token, { query: query, ini: 0, count: 100 }, (err, tweets) => {
                if (err) {
                    alert('Unable to list tweets: ' + err.stack);
                    return;
                }
                tweets.forEach(tweet => {
                    if (tweet.ref) html += retweetTemplate(tweet, "home");
                    else html += tweetTemplate(tweet, true, "home");
                    document.getElementById('tweets').innerHTML = html || 'No tweets';
                });
            });
        });
    },
    retweet: function (tweetId) {
        console.log(`home.retweet(${tweetId})`);
        addRetweet(currentUser.id, tweetId, (err) => { });
        pages.home.refresh();

    },
    like: function (tweetId) {
        console.log(`home.like(${tweetId})`);
        like(token, tweetId, (err) => { });
        pages.home.refresh();
    },
    dislike: function (tweetId) {
        console.log(`home.dislike(${tweetId})`);
        dislike(token, tweetId, (err) => { });
        pages.home.refresh();
    },
    sendTweet: function () {
        console.log('home.sendTweet()');
        let content = document.getElementById('txtTweet').value;
        if (content != '') {
            addTweet(token, content, (err, tweet) => {
                if (err) alert('Error: ' + err.stack);
            });
            document.getElementById('txtTweet').value = '';
            pages.home.refresh();
        }
    },
    explore: function () {
        console.log('explore.show()');
        navigateTo('explore');
    },
    people: function () {
        console.log('people.show()');
        navigateTo('people');
    },
    profile: function () {
        console.log('profile.show()');
        navigateTo('profile');
    },
    exit: function () {
        console.log('exit.show()');
        navigateTo('login');
    }
};

pages.explore = {
    show: function (data) {
        console.log('explore.show()');
        // Init sidenav
        var nodes = document.querySelectorAll('.sidenav');
        var sidenavs = M.Sidenav.init(nodes, { edge: 'left' });
        // Init modal
        var nodes = document.querySelectorAll('.modal');
        var modals = M.Modal.init(nodes, {});
        // Change user template

        document.getElementById('lblUser').innerHTML = currentUser.name + ' ' + currentUser.surname;
        document.getElementById('lblEmail').innerHTML = currentUser.email;
        document.getElementById('avatar-img').src = currentUser.avatar;
        // Generate tweets dynamically
        pages.explore.refresh();
    },
    hide: function () { console.log('explore.hide()'); },
    refresh: function () {
        console.log('explore.refresh()');
        // 1. get query
        let search = document.getElementById('txtSearch').value;
        let query = {};
        if (search) {
            if (search.indexOf(',') == -1) query.content = search;
            else {
                search.split(',').forEach((cond) => {
                    [field, value] = cond.split('=');
                    query[field] = value;
                });
            }
        }
        // 2. get following users
        listFollowing(token, {}, (err, following) => {
            if (err) {
                alert('Unable to list following: ' + err.stack);
                return;
            }
            let ids = following.map((user) => new mongodb.ObjectID(user.id));
            ids.push(new mongodb.ObjectID(token)); //para que se vean tambien mis propios tweets.
            // 3. search tweets
            let html = '';
            listTweets(token, { query: query, ini: 0, count: 100 }, (err, tweets) => {
                if (err) {
                    alert('Unable to list tweets: ' + err.stack);
                    return;
                }

                tweets.forEach(tweet => {
                    let isFollowingUser = false;
                    ids.forEach(elem => {
                        if (elem.toString() === tweet.owner.toString()) {
                            isFollowingUser = true;
                        }
                    });
                    if (tweet.ref) html += retweetTemplate(tweet, "explore");
                    else html += tweetTemplate(tweet, isFollowingUser, "explore");
                    document.getElementById('tweets').innerHTML = html || 'No tweets';
                });
            });
        });
    },
    retweet: function (tweetId) {
        console.log(`explore.retweet(${tweetId})`);
        addRetweet(currentUser.id, tweetId, (err) => { });
        pages.explore.refresh();

    },
    like: function (tweetId) {
        console.log(`explore.like(${tweetId})`);
        like(token, tweetId, (err) => { });
        pages.explore.refresh();
    },
    dislike: function (tweetId) {
        console.log(`explore.dislike(${tweetId})`);
        dislike(token, tweetId, (err) => { });
        pages.explore.refresh();
    },
    sendTweet: function () {
        console.log('explore.sendTweet()');
        let content = document.getElementById('txtTweet').value;
        if (content != '') {
            addTweet(token, content, (err, tweet) => {
                if (err) alert('Error: ' + err.stack);
            });
            document.getElementById('txtTweet').value = '';
            pages.home.refresh();
        }
        pages.explore.refresh();
    },
    follow: function (userId) {
        follow(token, userId, (err) => {
            if (err) new Error(err);
            pages.explore.refresh();
        });
    },
    home: function () {
        console.log('home.show()');
        navigateTo('home');
    },
    people: function () {
        console.log('people.show()');
        navigateTo('people');
    },
    profile: function () {
        console.log('profile.show()');
        navigateTo('profile');
    },
    exit: function () {
        console.log('exit.show()');
        navigateTo('login');
    }
};

pages.people = {
    show: function (data) {
        console.log('people.show()');
        // Init sidenav
        var nodes = document.querySelectorAll('.sidenav');
        var sidenavs = M.Sidenav.init(nodes, { edge: 'left' });
        // Init modal
        var nodes = document.querySelectorAll('.modal');
        var modals = M.Modal.init(nodes, {});
        // Init tabs
        var nodes = document.querySelectorAll('.tabs');
        var tabs = M.Tabs.init(nodes, { swipeable: true });

        // Change user template
        document.getElementById('lblUser').innerHTML = currentUser.name + ' ' + currentUser.surname;
        document.getElementById('lblEmail').innerHTML = currentUser.email;
        document.getElementById('avatar-img').src = currentUser.avatar;
        // Generate people cards dynamically
        pages.people.refresh();
    },
    hide: function () { console.log('people.hide()'); },
    refresh: function () {
        console.log('people.refresh()');
        // 1. get query
        let search = document.getElementById('txtSearch').value;
        let query = {};
        if (search) {
            if (search.indexOf(',') == -1) query.name = search;
            else {
                search.split(',').forEach((cond) => {
                    [field, value] = cond.split('=');
                    query[field] = value;
                });
            }
        }
        // 2. get following users
        let followingIds = [];
        listFollowing(token, { query: query, ini: 0, count: 100 }, (err, usersList) => {
            if (err) {
                alert('Unable to list following users: ' + err.stack);
                return;
            }
            // 4. build people list
            let html = '';
            usersList.forEach((user) => {
                followingIds.push(user.id);
                if (user.id != token) html += peopleCardTemplate(user, true);
            });
            document.getElementById('following-collection').innerHTML = html;
        });
        listUsers(token, { query: query, ini: 0, count: 100 }, (err, usersList) => {
            if (err) {
                alert('Unable to list users: ' + err.stack);
                return;
            }
            // 4. build people list
            let html = '';
            usersList.forEach((user) => {
                if (user.id != token) {
                    let isFollowingUser = followingIds.includes(user.id);
                    html += peopleCardTemplate(user, isFollowingUser);
                }
            });
            document.getElementById('all-collection').innerHTML = html;
        });
        listFollowers(token, { query: query, ini: 0, count: 100 }, (err, usersList) => {
            if (err) {
                alert('Unable to list tweets: ' + err.stack);
                return;
            }
            // 4. build people list
            let html = '';
            usersList.forEach((user) => {
                let isFollowingUser = followingIds.includes(user.id);
                html += peopleCardTemplate(user, isFollowingUser);
            });
            document.getElementById('followers-collection').innerHTML = html;
        });
    },
    follow: function (userId) {
        follow(token, userId, (err) => {
            if (err) new Error(err);
            pages.people.refresh();
        });
    },
    unfollow: function (userId) {

        unfollow(token, userId, (err) => {
            if (err) new Error(err);
            pages.people.refresh();
        });
    },
    home: function () {
        console.log('home.show()');
        navigateTo('home');
    },
    explore: function () {
        console.log('explore.show()');
        navigateTo('explore');
    },
    profile: function () {
        console.log('profile.show()');
        navigateTo('profile');
    },
    exit: function () {
        console.log('exit.show()');
        navigateTo('login');
    }
};

pages.profile = {
    show: function (data) {
        console.log('profile.show()');
        // Init sidenav
        var nodes = document.querySelectorAll('.sidenav');
        var sidenavs = M.Sidenav.init(nodes, { edge: 'left' });
        // Init modal
        var nodes = document.querySelectorAll('.modal');
        var modals = M.Modal.init(nodes, {});

        // Evento para actualizar la imagen al clickar en el avatar
        var uploadImg = document.getElementById('file');
        var avatarImg = document.getElementById('profile-img');
        avatarImg.addEventListener('click', () => {
            uploadImg.click();
        });
        uploadImg.addEventListener('change', () => {
            let file = uploadImg.files[0];
            var reader = new FileReader();
            reader.onloadend = function () {
                currentUser.avatar = reader.result;
                avatarImg.src = currentUser.avatar;
            };
            reader.readAsDataURL(file);
        });

        // Change user template
        document.getElementById('lblUser').innerHTML = currentUser.name + ' ' + currentUser.surname;
        document.getElementById('lblEmail').innerHTML = currentUser.email;
        document.getElementById('avatar-img').src = currentUser.avatar;
        document.getElementById('profile-img').src = currentUser.avatar;

        // Generate tweets dynamically
        pages.profile.refresh();
    },
    hide: function () { console.log('home.hide()'); },
    refresh: function () {
        document.getElementById('inputName').value = currentUser.name;
        document.getElementById('inputSurname').value = currentUser.surname;
        document.getElementById('inputEmail').value = currentUser.email;
        document.getElementById('inputPassw').value = currentUser.password;
        document.getElementById('inputNick').value = currentUser.nick;
        document.getElementById('avatar-img').value = currentUser.avatar;

    },
    updateUser: function () {
        let name = document.getElementById('inputName').value;
        let surname = document.getElementById('inputSurname').value;
        let email = document.getElementById('inputEmail').value;;
        let password = document.getElementById('inputPassw').value;
        let nick = document.getElementById('inputNick').value;
        let user = {
            name: name,
            surname: surname,
            password: password,
            email: email,
            avatar: currentUser.avatar,
            nick: nick
        };
        updateUser(token, user, (err, result) => {
            let updateModal = document.getElementById('update-modal-content');
            if (err) {
                updateModal.innerHTML = `<h4>Error updating your profile!</h4>
                                         <p>You have to fill in all the fields.</p>`;
            } else {
                updateModal.innerHTML = `<h4>Your profile was updated!</h4>`;
            }
        });
        pages.profile.refresh();
    },
    sendTweet: function () {
        console.log('home.sendTweet()');
        let content = document.getElementById('txtTweet').value;
        if (content != '') {
            addTweet(token, content, (err, tweet) => {
                if (err) alert('Error: ' + err.stack);
            });
            document.getElementById('txtTweet').value = '';
            pages.profile.refresh();
        }
        pages.profile.refresh();
    },
    explore: function () {
        console.log('explore.show()');
        navigateTo('explore');
    },
    people: function () {
        console.log('people.show()');
        navigateTo('people');
    },
    home: function () {
        console.log('home.show()');
        navigateTo('home');
    },
    exit: function () {
        console.log('exit.show()');
        navigateTo('login');
    }
};

function tweetTemplate(tweet, isFollowing, pageType) {

    let date = new Date(tweet.date);
    let arrDate = date.toString().split(' ');
    let strDate = arrDate[1] + ' ' + arrDate[2];
    let followBtn = '';
    if (!isFollowing) {
        followBtn = `<div class = "input-field" style = "display:inline-block;" >
                      <a href = "#!" class = "modal-close waves-effect waves-light btn"
                    onclick = "pages.explore.follow('${tweet.owner}')"> Follow </a> </div>`;
    }

    let html = `<div class="row">
 <div class="col s12">
 <div class="card">
 <div class="card-content">

 <div class="card-content">
 <div style="display: flex; flex-direction: row; align-items: center;">
 <img class="circle" style="height:48;width:48px;margin-right: 10px;"
 src="${tweet.avatar}">
 <div><span style="font-weight: bold;">
 ${tweet.ownerName} ${tweet.ownerSurname}
 </span>&nbsp;<span style="color:gray;">${tweet.ownerNick}
 &middot; ${strDate}</span>
 ${followBtn}
 </div>
 </div>
 <p style="padding-left: 58px;">${tweet.content}</p>
 </div>
 <div class="card-action"
 style="display:flex; justify-content:space-evenly;">
 <a href="#" onclick="pages.${pageType}.retweet('${tweet.id}')">
 <i class="material-icons">loop</i>
 </a>
 <a href="#" onclick="pages.${pageType}.like('${tweet.id}')">
 <i class="material-icons">thumb_up</i>${tweet.likes}
 </a>
 <a href="#" onclick="pages.${pageType}.dislike('${tweet.id}')">
 <i class="material-icons">thumb_down</i>${tweet.dislikes}
 </a>
 </div>
 </div>
 </div>
 </div>`;
    return html;
}

function retweetTemplate(retweet, pageType) {
    let date = new Date(retweet.refDate);
    let arrDate = date.toString().split(' ');
    let strDate = arrDate[1] + ' ' + arrDate[2];
    let html =
        `<div class="row">
 <div class="col s12">
 <div class="card">
 <div class="card-content">

 <div class="card-content">
 <div style="display: flex; align-items:center;">
     <span style="margin-bottom: 20px; margin-left: 5%; color:gray">
             <i class="material-icons">loop</i>
             Retweeted by ${retweet.refOwnerName} ${retweet.refOwnerSurname} ${retweet.refOwnerNick}
         </span>
 </div>

 <div style="display: flex; flex-direction: row; align-items: center;">
 <img class="circle" style="height:48;width:48px;margin-right: 10px;"
 src="${retweet.avatar}">
 <div><span style="font-weight: bold;">
 ${retweet.ownerName} ${retweet.ownerSurname}
 </span>&nbsp;<span style="color:gray;">${retweet.ownerNick}
 &middot; ${strDate}</span>
 </div>
 </div>
 <p style="padding-left: 58px;">${retweet.ref.content}</p>
 </div>
 <div class="card-action"
 style="display:flex; justify-content:space-evenly;">
 <a href="#" onclick="pages.${pageType}.retweet('${retweet.ref._id}')">
 <i class="material-icons">loop</i>
 </a>
 <a href="#" onclick="pages.${pageType}.like('${retweet.id}')">
 <i class="material-icons">thumb_up</i>${retweet.likes}
 </a>
 <a href="#" onclick="pages.${pageType}.dislike('${retweet.id}')">
 <i class="material-icons">thumb_down</i>${retweet.dislikes}
 </a>
 </div>
 </div>
 </div>
 </div>`;
    return html;
}

function peopleCardTemplate(user, isFollowingUser, pageType) {
    let btnColor = '';
    let btnType = 'FOLLOW';
    let action = 'follow';
    if (isFollowingUser) {
        btnColor = 'red';
        btnType = 'UNFOLLOW';
        action = 'unfollow';
    }
    let html =
        `<li class="collection-item">
    <div id="c-item">
        <div id="c-item-content">
            <img style="height: 50px; margin-right: 25px;" src="${user.avatar}" class="circle" />
            <div style="display: flex; flex-direction: column;">
                <div style="display: flex; align-items:center;">
                    <span style="font-weight: bold;  margin-right: 10px;">${user.name}</span>
                    <span>${user.nick}</span>
                </div>
                <div class="li-action">
                    <a href="#!" class="cards-icons">77<i
                            class="material-icons">message</i></a>
                    <a href="#!" class="cards-icons">22<i
                            class="material-icons">thumb_up</i></a>
                    <a href="#!" class="cards-icons">3<i
                            class="material-icons">thumb_down</i></a>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <a href="#!" onclick="pages.people.${action}('${user.id}')" class="modal-close waves-effect waves-light btn ${btnColor}">${btnType}</a>
        </div>
    </div>
</li>`;
    return html;
}

navigateTo('login');