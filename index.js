// Import the page-mod API
var pageMod = require("sdk/page-mod");

// Create a page mod to run only on fanfiction.net
pageMod.PageMod({
    include: "*.fanfiction.net",
    contentScriptFile: ["./jquery-2.1.4.min.js","./jquery.minicolors.js","./jquery.lazyload.min.js","./utils.js", "./fanfiction.net.js"],
    contentStyleFile: "./jquery.minicolors.css"
});
