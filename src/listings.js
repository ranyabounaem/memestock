const express = require('express');
const bodyParser = require('body-parser');
const User = require('../models/UserSchema');
const userhandler = require('./user/index');
const subbredditsSchema = require('../models/subredditsSchema');
const subbreddits = subbredditsSchema.Subreddit;
const posts = subbredditsSchema.SubredditPostSchema;

/** 
 * @class listings
 */
class listings {
    constructor() {

    }
    /**
       * Listing sorting the posts  by  new feature
       * @param {string} owner   the username of the user to retrieve list for
       * @param {string} startPosition the number of scrolls a user does to retirieve posts
       * @example
       * // returns   array of 15 posts maximum depending on the start position
       * listings.listingPostsbyNew('kefah', 0);
       * @returns {Object[]}    returns array of 15 posts maximum depending on the start position
       * @example
       *  listings.listingPostsbyNew('kefah', 1);
       * @returns {Object[]}  
       */
    async listingPostsbyNew(owner, startPosition) {
        // getting the names of the subbreddit a user is subscribed to 
        let subscribedSubbreddit = await User.findOne({ Username: owner }, { Subscriptions: 1, _id: 0 });
        // finding the posts that the subbreddit posted to retrieve for the user 
        let newPosts = await posts.find({ subredditName: subscribedSubbreddit.Subscriptions }, { __v: 0 }).sort({ postDate: -1 })
            .skip(startPosition * 15).limit(15);
        return newPosts;
    }


    /**
     * Handles request List Posts
     * @param {Object} req  The request.
     * @param {Object} res  The response.
     * @param {String} req.params.username  the username of the user that wants to list his subreddit
     * @param {String} req.query.type  the type of listings he wants to hot,new,popular
     * @param {Number} req.body.startPosition  the number of scrolls the user did 
     * @example
     * // returns   {"error": "errorType"} if there is an error in the request see Api for error response
     * listings.listPosts(req,res);
     * @example
     * // returns OK status 200 with the json file of the posts 
     * listings.listPosts(req,res);
     * @returns {JSON} [{"subredditName": "funny","_id":1,"title":"love","postDate":"1998-04-23","body": "love is known for something"},{"subredditName": "nature","_id":2,"title":"vietnam nature","postDate":"1998-04-23","body": "vietnam nature is known for something"} ]
     * @returns {JSON} {error: 'undefinedQuery'} 
     * @returns {JSON} {error: 'userNotFound'} 
     * @returns {JSON} {error: 'postsNotFound'} 
     * @returns {JSON} {error: 'internalServerError'} 
     */

    async listPosts(req, res) {
        let owner = req.params.username;
        let listingType = req.query.type;
        let startPosition =req.body.startPosition;  // return only 15 post this phase
        let newPosts = null;
        // validation for the type error
        if (listingType == undefined
            || !(listingType == 'hot'
                || listingType == 'new'
                || listingType == 'top')
            || (typeof startPosition != 'number')) {

            res.status(400);
            res.json({ error: 'undefinedQuery' });
            return;
        }
        // middleware shall be used to check for this 
        if (!(await userhandler.isUserFound(owner))) {
            res.status(404);
            res.send({ "error": "userNotFound" });
            return;
        }
        // for this phase we will be sending listing by new
        if (listingType == 'new') {
            // awaiting for the retriving the new posts and checking  the result
            newPosts = await this.listingPostsbyNew(owner, startPosition);
            // if there is no error and it is not null send it 
            if (newPosts != null && newPosts.length != 0) {
                res.status(200);
                res.json(newPosts);
                return;
            }
            else {
                res.status(404);
                res.send({ "error": "postsNotFound" });
                return;

            }

        }
        else if (listingType == 'top') {

            res.status(404);
            res.send({ "error": "postsNotFound" });
            return;
            return;
        }
        else if (listingType == 'hot') {

            res.status(404);
            res.send({ "error": "postsNotFound" });
            return;
            return;
        }
        else {
            res.status(500);
            res.send({ "error": "internalServerError" });
            return;
        }

    }





}
module.exports =  new listings();
