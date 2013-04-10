var User = require("../models/User"),
    redis = require("redis"),
    Dropbox = require("dropbox");

var AlbumController = function(credentials) {
    var rClient = redis.createClient();

    if (!(this instanceof AlbumController)) {
        return new AlbumController(credentials);
    }

    this.all = function(req, res) {
        User.get(req.session.user.email, function(err, user) {
            getDropbox(user.dropboxId, function(err, dropbox) {
                dropbox.stat("/", {"readDir": true}, function(err, folderStat, stats) {
                    res.render("album/all", {
                        "user": user.name,
                        "albums": stats.filter(function(entry) {
                            return entry.isFolder;
                        }).map(function(entry) {
                            return entry.name;
                        })
                    });
                });
            });
        });
    };

    this.view = function(req, res) {
        var albumPath = req.params.album;
        if (req.params.album === "unsorted") {
            albumPath = "";
        }
        getDropbox(req.session.user.dropboxId, function(err, dropbox) {
            dropbox.stat("/" + albumPath, {"readDir": true}, function(err, folder, entries) {
                if (err) {
                    res.render("error", {"error": err});
                } else {
                    res.render("album/view", {
                        "name": req.params.album,
                        "photos": entries.filter(function(entry) {
                            return /.*(\.jpg|\.png|\.gif)/.test(entry.name);
                        })
                    });
                }
            });
        });
    };

    this.createForm = function(req, res) {
        res.render("album/create");
    };

    this.create = function(req, res) {
        User.get(req.user.email, function(err, user) {
            getDropbox(user.dropboxId, function(err, dropbox) {
                dropbox.readdir("/", function(err, entries) {
                    dropbox.mkdir(req.body.albumName, function(err, stat) {
                        if (err) {
                            res.render("error", {"error": err});
                        } else {
                            res.redirect("/home");
                        }
                    });
                });
            });
        });
    };

    this.updateForm = function(req, res) {
        User.get(req.session.user.email, function(err, user) {
            if (err) {
                res.render("error", {"error": err});
            } else {
                user.getAlbum(req.params.id, function(err, album) {
                    if (err) {
                        res.render("error", {"error": err});
                    } else {
                        res.render("album/update", {"album": album});
                    }
                });
            }
        });
    };

    this.update = function(req, res) {
        User.get(req.session.user.email, function(err, user) {
            if (err) {
                res.render("error", {"error": err} );
            } else {
                user.updateAlbum(req.params.id, req.body, function(err) {
                    if (err) {
                        res.render("error", {"error": err} );
                    } else {
                        res.redirect("/albums");
                    }
                });
            }
        });
    };

    this.destroy = function(req, res) {
        getDropbox(req.session.user.dropboxId, function(err, dropbox) {
            dropbox.unlink("/" + req.params.album, function(err) {
                if (err) {
                    res.send(err);
                } else {
                    res.redirect("/home");
                }
            });
        });
    };

    function getDropbox(dropboxId, callback) {
        rClient.hget("dropboxes", dropboxId, function(err, tokenStr) {
            var tokens = JSON.parse(tokenStr),
                dropbox = new Dropbox.Client({
                    key: credentials.dropbox.appkey,
                    secret: credentials.dropbox.secret,
                    sandbox: true
                });

            dropbox.oauth.setToken(tokens["token"], tokens["secret"]);
            callback(err, dropbox);
        });
    }
};

module.exports = AlbumController;
