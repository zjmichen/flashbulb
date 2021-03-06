var express = require("express")
  , mongoose = require("mongoose")
  , credentials
  , RedisStore = require("connect-redis")(express)
  , passport = require("passport")
  , DropboxStrategy = require("passport-dropbox").Strategy
  , FacebookStrategy = require("passport-facebook").Strategy
  , dropbox = require("dropbox")
  , port, hostname
  , appCon, userCon, albumCon, photoCon
  , app = express()
  , url = require("url");


app.configure(function() {
    app.engine("jade", require("jade").__express);
    app.set("views", __dirname + "/views");
    app.set("view engine", "jade");
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(require("less-middleware")({
        "prefix": "/style",
        "src": __dirname + "/public/style/src" ,
        "dest": __dirname + "/public/style",
        "compress": false
    }));
    app.use(express.static(__dirname + "/public"));
    app.use(express.cookieParser());
});

app.configure("development", function() {
    console.log("running in development environment");
    credentials = require("./credentials").development;
    app.locals.pretty = true;
    app.use(express.session({secret: "flashbulb", store: new RedisStore()}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    port = 3000;
    hostname = "http://127.0.0.1:" + port;
});

app.configure("production", function() {
    var store,
        redisURL = url.parse(process.env.REDISTOGO_URL);
    console.log("running in production environment");
    credentials = {
        "mongodb": {
            "url": process.env.MONGO_URL
        },
        "dropbox": {
            "appkey": process.env.DROPBOX_APPKEY,
            "secret": process.env.DROPBOX_SECRET
        },
        "facebook": {
            "clientId": process.env.FACEBOOK_CLIENTID,
            "secret":   process.env.FACEBOOK_SECRET
        },
        "redis": {
            "host": redisURL.hostname,
            "port": redisURL.port,
            "auth": redisURL.auth.split(":")[1]
        }
    };
    store = new RedisStore({
        "host": credentials.redis.host,
        "port": credentials.redis.port,
        "pass": credentials.redis.auth
    });
    app.use(express.session({"secret": "bananahorsepancakes", "store": store}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);
    app.use(express.errorHandler());
    port = process.env.PORT || 8080;
    hostname = process.env.HOSTNAME;
});

// Controllers
appCon = require("./controllers/ApplicationController")(credentials);
albumCon = require("./controllers/AlbumController")(credentials);
photoCon = require("./controllers/PhotoController")(credentials);

// configure passport
passport.use(new DropboxStrategy({
    consumerKey: credentials.dropbox.appkey,
    consumerSecret: credentials.dropbox.secret,
    callbackURL: hostname + "/login/success",
    passReqToCallback: true
}, appCon.dbAuthenticate));
passport.use(new FacebookStrategy({
    clientID: credentials.facebook.clientId,
    clientSecret: credentials.facebook.secret,
    callbackURL: hostname + "/auth/facebook/success",
    passReqToCallback: true
}, appCon.fbAuthenticate));

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

/* Routes */

// authentication
app.get("/login/success", passport.authenticate("dropbox"),
        appCon.login);

app.get("/auth/facebook", passport.authorize("facebook", {
    scope: "publish_stream",
    failureRedirect: "/error"
}));
app.get("/auth/facebook/success", passport.authorize("facebook", {
    failureRedirect: "/error"
}), appCon.fbUpload);
app.get("/logout", appCon.logout);


// app
app.get("/", appCon.index);
app.get("/home", appCon.auth, appCon.home);
app.get("/error", appCon.error);
app.get("/login", passport.authenticate("dropbox"));
app.get("/all", appCon.auth, photoCon.all);
app.get("/help", appCon.help);

// album
app.get("/albums", appCon.auth, albumCon.all);
app.get("/albums/new", appCon.auth, albumCon.createForm);
app.get("/albums/:album", appCon.auth, albumCon.view);
app.post("/albums", appCon.auth, albumCon.create);
app.delete("/albums/:album", appCon.auth, albumCon.destroy);

// photo
app.get("/photos/all", appCon.auth, photoCon.all);
app.get("/photos/:album/:photo", appCon.auth, photoCon.get);
app.get("/photos/:photo", appCon.auth, photoCon.get);
app.post("/photos", appCon.auth, photoCon.upload);
app.post("/photos/:album", appCon.auth, photoCon.upload);
app.post("/move", appCon.auth, photoCon.move);
app.put("/photos/:album/:photo", photoCon.update);
app.put("/photos/:photo", photoCon.update);

app.get("/public/photos/:path", appCon.auth, photoCon.getPublicUrl);
app.get("/edit/:album/:photo", appCon.auth, photoCon.edit);
app.get("/edit/:photo", appCon.auth, photoCon.edit);


// make things go
mongoose.connect(credentials.mongodb.url);
app.listen(port);
console.log("Express server listening on port %d", port);

