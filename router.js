const express = require('express')
const router = express.Router()
const userController = require('./controllers/userController.js')
const postController = require('./controllers/postController.js')
const followController = require('./controllers/followController.js')

// registration related
router.post('/doesUsernameExist', userController.doesUsernameExist)
router.post('/doesEmailExist', userController.doesEmailExist)

// user related
router.get('/', userController.home)
router.post('/register', userController.register)
router.post('/login', userController.login)
router.post('/logout', userController.logout)

// profile related routes
router.get('/profile/:username', userController.ifExists, userController.sharedProfileData, userController.profilePostsScreen)
router.get('/profile/:username/followers', userController.ifExists, userController.sharedProfileData, userController.profileFollowersScreen)
router.get('/profile/:username/following', userController.ifExists, userController.sharedProfileData, userController.profileFollowingScreen)

// post related routes
router.get('/create-post', userController.loggedIn, postController.viewCreateScreen)
router.post('/create-post', userController.loggedIn, postController.createPost)
router.get('/post/:id', postController.viewPost) //id for id of posts
router.get('/post/:id/edit', userController.loggedIn, postController.viewEditScreen)
router.post('/post/:id/edit', userController.loggedIn, postController.editPost)
router.post('/post/:id/delete', userController.loggedIn, postController.deletePost)
router.post('/search', postController.searchByContent)

// follow related routes
router.post('/addFollow/:username', userController.loggedIn, followController.addFollow)
router.post('/removeFollow/:username', userController.loggedIn, followController.removeFollow)

module.exports = router