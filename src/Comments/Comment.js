const express = require('express');
const bodyParser = require('body-parser');
const Comment = require('../../models/commentSchema.js');
const notification = require('../../models/notificationSchema.js');
const subredditsSchema = require('../../models/subredditsSchema.js');
const Post = subredditsSchema.SubredditPostSchema;
const ObjectId = require('mongodb').ObjectID;
const jwt = require('../../JWT/giveToken');
const getUser = jwt.getUsernameFromToken;

class CommentHandler {
    constructor() {

    }
    /**
     * @function handlePostComment
     * @summary A function that posts a new comment or a reply.
     * @summary Takes the details of the comment from the request and checks if this post is valid or not before adding it to the database.
     * @param {Object} req The request.
     * @param {Object} res The response.
     * @returns {JSON} a json response contains the comment id
     */
    handlePostComment(req, res) {
        //Checking if the sent string is a valid ObjectID (12 or 24 bytes)
        if (!ObjectId.isValid(req.params.id)) {
            res.status(400).send({ 'error': 'This is not a valid ID' });
        } else {
            //creating variable ID which contains the thread or comment ID sent in the url
            let ID = new ObjectId(req.params.id);
            //If this is not a reply or if it's not specified in the request then it is a comment to a post
            if (req.body.reply != true) {
                //checking that the thread ID is in the database
                Post.findOne({ _id: ID }).then(function (retPost) {
                    if (retPost == null) {
                        res.status(404).send({ 'error': 'There is no post with this ID' });
                    } else {
                        //setting the s(spoiler) & l(locked) variables to their default value which is false
                        //if the request doesn't contain them or if it is not equal to true (the request is bad).
                        let s, l;
                        if (req.body.spoiler != true) {
                            s = false;
                        } else {
                            s = true;
                        }
                        if (req.body.locked != true) {
                            l = false;
                        } else {
                            l = true;
                        }
                        //making sure the request contains the content of the comment and the content isn't empty
                        if (req.body.content == undefined) {
                            res.status(400).send({ 'error': 'The request must include content of the comment' });
                        } else if (req.body.content === '') {
                            res.status(400).send({ 'error': 'You can not post an empty Comment' });
                        } else {
                            const c = new Comment({
                                username: getUser(req),
                                content: req.body.content,
                                parent_id: req.params.id,
                                dateAdded: Date(),
                                votes: 0,
                                spoiler: s,              //FOR CURRENT PHASE ONLY
                                locked: l,
                                reply: false,
                                subreddit: retPost.subredditName
                            })
                            c.save();
                            if (getUser(req) != retPost.creatorUsername) {
                                const n = new notification({
                                    type:'post',
                                    username: retPost.creatorUsername,
                                    read: false,
                                    sourceID: retPost._id,
                                    message: getUser(req) + ' has commented on your post',
                                    date: Date()
                                })
                                n.save();
                            }
                            res.status(200).send({ c_id: c._id });
                        }
                    }
                });
                //if this is a reply to a comment
            } else {
                Comment.findOne({ _id: ID }).then(function (retComment) {
                    //checking that the ID is in the database and that the comment isn't locked(can't reply to it)
                    if (retComment == null) {
                        res.status(404).send({ 'error': 'There is no Comment with this ID' });
                    } else {
                        if (retComment.locked == true) {
                            res.status(403).send({ 'error': 'You can not reply to a locked comment' });
                        } else {
                            //setting the s(spoiler) & l(locked) variables to their default value which is false
                            //if the request doesn't contain them or if it is not equal to true (the request is bad).
                            let s, l;
                            if (req.body.spoiler != true) {
                                s = false;
                            } else {
                                s = true;
                            }
                            if (req.body.locked != true) {
                                l = false;
                            } else {
                                l = true;
                            }
                            //making sure the request contains the content of the comment and the content isn't empty
                            if (req.body.content == undefined) {
                                res.status(400).send({ 'error': 'The request must include content of the comment' });
                            } else if (req.body.content === '') {
                                res.status(400).send({ 'error': 'You can not post an empty Comment' });
                            } else {
                                const c = new Comment({
                                    username: getUser(req),
                                    content: req.body.content,
                                    parent_id: req.params.id,
                                    dateAdded: Date(),
                                    votes: 0,
                                    spoiler: s,              //FOR CURRENT PHASE ONLY
                                    locked: l,
                                    reply: true,
                                    subreddit: retComment.subreddit
                                })
                                c.save();
                                if (getUser(req) != retComment.username) {
                                    const n = new notification({
                                        type:'comment',
                                        username: retComment.username,
                                        read: false,
                                        sourceID: retComment._id,
                                        message: getUser(req) + ' has replies on your comment',
                                        date: Date()
                                    })
                                    n.save();
                                }
                                res.status(200).send({ c_id: c._id });
                            }
                        }
                    }
                });
            }
        }
    }
    /**
     * @function handleGetComment
     * @summary A function that gets the details of a comment or a reply.
     * @summary Takes the id of a comment and returns its details if found.
     * @param {Object} req The request.
     * @param {Object} res The response.
     * @returns {JSON} a comment object that contains all the details of the comment.
     */

    handleGetComment(req, res) {
        //Checking if the sent string is a valid ObjectID (12 or 24 bytes)
        if (!ObjectId.isValid(req.params.c_id)) {
            res.status(400).send({ 'error': 'This is not a valid ID' });
        } else {
            //checking that the comment is in the database
            let ID = new ObjectId(req.params.c_id);
            Comment.findOne({ _id: ID }).then(function (retComment) {
                if (retComment == null) {
                    res.status(404).send({ 'error': 'The Comment ID is not found' });
                } else {
                    res.status(200).send({
                        _id: retComment._id,
                        username: retComment.username,
                        subreddit: retComment.subreddit,
                        content: retComment.content,
                        parent_id: retComment.parent_id,
                        dateAdded: retComment.dateAdded,
                        votes: retComment.votes,
                        spoiler: retComment.spoiler,
                        locked: retComment.locked
                    });
                }
            });
        }
    }
    /**
     * @function handleGetAllComments
     * @summary A function that posts a new comment or a reply.
     * @summary Takes the ID of a post(comment) and returns all its comments(replies) if there are any.
     * @param {Object} req The request.
     * @param {Object} res The response.
     * @returns {JSON}  objects that contains all the details of the comment.
     */
    handleGetAllComments(req, res) {
        //Checking if the sent string is a valid ObjectID (12 or 24 bytes)
        if (!ObjectId.isValid(req.params.id)) {
            res.status(400).send({ 'error': 'This is not a valid ID' });
        } else {
            let ID = new ObjectId(req.params.id);
            //if the ID sent is a Thread ID not a comment ID
            if (req.body.comment != true) {
                //checking that the ID is in the database
                Post.findOne({ _id: ID }).then(function (retPost) {
                    if (retPost == null) {
                        res.status(404).send({ 'error': 'There is no post with this ID' });
                    } else {
                        //returning the found comments of the thread
                        Comment.find({ $and: [{ parent_id: ID }, { reply: false }] }, function (err, comments) {
                            if (comments == null) {
                                res.status(404).send({ 'error': 'There are no Comments for this Thread' })
                            } else {
                                res.status(200).send(comments);
                            }
                        });
                    }
                });
                //if the ID sent is a Comment ID not a Thread
            } else {
                //checking that the ID is in the database
                Comment.findOne({ _id: ID }).then(function (retComment) {
                    if (retComment == null) {
                        res.status(404).send({ 'error': 'There is no comment with this ID' });
                    } else {
                        //returning the replies of this comment if found
                        Comment.find({ $and: [{ parent_id: ID }, { reply: true }] }, function (err, comments) {
                            if (comments == null) {
                                res.status(404).send({ 'error': 'There are no Replies for this Comment' })
                            } else {
                                res.status(200).send(comments);
                            }
                        });
                    }
                });
            }
        }
    }

    /**
     * @function handleEditComment
     * @summary A function that edits your own comment or reply.
     * @summary Takes the details of the comment from the request and checks if this request is valid or not before editing it to the database.
     * @param {Object} req The request.
     * @param {Object} res The response.
     * @returns {JSON} a string indicating if there is an error or update successful
     */
    handleEditComment(req, res) {
        //Checking if the sent string is a valid ObjectID (12 or 24 bytes)
        if (!ObjectId.isValid(req.params.c_id)) {
            res.status(400).send({ 'error': 'This is not a valid comment ID' });
        } else {
            let ID = new ObjectId(req.params.c_id);
            let s, l;
            //checking that the ID is in the database
            Comment.findOne({ _id: ID }).then(function (RetCommment) {
                if (RetCommment == null) {
                    res.status(404).send({ 'error': 'There is no Comment with this ID' });
                } else {
                    let user = RetCommment.username;
                    //making sure that the user that sent the request is the same user that posted the comment
                    if (user != getUser(req)) {
                        res.status(403).send({ 'error': 'You can only edit your own comments' });
                    } else {
                        if (req.body.content == undefined) {
                            res.status(400).send({ 'error': 'The request must include content of the comment' });
                        } else if (req.body.content === '') {
                            res.status(400).send({ 'error': 'You can not post an empty Comment' });
                        } else {
                            if (req.body.spoiler == true || req.body.spoiler == false) {
                                s = req.body.spoiler;
                            } else {
                                s = RetCommment.spoiler;         //the spoiler unchanged
                            }
                            if (req.body.locked == true || req.body.locked == false) {
                                l = req.body.locked;
                            } else {
                                l = RetCommment.locked;         //the locked unchanged
                            }
                            //edit the comment after making all the validations
                            Comment.findOneAndUpdate({ _id: ID },
                                { content: req.body.content, locked: l, spoiler: s }).then(function (retComment) {
                                    res.status(200).json("update successful");
                                });
                        }
                    }
                }
            });
        }
    }

    /**
     * @function handleDeleteComment
     * @summary A function that deletes your own comment or reply.
     * @summary Takes the details of the comment from the request and checks if this request is valid or not before deleting from to the database.
     * @param {Object} req The request.
     * @param {Object} res The response.
     * @returns {JSON} a string that indicates if there is an error or deletion successful
     */
    handleDeleteComent(req, res) {
        //Checking if the sent string is a valid ObjectID (12 or 24 bytes)
        if (!ObjectId.isValid(req.params.c_id)) {    //If it isn't a valid ID
            res.status(400).send({ 'error': 'This is not a valid ID' });
        } else {
            let ID = new ObjectId(req.params.c_id);
            //checking that the ID is in the database
            Comment.findOne({ _id: ID }).then(function (RetCommment) {
                if (RetCommment == null) {
                    res.status(404).send({ 'error': 'There is no Comment with this ID' });
                } else {
                    let user = RetCommment.username;
                    //making sure that the user that sent the request is the same user that posted the comment
                    if (user != getUser(req)) {
                        res.status(403).send({ 'error': 'You can only delete your own comments' });
                    } else {
                        //deleting the comment and all the replies to it
                        Comment.findOneAndDelete({ _id: ID }, function (err) {
                            if (err) {
                                res.status(500);
                                res.send({ "error": "internalServerError" });
                            }
                            else {
                                //different from reddit

                                //deleting replies of the deleted comments
                                Comment.deleteMany({ parent_id: ID }, function (err) {
                                    if (err) {
                                        res.status(500);
                                        res.send({ "error": "internalServerError" });
                                    } else {
                                        res.status(200);
                                        res.json("Delete Successful");
                                    }
                                });
                            }
                        });
                    }
                }
            });
        }
    }

    handleVoteComment(req, res){

    }

    handleReportComment(req,res){
        
    }

}

module.exports = new CommentHandler();
