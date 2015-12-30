var buttons = require('sdk/ui/button/action');
var tabs = require("sdk/tabs");

// Import the page-mod API
var pageMod = require("sdk/page-mod");

// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
  include: "*.fanfiction.net",
  contentScriptFile: ["./jquery-2.1.4.min.js","./jquery.minicolors.js","./jquery.lazyload.min.js","./fanfiction.net.js"],
  contentStyleFile: "./jquery.minicolors.css"
});
