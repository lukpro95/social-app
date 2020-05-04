const apiRouter = require('express').Router()
const userController = require('./controllers/userController.js')
const postController = require('./controllers/postController.js')
const followController = require('./controllers/followController.js')
const cors = require('cors')

apiRouter.use(cors())

apiRouter.post('/login', userController.apiLogin)
apiRouter.post('/create-post', userController.apiLoggedIn, postController.apiCreatePost)
apiRouter.delete('/post/:id', userController.apiLoggedIn, postController.apiDeletePost)
apiRouter.get('/postsByAuthor/:username', userController.apiGetPostsByUsername)

module.exports = apiRouter