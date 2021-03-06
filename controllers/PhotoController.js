var redis = require("redis")
  , rClient
  , Album
  , credentials
  , Dropbox = require("dropbox")
  , AlbumCon = require("./AlbumController.js")
  , fs = require("fs")
  ;

module.exports = function(creds) {
  credentials = creds;
  Album = new AlbumCon(credentials);
  rClient = redis.createClient(credentials.redis.port,
                 credentials.redis.host);
  rClient.auth(credentials.redis.auth);

  return PhotoController;
};

function getDropbox(dropboxId, callback) {
  rClient.hget("dropboxes", dropboxId, function(err, tokenStr) {
    var tokens = JSON.parse(tokenStr),
      dropbox = new Dropbox.Client({
        key: credentials.dropbox.appkey,
        secret: credentials.dropbox.secret,
        sandbox: true
      });

    dropbox.oauth.setToken(tokens.token, tokens.secret);
    callback(err, dropbox);
  });
}

var PhotoController = {
  "all": function(req, res) {
    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      dropbox.findByName("/", ".jpg", function(err, photos) {
        if (err) {
          res.render("error", {"error": err});
        } else {
          Album.getAlbumList(dropbox, function(err, albums) {
            var data = {
              "name": "All Photos",
              "photos": photos,
              "albums": albums.map(function(album) {
                return album.name;
              }),
              "fbToken": req.session.fbToken
            };
            res.render("photo/all", data);
          });
        }
      });
    });
  },

  "update": function(req, res) {
    var path = "/" + req.params.photo;
    if (req.params.album) {
      path = "/" + req.params.album + path;
    }
    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      var encodedImg = req.body.image.split(",")[1],
        buffer = new Buffer(encodedImg, "base64");
      dropbox.writeFile(path, buffer, function(err, stat) {
        if (err) {
          res.send("Error saving photo");
        } else {
          res.send("Photo saved");
        }
      });
    });
  },

  "get": function(req, res) {
    var path = (req.params.album ? "/" + req.params.album : "" ) + "/" + req.params.photo;
    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      dropbox.readFile(path, {"buffer": true}, function(err, data) {
        if (err) {
          res.end();
        } else {
          res.setHeader("Content-type", "image");
          res.send(data);
        }
      });
    });
  },

  "move": function(req, res) {
    if (req.body.to === "/Unsorted") {
      req.body.to = "";
    }
    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      dropbox.move(req.body.from + req.body.photo, req.body.to + req.body.photo,
          function(err) {
        if (err) {
          res.render("error", {"error": err});
        } else {
          res.redirect("/albums" + req.body.from);
        }
      });
    });
  },

  "getPublicUrl": function(req, res) {
    if (req.params.path.substr(0, 5) === "/file") {
      req.params.path = req.params.path.substr(5);
    }
    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      dropbox.makeUrl(req.params.path, {
        "download": true,
        "downloadHack": true
      }, function(err, url) {
        if (err) {
          res.send(err);
        } else {
          res.send(url);
        }
      });
    });
  },

  "upload": function(req, res) {
    var album = "";
    if (req.params.album && req.params.album !== "Unsorted") {
      album = req.params.album;
    }

    getDropbox(req.session.user.dropboxId, function(err, dropbox) {
      if (err) {
        res.send("Upload error: " + err);
        return;
      }
      var errors = req.files.reduce(function(prevErr, file, fn, files) {
        var fileData = fs.readFileSync(file.path);
        return dropbox.writeFile('/' + album + '/' + file.name, fileData, {
          noOverwrite: true
        }, function(err, stat) {
          return (err) ? prevErr + 1 : prevErr;
        });
      });

      if (errors > 0){
        res.send("Write error: " + err);
      } else {
        res.send("Upload success");
      }
    });
  },

  "edit": function(req, res) {
    var path = "/" + req.params.photo;
    if (req.params.album) {
      path = "/" + req.params.album + "/" + req.params.photo;
    }

    res.render("photo/edit", {
      "path": path
    });
  },

};

