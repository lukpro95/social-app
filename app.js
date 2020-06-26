const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const csrf = require('csurf')
const app = express()
const router = require('./router.js')
const sanitizeHTML = require('sanitize-html')

// copy paste code so we can access user typed content in code
app.use(express.urlencoded({extended: false})) // accepting html form submit
app.use(express.json()) // accepting json data

app.use('/api', require('./router-api'))

let sessionOptions = session({
    secret: "I'ts !not so nice to d'o this",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true} // 1 day
})

// supporting sessions
app.use(sessionOptions)

// enabling flash features
app.use(flash())

app.use(function(req, res, next){ //its gonna call this function for every request, saves dups

    // make our markdown function available from ejs templates
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown(content), {allowedTags: [], allowedAttributes: []})
    }

    //make all error and success flash messages available from all templates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")
    //make current user id available on the req object
    if(req.session.user){req.visitorID = req.session.user._id} else {req.visitorID = 0}
    //make user session data available from withing view templates
    res.locals.user = req.session.user // global use of current user of current session
    next()
})

// let us see public folder
app.use(express.static('public'))

// configure express here to see a page from ejs
app.set('views', 'views') // where to look for template
app.set('view engine', 'ejs') // which engine for the template, install ejs by npm

// support router for routs of web pages
app.use(csrf()) // token for router paths so that it protects app from CSRF attacks

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/', router)

app.use(function(err, req, res, next) {
    if(err) {
        if(err.code == "EBADCSRFTOKEN") {
            req.flash('errors', "Cross site request forgery detected.")
            req.session.save(() => res.redirect('/'))
        } else {
            res.render('404-page')
        }
    }
})

 // server related

const server = require('http').createServer(app) //creating server for app as handler
const io = require('socket.io')(server) //creating sockets for server

io.use(function(socket, next) {
    sessionOptions(socket.request, socket.request.res, next) // allowing socket of having session knowledge
})

io.on('connection', function(socket) {
    if(socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit('welcome', {username: user.username, avatar: user.avatar})

        socket.on('chatMSGFromBrowser', function(data) {
            
            socket.broadcast.emit('chatMSGFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: []}), username: user.username, avatar: user.avatar})
        })
    }
})

module.exports = server