const Post = require('../models/Post.js')
const sendgrid = require('@sendgrid/mail')
sendgrid.setApiKey(process.env.SENDGRIDAPIKEY)

exports.viewCreateScreen = function(req, res) {
    res.render('create-post', {title: "Create Post"})
}

exports.createPost = function(req, res){
    sendgrid.send({
        to: 'lukpro95@gmail.com',
        from: 'test@test.com',
        subject: 'Congrats on creating new post!',
        text: 'You did a great job to create a new post!',
        html: 'You did <strong>nice</strong> job!'
    })
    let post = new Post(req.body, req.session.user._id)
    post.create()
    .then(function(newID){ // try arrow later
        req.flash("success", "You have successfully created new post!")
        req.session.save(() => res.redirect(`/post/${newID}`))
    })
    .catch(function(errors){
        errors.forEach(error => req.flash("errors", error))
        req.session.save(()=> res.redirect("/create-post"))
    })
}

exports.apiCreatePost = function(req, res){
    let post = new Post(req.body, req.apiUser._id)
    post.create()
    .then(function(newID){ // try arrow later
        res.json("Created")
    })
    .catch(function(errors){
        res.json(errors)
    })
}

exports.viewPost = async function(req, res){

    try{
        let post = await Post.findPostByID(req.params.id, req.visitorID)
        res.render('single-post', {post: post, title: post.title})
    } catch {
        res.render('404-page')
    }

}

exports.viewEditScreen = async function(req, res){
    try{
        let post = await Post.findPostByID(req.params.id, req.visitorID)
        if(post.isVisitorOwner){
            res.render('edit-post', {post: post, title: "Edit Post"})
        } else {
            req.flash("errors", "You do not have permission to perform this action.")
            req.session.save(() => res.redirect('/'))
        }
    } catch {
        res.render('404-page')
    }
}

exports.editPost = function(req, res) {
    let post = new Post(req.body, req.visitorID, req.params.id)
    post.update()
    .then((status) => {
        // post was successfully updated
        // or user did have permission, but there were validation errors
        if(status == "success"){
            // post was updated in db
            req.flash("success", "Post successfully updated.")
            req.session.save(() => {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        } else {
            post.errors.forEach((error) => {
                req.flash("errors", error)
            })
            req.session.save(() => {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    })
    .catch(() => {
        // post with this id doesnt exists or current visitor isnt the owner
        req.flash("errors", "You do not have a permission to perform that action.")
        req.session.save(function(){
            res.redirect("/")
        })
    })
}

exports.deletePost = function(req, res) {
    Post.delete(req.params.id, req.visitorID)
    .then(() => {
        req.flash("success", "Post successfully deleted.")
        req.session.save(() => res.redirect(`/profile/${req.session.user.username}`))
    })
    .catch(() => {
        req.flash("errors", "You don't have a permission to delete this post!")
        req.session.save(() => res.redirect('/'))
    })
}

exports.apiDeletePost = function(req, res) {
    Post.delete(req.params.id, req.apiUser._id)
    .then(() => {
        res.json("Success")
    })
    .catch(() => {
        res.json("Sorry. You have not permission to do it.")
    })
}

exports.searchByContent = function(req, res) {
    Post.search(req.body.searchTerm)
    .then((posts) => {
        res.json(posts)
    })
    .catch(() => {
        res.json([])
    })
}