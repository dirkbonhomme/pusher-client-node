var crypto = require('crypto');
var request = require('request');
var _ = require('underscore');
var Pusher = require('../pusher');

var Authorizer = function(){
    return this.initialize.apply(this, arguments);
};
_.extend(Authorizer.prototype, {

    /**
     * Constructor
     *
     * @param string channel  Channel name
     * @param object pusher   Pusher instance
     */
    initialize: function(channel, pusher){
        this.channel = channel;
        this.key = pusher.key;
        this.config = pusher.config || {};
        this.authOptions = this.config.auth || {};
        this.channelData = this.config.channel_data || {user_id: 'node-process-'+process.pid};
        return this;
    },

    /**
     * Authorize a channel and execute callback on result
     *
     * @param string   socketId
     * @param function callback  e.g. callback(false, { auth: "..."}) where first argument is true on error
     */
    authorize: function(socketId, callback){
        if(this.config.secret){
            this.authorizeLocal(socketId, callback);
        }else if(this.config.authEndpoint){
            this.authorizeRemote(socketId, callback);
        }else{
            throw new Error('Cannot authorize channel. Value for either "key" or "authEndpoint" missing in config.');
        }
    },

    /**
     * Locally sign authentication request
     * Only possible when instantiated Pusher with app secret
     *
     * @param string   socketId
     * @param function callback  e.g. callback(false, { auth: "..."}) where first argument is error (boolean)
     */
    authorizeLocal: function(socketId, callback){
        var channel_data = JSON.stringify(this.channelData);
        var stringToSign = socketId + ':' + this.channel.name + ':' + channel_data;
        var auth = this.key + ':' + crypto.createHmac('sha256', this.config.secret).update(stringToSign).digest('hex');
        callback(false, { auth: auth, channel_data: channel_data });
    },

    /**
     * Remotely sign authentication request
     *
     * @param string   socketId
     * @param function callback  e.g. callback(false, { auth: "..."}) where first argument is error (boolean)
     */
    authorizeRemote: function(socketId, callback){

        // Define POST data
        var postData = {
            socket_id: socketId,
            channel_name: this.channel.name
        };
        _.extend(postData, this.authOptions.params);

        // Define HTTP authentication headers
        var auth;
        if(this.authOptions.username && this.authOptions.password){
            auth = {
                user: this.authOptions.username,
                pass: this.authOptions.password
            };
        }

        // Execute request
        request.post({
            url: this.config.authEndpoint,
            form: postData,
            auth: auth,
            headers: this.authOptions.headers || {}
        }, function (error, response, body) {
            if (error || response.statusCode != 200) {
                Pusher.warn('Couldn\'t get auth info from your webapp', response.statusCode);
                callback(true, response.statusCode);
            }else{
                var data, parsed = false;
                try{
                    data = JSON.parse(body);
                    parsed = true;
                }catch(e){
                    callback(true, 'JSON returned from webapp was invalid, yet status code was 200. Data was: ' + body);
                }

                if(parsed){ // prevents double execution
                    callback(false, data);
                }
            }
        });
    }

});

module.exports = Authorizer;
