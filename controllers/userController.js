const User = require('../models/User.js') // '..' to get back to root folder
const Post = require('../models/Post.js') 
const Follow = require('../models/Follow.js')
const jwt = require('jsonwebtoken')

exports.apiGetPostsByUsername = async function (req, res) {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorID(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Sorry, invalid user requested.")
    }
}

exports.doesUsernameExist = function (req, res) {
    User.findByUsername(req.body.username)
    .then(() => {
        res.json(true)
    })
    .catch(() => {
        res.json(false)
    })
}

exports.doesEmailExist = async function (req, res) {
    let emailBool = await User.doesEmailExist(req.body.email)
    res.json(emailBool)
}

exports.sharedProfileData = async function(req, res, next) {
    let isVisitorProfile = false
    let isFollowing = false
    if(req.session.user){
        isVisitorProfile = req.profileUser._id.equals(req.session.user._id)
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorID)
    }

    req.isVisitorProfile = isVisitorProfile
    req.isFollowing = isFollowing

    //retrieve posts followers and following counts

    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followersCountPromise = Follow.countFollowersByID(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingByID(req.profileUser._id)

    let [postCount, followersCount, followingCount] = await Promise.all([postCountPromise, followersCountPromise, followingCountPromise])
    
    req.postCount = postCount
    req.followersCount = followersCount
    req.followingCount = followingCount

    next()
}

exports.login = (req, res) => {
    let user = new User(req.body)
    user.login().then(function(result){
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function(){
            res.redirect('/')
        })
    }).catch(function(e){
        req.flash('errors', e)
        req.session.save(function(){
            res.redirect('/')
        })
    })
}

exports.apiLogin = (req, res) => {
    let user = new User(req.body)
    user.login().then(function(result){
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: '7d'}))
    }).catch(function(e){
        res.json("Incorrect login / password.")
    })
}

exports.logout = (req, res) => {
    req.session.destroy(function() {
        res.redirect('/')
    })
}

exports.register = (req, res) => {
    let user = new User(req.body);

    user.register()
    .then(()=>{
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function(){
            res.redirect('/')
        })
    })
    .catch((regErrors)=>{
        regErrors.forEach(function(error){
            req.flash('regErrors', error)
        })
        req.session.save(function(){
            res.redirect('/')
        })
    })

}

exports.loggedIn = (req, res, next) => {
    if(req.session.user){
        next()
    } else {
        req.flash("errors", "You must be logged in to perform that action!")
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.apiLoggedIn = (req, res, next) => {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("Invalid token.")
    }
}

exports.home = async (req, res) => {
    if(req.session.user){
        // fetch feed of posts for current user
        let posts = await Post.getFeed(req.session.user._id)
        res.render('home-dashboard', {posts: posts, title: "Your Feed"})
    } else {
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifExists = function (req, res, next) {
    User.findByUsername(req.params.username)
    .then((userDocument) => {
        req.profileUser = userDocument
        next()
    })
    .catch(() => {
        res.render('404-page')
    })
}

exports.profilePostsScreen = function (req, res) {
    // ask post model for posts by a certain id author
    Post.findByAuthorID(req.profileUser._id)
    .then((posts) => {
        res.render('profile', {
            title: req.profileUser.username + "'s Posts",
            currentPage: "posts",
            posts: posts,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    })
    .catch(() => {
        res.render('404-page')
    })

}

exports.profileFollowersScreen = async function (req, res) {
    try {

        let followers = await Follow.getFollowersByID(req.profileUser._id)
        res.render('profile-followers', {
            title: req.profileUser.username + "'s Followers",
            currentPage: "followers",
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })

    } catch {
        res.render("404-page")
    }
}

exports.profileFollowingScreen = async function (req, res) {
    try {

        let following = await Follow.getFollowingByID(req.profileUser._id)
        res.render('profile-following', {
            title: req.profileUser.username + "'s Following List",
            currentPage: "following",
            following: following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorProfile: req.isVisitorProfile,
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })

    } catch {
        res.render("404-page")
    }
}