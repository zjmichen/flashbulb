
// included: script/src/Page.js

// included: script/src/Toolbar.js
/**
 * Manages a toolbar jQuery object
 * @constructor
 * @param {Page} page that controls this toolbar
 * @param {object} jQuery object this controls
 */
function Toolbar(page, html) {
    var links = html.find(".toolbar-link");

    if(!Array.isArray(links)) {
        var oldLinks = links;
        links = [];
        links[0] = oldLinks;
    }
    
    /**
     * Binds events
     */
    this.init = function() {
        $(window).scroll(function() {
            html.css("top", Math.max(0, 52 - $(window).scrollTop()));
        });

        links.forEach(function(link) {
            var that = this;

            link.click(function() {
                var href = link.attr("data-href");

                page.load(href);
            });
        });
    };

    /**
     * Changes the message displayed
     * @param {string} new value for message
     */
    this.updateMessage = function(message) {
        html.find("#messages").fadeOut().html(message).fadeIn();
    };

    this.update = function(newToolbar) {
        html.replaceWith(newToolbar);
    };

};


// included: script/src/Gallery.js

// included: script/src/Content.js
/**
 * Manages a content jQuery object of type gallery
 * @constructor
 * @param {Page} page that controls this gallery
 * @param {object} jQuery object this controls
 */

Content = {
    html: {},
    page: {},

    testFunc: function() {
        console.log("Content test");
    },

    update: function(newContent) {
        var html = this.html;
        html.fadeOut("fast", function() {
            html.replaceWith(newContent);
            html.fadeIn("fast");
        });
    }
};

/**
 * Manages a content jQuery object of type gallery
 * @constructor
 * @param {Page} page that controls this gallery
 * @param {object} jQuery object this controls
 */
Gallery.prototype = Content;
Gallery.prototype.constructor = Gallery;
function Gallery(page, html) {
    this.html = html;
    this.page = page;

    /**
     * Binds events
     */
    this.init = function() {
        $(".thumb").hover(function() {
            $(this).children(".thumbinfo").slideToggle("fast");
            $(this).find(".overlay-buttons").toggle();
        });
    };
};

/**
 * Manages the current contents of the page
 *
 * @constructor
 * @param {object} jQuery object of toolbar
 * @param {object} jQuery object of content
 */
function Page(toolbarRef, contentRef) {
    var self = this,
        toolbar = new Toolbar(this, toolbarRef),
        content = { };

    if (contentRef.attr("data-type") === "gallery") {
        content = new Gallery(this, contentRef);
    } else if (contentRef.attr("data-type") === "editor") {
        content = new Editor(this, contentRef);
    }

    /**
     * Binds events
     */
    this.init = function() {
        toolbar.init();
        content.init();

        window.onpopstate = function(evt) {
            if (evt.state === null) {
                self.load("/all.json");
            } else {
                self.update(evt.state);
            }
        };
    };

    /**
     * Fetches pageState JSON from server and updates the page
     * @param {string} Location of the pageState JSON
     */
    this.load = function(url) {
        $("*").css("cursor", "wait");
        $.getJSON(url + ".json", function(newPage) {
            window.history.pushState(newPage, url, url);
            $("*").css("cursor", "");
            self.update(newPage);
        });
    };

    /**
     * Replaces this page with a new one
     * @param {object} pageState JSON object
     */
    this.update = function(newPage) {
        toolbar.update(newPage.toolbar);
        content.update(newPage.content);
        self.init();
    };

    /**
     * Places a message in the toolbar
     * @param {string} The message
     * @param {number} Optional length before message disappears, in
     *                 milliseconds
     */
    this.showMessage = function(message, timeout) {
        toolbar.updateMessage(message);
        if (timeout) {
            setTimeout(function() {
                toolbar.updateMessage("");
            }, timeout);
        }
    };

};

$(document).ready(function() {
    console.log("Creating page");
    window.page = new Page($("#toolbar"), $("#content"));
    page.init();
    page.showMessage("Welcome!", 2000);
});
