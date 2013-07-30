var defaultOptions = {
    protocol: 6,

    host: 'ws.pusherapp.com',
    wsPort: 80,
    wssPort: 443,
    unavailableTimeout: 10000,

    secret: null, // required for self-signed auth
    authEndpoint: null, // required for remote signing

    cluster: function(name){
        return {
            host: 'ws-' + name + '.pusher.com'
        };
    }
};

module.exports = defaultOptions;