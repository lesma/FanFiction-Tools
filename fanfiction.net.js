/*
Main fanfiction tools js file

This was orignally "Power Fanfiction.net" by Ultimer (http://userscripts.org/scripts/show/61979)
This was then rewritten by Ewino
It has been fixed by variours people https://greasyfork.org/en/forum/discussion/789/modified-1-7-2 mainly phelougu and Mohamad19960806




/* These are the default seetting, but if a user has ever had a setting with the same name that will be used in prefercne
 As such these values are only the default the first time a user ever runs any version of this script
 */
 
var settings = {};
var defaultSettings = {
	blacklistedWords: [],	/** Stories containing these words in summary are removed. [an array of words] */
	lowWordCount: 0,	/** Stories with lower word count are removed */
	fixLinks: true,		/** Change fake links to real links. [true/false] */
	allowCtrlA: true,	/** Allow select all with ctrl-a. [true/false] */
	filtersFormat: 0,	/** Format of the filters. [0/1/2/3] 0: Default, 1: Always visible (right), 2: Always visible (right, don't follow), 3: Always visible (top) */
	colorWordCount: true,	/** Color the word counts. [true/false] */
	colorWordStoryCount: false,	/** Color the word story counts. [true/false] */
	colorDate:  true,	/** Color the dates. [true/false] */
	colorComplete:  true,	/** Add a unique color to completed stories. [true/false] */
	dateFormat: 1,	/** Format of the date. [0/1] 0:US date format, 1:UK date format */
	dateOrder: 0,	/** Order of the date. [0/1] 0: Published-Updated, 1: Updated-Published */
	sep:  '/',	/** Separator of the dates. (i.e. '-' would result in 1-2-2000). */
	fullStoryLoad:  false,	/** Load the entire story when opening a story. [true/false] */
	loadAsYouGo: true,	/** Load the next chapter as you read [true/false]. Ignored when fullStoryLoad: true. */
	loadListsAsYouGo: true,	/** Load the next page in a list as you pass through it. [true/false] */
	markWords: ['rape','death','MPREG'],	/** Words that are marked in the story summary. [an array of words] */
	combineReview: true,	/** Combine the review link with the review count. [true/false] */
	shouldRelativeDate: true,	/** use relative dates. [true/false] */
	showPostingFrequency: true,	/** show the average posting frequency. [true/false] */
	hideChaptersNavigator: true,	/** Hide the chapters drop-down menu. [true/false] */
	shortenFavsFollows: true,	/** Whether to shorten favs/follows info to small symbols. [true/false] */
	viewLanguages: [],	/** The preferred languages. Stories not of these languages won't be shown (disabled if empty) [an array of language names] */
	showFirstChapterSeparator: true, /** Whether to show the separator/title of the first (non-ajax-loaded) chapter. [true/false] */
	usingFanFicFilter: false, /** Indcates that the fanfic filter extnesion is also being used, and as such search should be disabled*/
	colors_shade1: '#00B500', // Light Green
	colors_shade2: '#008000', // Dark Green
	colors_shade3: '#4060DD', // Light Blue
	colors_shade4: '#0000AD', // Dark Blue
	colors_shade5: '#800090', // Purple
	colors_shade6: '#FF8C00', // Orange
	colors_shade7: '#FF0000', // Red
	colors_complete: '#00EEEE', // Cyan
	colors_marked_words: '#FF0000',
	word_count1: 12000,
	word_count2: 10000,
	word_count3: 8000,
	word_count4: 5000,
	word_count5: 2000,
	word_count6: 1000,
	word_count7: 500
};

var env = {
	/** The chapter we currently view. */
	currentChapter: 1,

	/** The amount of chapters in this story. */
	totalChapters: 1,

	/** The current chapter, or the one last loaded through AJAX. */
	lastLoadedChapter: -1,

	/** Whether the current story is complete. */
	isComplete: false,

	/** The URL to load the next page in a paged list. */
	nextListPageUrl: '',

	/** The ~real~ window element. The unsafe one if we use GM */
	w: (window),

	/** A shortcut function to use for logging */
	log: null
};

env.log = env.w.console.log;

/** This will be called after the environment finishes initialization. it's the start-point. */
function load() {
	// for some reason we also run for the sharing iframe. this prevents that.
	if (!utils.XOR(window.location.host.indexOf('fanfiction.net') === -1, window.location.host.indexOf('fictionpress.com') === -1 )){ 
		return; 
	}

	features.settings.load();
	
	features.optionsMenu.setup();
	

	features.fixStyles();

	if (settings.fixLinks) {
	    features.fixLinks();
	}
	
	// Remove laxy loading of images, as this extension breaks it
	$('img.lazy').each(function (index) {
       var original = $(this).attr("data-original");
	   $(this).attr("src", original);
    })


	// all selectors
	var chapterNavigator = utils.getChapterNavigator(), storyTextEl = $('#storytext'), zlists = $('.z-list');

	if (storyTextEl.length > 0) { // we're in a story page

		features.formatting.doStoryPageInfo($('#profile_top span:contains(Rated:)').last());

		if (chapterNavigator.length > 0) { // the story has multiple chapters!
			if ((settings.loadAsYouGo || settings.fullStoryLoad) && settings.hideChaptersNavigator) { 
				chapterNavigator.hide();
				chapterNavigator.prev().hide();
				chapterNavigator.next().hide();
			} else if (settings.fullStoryLoad && !settings.hideChaptersNavigator) {
				chapterNavigator.next().hide();
				chapterNavigator.first().val(1);
				chapterNavigator.first().prev().prop("onclick", null).off().text("Jump to: ");
				chapterNavigator.first().prop("onchange", null).off().change(function(event) {		
					var chapter = $(this).val();
					$([document.documentElement, document.body]).animate({
						scrollTop: $("#GEASEMONKEYSEPARATOR" + chapter).offset().top
					}, 100);	
				});
				
				chapterNavigator.eq(1).prev().prop("onclick", null).off().text("Select chapter for review:");
				chapterNavigator.eq(1).next().hide();
				
				chapterNavigator.eq(1).change(function(event) {			
					utils.setOptionValue("ReviewChapterChanged",true);
				});
				
			}
			env.totalChapters = utils.chapters.getCount();
			var currentChapter = env.currentChapter = utils.chapters.getCurrent();

			// setup dom helper elements
			storyTextEl.prepend('<div id="story-start" style="display: none"></div>').append(utils.parseHTML('<div id="story-end" style="display: none"></div>'));
			if (settings.fullStoryLoad || (settings.loadAsYouGo && settings.showFirstChapterSeparator)) {
				$('#story-start').after(features._getChapterSeparator(currentChapter, null));
			}
			var currentSep = $('header.fftools-chapter-sep:first').addClass('current-chapter');
			features._addEndOfStorySeparatorIfNeeded(currentChapter);
			$('.a2a_kit').prependTo(currentSep);


			var hash = utils.getLocationHash();
			if (hash !== '' && isFinite(hash) && hash > currentChapter) { features.redirectToChapter(hash); return; }

			if (settings.fullStoryLoad) { features.autoLoad.loadFullStory(); }
			else if (settings.loadAsYouGo) { features.setLoadAsYouGo(); }
		}

		if (settings.allowCtrlA) {
			$('head').append('<script>setTimeout(function(){ $(document).unbind("keydown"); }, 500);</script>'); // Allow select all with ctrl-a
		}
	} else if (zlists.length > 0) { // we're in a page containing lists

		if ($('#myform').length > 0 && settings.filtersFormat > 0) {
			var applyButton = $('#myform span:contains(Apply)').removeClass('pull-right');
			var counter = $('#myform #live_counter');
			$('#myform select').each(function () { this.style="width: 160px;"; });
			$('#myform .modal-body script').remove();
			$('#myform .modal-footer').remove();
			if (settings.filtersFormat === 1 || settings.filtersFormat === 2) { // filters always visible (right)
				if (env.w.innerWidth <= 1830) {
					$('#content_wrapper').css({'margin-right': '280px', 'max-width': (env.w.innerWidth-300)+'px', 'min-width': '400px'});
				}
				$('#myform .modal-body').css({'padding': '5px', 'border': '1px dashed', 'max-height': (utils.pos._screenHeight()-$("#content_parent")[0].offsetTop-80)+'px'});
				applyButton.css({'margin': '5px'});
				var filtersDiv = $('<div id="filters" style="text-align: center; width: 240px; position: ' + (settings.filtersFormat === 1 ? "fixed" : "relative") + '; right: 20px; float: right;" />');
				counter.css({'display': 'block'});
				filtersDiv.append($('#myform')).append(applyButton).append(counter);
				filtersDiv.prependTo($("#content_parent"));
			} else { // filters always visible (top)
				counter.addClass('pull-right');
				$('#myform .modal-body').css({'padding': '5px'});
				var filtersDiv = $('<div id="filters" style="text-align: center;" />');
				filtersDiv.append($('#myform')).append(applyButton);
				$("#content_wrapper center").eq(0).append(counter).append(filtersDiv);
			}
			$("span[onclick^=\"$('#filters').modal()\"]").remove();
		}

		zlists.each(function () { 
			features.formatting.doListEntry(this); 
		});

		if (settings.loadListsAsYouGo && !settings.usingFanFicFilter) { 
			features.autoLoad.autoLoadLists(); 
		}

	}
}

/***************** Features *****************/

features = {

	fixStyles: function() {
		this.fixTheme();

		utils.addStyle(
			'.nocopy { -moz-user-select: inherit !important; } ' +

			'#storytextp, #storytext { -moz-user-select: inherit !important; }' + 
			
			// Increase from firefox default 999999px to allow for very long pages when autoloading long stories
			'html,body,div,span,p,table td,table thead { max-height:999999999px !important}'
		);
	},

	fixLinks: function() {
		$('.fake_link').each(
			function () {
				var link = document.createElement("a");
				link.href = this.getAttribute('onclick').match(/.*\('(.*)'\).*/)[1];
				link.title = this.getAttribute('title');
				link.innerHTML = utils.parseHTML(this.innerHTML);
				this.parentNode.replaceChild(link, this);
			}
		)
	},

    /**
     * Called on theme switch (light/dark) and fixes some design problems (dark links on dark background etc)
     */
    fixTheme: function() {
        utils.addStyle(
            'body.dark #content_parent .btn {' +
                'background-color: #555;' +
                'background-image: linear-gradient(to bottom, #666, #444);' +
                'background-repeat: repeat-x;' +
                'border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);' +
                'color: #FFFFFF;' +
                'text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);' +
            '}' +
			'body.dark #content_parent div#alert_subs {' +
				'color: #eee;' +
			'}' +
			'body.dark .lc-left {' +
				'background-color: #333;' +
			'}' +
            'body.dark #content_parent select {' +
                'background-color: #555;' +
                'color: #eee;' +
                'border-color: #777;' +
            '}' +
            'body.dark #content_parent a, body.dark #content_parent a:link, ' +
            'body.dark #content_parent a:active, body.dark #content_parent a:visited {' +
                'color: #6AB7FF' +
            '}'
        );

        /* Wait for theme change to happen before fixing theme */
        setTimeout(function() {
            if ($("#content_wrapper").css("background-color") !== "rgb(255, 255, 255)") {
                $(env.w.document.body).addClass('dark');
            }
        }, 100);

        function toggleTheme() {
            if ($('body').hasClass('dark')) {
                $(env.w.document.body).removeClass('dark');
            } else {
                $(env.w.document.body).addClass('dark');
            }
        }
        $("[title='Story Contrast']").click(toggleTheme);
    },

	shouldHideListEntry: function(listEntry) {
		var html = listEntry.html();
		if (settings.viewLanguages.length > 0) {
			var matcher = html.match(/Rated: .*? - (.*?) - /);
			if (!matcher) { return false; }

			if (matcher[1]) {
				var storyLang = matcher[1].toLowerCase();
				var foundMatch = false;
				for (var i = 0; i < settings.viewLanguages.length; i++) {
					var vl = settings.viewLanguages[i].toLowerCase().trim();
					if (vl === storyLang) {
						foundMatch = true;
						break;
					}
				}
				if (!foundMatch) {
					return true;
				}
			}
		}

		if (settings.lowWordCount > 0) {
			var matcher = html.match(/Words: (.*?) - /);
			if (!matcher) { return false; }
			if (matcher[1]) {
				var wordcount = utils.parseNum(matcher[1]);
				if (wordcount < settings.lowWordCount) {
					return true;
				}
			}
		}

		if (settings.blacklistedWords.length > 0) {
			var matcher = html.match(/<div class="z-indent z-padtop">(.*?)<div/);
			if (!matcher) { return false; }
			if (matcher[1]) {
				var summary = matcher[1];
				var re = new RegExp(".*("+settings.blacklistedWords.join('|')+").*", "i");
				var matcher = summary.match(re);
				if (matcher) { 
					return true;
				}
			}
		}

		return false;
	},

	formatting: {

		doStoryPageInfo: function(elementToFormat) {
			elementToFormat.attr('id', 'details-line');
			this.formatInfo(elementToFormat, undefined, true);
		},

		doListEntry: function(listEntry) {
			listEntry = $(listEntry);
			if (!settings.usingFanFicFilter && features.shouldHideListEntry(listEntry)) {
				listEntry.remove();
				return false;
			}
			
			var reviewLink = listEntry.children('a[href^="/r/"]');
			if (settings.combineReview) { 
				reviewLink.hide(); 
			}
			
			var reviewsUrl = reviewLink.attr('href') || '';

			if (reviewsUrl === '') {
				var storyLink = listEntry.children('a[href^="/s/"]');
			    var storyUrl = storyLink.attr('href') || '';
				var urlMatch = storyUrl.match(/\/s\/(\d+)/);
				if (urlMatch && urlMatch[1]) {
					var storyId = urlMatch[1];
					reviewsUrl = '/r/' + storyId + '/';
				}
			}

			listEntry[0].innerHTML = utils.parseHTML(utils.markWords(listEntry[0].innerHTML, settings.markWords));
			this.formatInfo(listEntry.find('.z-padtop2,.gray,.xgray'), reviewsUrl);
			return true;
		},

		formatInfo: function(detailsLine, reviewsUrl, saveIsComplete) {
			// arguments verification.
			if ((detailsLine = $(detailsLine)).length === 0) { return; }
			if (!reviewsUrl) { reviewsUrl = detailsLine.children('a[href^="/r/"]').attr('href') || ''; }

			var html = detailsLine[0].innerHTML,
				bCompleted = false,
				matcher; // for general purposes :)

			if (settings.viewLanguages != null && settings.viewLanguages.length === 1 && settings.viewLanguages[0].indexOf('-') === -1) {
				html = html.replace(new RegExp(' - ' + settings.viewLanguages[0] + ' - ', 'i'), ' - ');
			}

            matcher = html.match(/Rated: (<a [^>]+>)?(Fiction\s+)?([\w+]+)(<\/a>)?/);
			if (matcher) {
				html = html.replace(matcher[0], features.formatting._getRatingTagString(matcher[3]));
			}

			// if a Complete text exists, remove it and keep note of it.
            matcher = html.match(/[\s\-]*(Status: )?Complete([\s\-]*)/);
			if (matcher) {
				bCompleted = true;
				html = html.replace(matcher[0], matcher[2]);
			}

			// set the review link
            matcher = html.match(/Reviews: (<a[^>]+>)?([\d,]+)(<\/a>)?/);
			if (matcher && settings.combineReview) {
				var reviewLink = 'Reviews: ' + utils.getReadableNumber(matcher[2]);
				if (reviewsUrl) { reviewLink = '<a href="' + reviewsUrl + '" style="color: gray;border-bottom: 1px dashed">' + reviewLink + '</a>'; }
				html = html.replace(matcher[0], reviewLink);
			}

			var totalChapters = env.totalChapters;
			if (env.totalChapters === 1) { totalChapters = 0; }

			// set the words/chapter
            matcher = html.match(/(Chapters: ([\d,]+) +- )?Words: ([\d,]+)/);
			if (matcher) {
				totalChapters = utils.parseNum(matcher[2]);
				if (!totalChapters) {totalChapters = 1;}
				var totalWords = utils.parseNum(matcher[3]);
				var wordsPerChapter = Math.round( totalWords / totalChapters );

				if (settings.colorWordCount) {
					html = html.replace(matcher[0], 'Size: <span style="color: ' + utils.getWordCountColor(wordsPerChapter) + ';"><abbr title="Average: ' + utils.getReadableNumber(wordsPerChapter) + ' words per chapter">' + totalChapters + '/' + utils.getReadableNumber(totalWords) + '</abbr></span>');
				} else if (settings.colorWordStoryCount) {
					html = html.replace(matcher[0], 'Size: <span style="color: ' + utils.getWordCountColor(totalWords) + ';"><abbr title="Average: ' + utils.getReadableNumber(wordsPerChapter) + ' words per chapter">' + totalChapters + '/' + utils.getReadableNumber(totalWords) + '</abbr></span>');
				} else {
					html = html.replace(matcher[0], 'Size: <abbr title="Average: ' + utils.getReadableNumber(wordsPerChapter) + ' words per chapter">' + totalChapters + '/' + utils.getReadableNumber(totalWords) + '</abbr>');
				}
			}

            // format favorites and followers text
            matcher = html.match(/( - Favs: [\d,]+| - Follows: [\d,]+){1,2}/); // either favs, follows, or both in either order
			if (matcher && settings.shortenFavsFollows) {
				var orig = matcher[0];
				var favs = (matcher = orig.match(/Favs: ([\d,]+)/)) ? matcher[1] : 0,
					follows = (matcher = orig.match(/Follows: ([\d,]+)/)) ? matcher[1] : 0;
				html = html.replace(orig, features.formatting._getFavsFollowsString(utils.parseNum(favs), utils.parseNum(follows)));
			}

			matcher = html.match(/( - (?:Updated: (.+?) - )?Published: (.+?))(?: -|$)/);  // 0 - all, 1 - part to replace, 2 - Updated/undefined 3 - Published
			if (matcher) {
				var publishDate = matcher[3], updateDate = matcher[2];
				html = html.replace(matcher[1], features.formatting._getUpdatedPublishedString(publishDate, updateDate, bCompleted, totalChapters));
			}

			env.isComplete = bCompleted;
			detailsLine[0].innerHTML = utils.parseHTML(html);
		},

		/**
		 * Gets the " - Updated: x/y/z - Published: a/b/c" string, formatted per the user's settings.
		 * @param publishDate The raw FF.net formatted date of this story's publishing.
		 * @param updateDate The raw FF.net formatted date of this story's last update (or null, for single chapter stories).
		 * @param completed whether this story is complete.
		 * @param totalChapters The number of total chapters in the story.
		 */
		_getUpdatedPublishedString: function(publishDate, updateDate, completed, totalChapters) {
			publishDate = utils.dates.parseFFDate(publishDate);
			updateDate = updateDate ? utils.dates.parseFFDate(updateDate) : null;

			// in case there was no update date specified (i.e. for a oneshot or a story that was never updated)
			if (!updateDate) { return ' - ' + utils.dates.formatDateExtended(publishDate, completed, 'Published: '); }

			var avgPostingFrequency = 0;
			if (totalChapters > 0) {
				var storyLifespan = (updateDate - publishDate) / 1000 / 24 / 3600;
				avgPostingFrequency = storyLifespan / totalChapters;
			}

			// declare the final strings.
			var publishedPart = ' - Published: ' + utils.dates.formatDate(publishDate),
				updatedPart = ' - ' + utils.dates.formatDateExtended(updateDate, completed, 'Updated: ', avgPostingFrequency);

			return (settings.dateOrder === 1) ? updatedPart + publishedPart : publishedPart + updatedPart;
		},

		_getFavsFollowsString: function(favsCount, followsCount) {
			return ' - <abbr title="Favorited by ' + utils.getReadableNumber(favsCount) + ' people">&#x2661;' + utils.getReadableNumber(favsCount) + '</abbr> ' +
					'<abbr title="Followed by ' + utils.getReadableNumber(followsCount) + ' people">&#x2606;' + utils.getReadableNumber(followsCount) + '</abbr>';
		},

		_getRatingTagString: function(rating) {
			var description = 'Unknown rating';
			switch(rating.toLowerCase()) {
				case 'k':
					description = 'Intended for general audience 5 years and older. Content should be free of any coarse language, violence, and adult themes.';
					break;
				case 'k+':
					description = 'Suitable for more mature childen, 9 years and older, with minor action violence without serious injury. May contain mild coarse language. Should not contain any adult themes.';
					break;
				case 't':
					description = 'Suitable for teens, 13 years and older, with some violence, minor coarse language, and minor suggestive adult themes.';
					break;
				case 'm':
					description = 'Not suitable for children or teens below the age of 16 with non-explicit suggestive adult themes, references to some violence, or coarse language.\n\n' +
						'Fiction M can contain adult language, themes and suggestions. Detailed descriptions of physical interaction of sexual or violent nature is considered Fiction MA.';
					break;
				case 'ma':
					description = 'Content is only suitable for mature adults. May contain explicit language and adult themes.';
			}

			return '<abbr title="' + description.replace('"', '') + '">Rated: ' + rating + '</abbr>';
		}
	},

	/**
	 * Redirects the browser to the specified chapter's page.
	 * @param chapterNum The chapter to navigate to.
	 */
	redirectToChapter: function(chapterNum) {
		utils.infoBar.setText('-- Jumping to chapter ' + chapterNum + ': ' + utils.chapters.getTitle(chapterNum) + ' --');
		document.location = utils.chapters.getLink(chapterNum);
	},

	autoLoad: {

		/** Starts the process of loading all chapters of a story (using a recursive function). */
		loadFullStory: function() {
			this._fullStoryLoadStep(1);		
		},
		
		

		/**
		 * Loads a chapter with the intention of loading the next one after it (until all chapters are loaded).
		 * @param chapterNum The chapter to load.
		 */
		_fullStoryLoadStep: function(chapterNum) {
			var chapNum = chapterNum;

			// if we're not at the end, be prepared to load the next chapter after loading this one.
			var callback = (chapNum < env.totalChapters) ? function() { features.autoLoad._fullStoryLoadStep(chapNum + 1); } : features.autoLoad._jumpToReview;


			if ($('#GEASEMONKEYSEPARATOR' + chapNum).length === 0) { // the chapter hasn't been loaded yet
				features._loadChapterContent(chapNum, /* addBefore: */ chapNum < env.currentChapter, callback);
			} else {
				if (callback) { callback(); }
			}
		},
		
		/**
		Jump to revie section if the user changed the review drop down list last time, only works when showing chapter drop down and auto load full is true
		
		*/
		_jumpToReview: function (){
			if(utils.getOptionValue("ReviewChapterChanged") === true) {
				utils.setOptionValue("ReviewChapterChanged", false);
				$([document.documentElement, document.body]).animate({
					scrollTop: $("#review_name_value").offset().top
				}, 100);
			};
		},

		autoLoadLists: function( ) {
			env.nextListPageUrl = this._getNextLinkPageUrl($(document.body));
			if (!env.nextListPageUrl) { return; } // if we don't have a "next" link, there's no place to load from.

			var interval = -1;

			interval = setInterval(function() {

				// stop this if we don't have a next page url, or we'll try to load from an empty string (bad but funny - it then loads this page which leads to circular loading)
				if (!env.nextListPageUrl) {
					clearInterval(interval);
					return;
				}

				if (utils.pos.getScreenfullsLeft() < 0.5 && !utils.infoBar.isShown()) {
					features.autoLoad._loadListPage(env.nextListPageUrl);
				}

			}, 100);
		},

		_loadListPage: function(pageUrl) {
			utils.infoBar.setText('-- Loading next page --');

			var nextLinkFunc = this._getNextLinkPageUrl;

			utils.httpRequest({
				url: pageUrl,
				onload: function(responseDetails) {

					var responseBody = responseDetails.responseText.match(/<body[\s\S]*<\/body>/gi);
					if (!responseBody || !responseBody[0])  { // the body was not found :(
						utils.infoBar.setText('-- Error loading page --');
						return;
					}

					responseBody = responseBody[0];
					responseBody = responseBody.replace(/^<body/i, "<div").replace(/\/body>$/, '/div>');
					responseBody = $(responseBody).first();

					env.nextListPageUrl = nextLinkFunc(responseBody);

					responseBody.find('.z-list')
						.filter(function() { return features.formatting.doListEntry(this); }) // format the entry's text, and include only the non-hidden entries
						.hover(
							function() { $(this).addClass('z-high'); },
							function() { $(this).removeClass('z-high'); }) // add the z-high class at hover
						.filter(function() {
									$(this).find('img.lazy').lazyload({})
									.hover(
										function() { $(this).addClass('cimage_hover'); },
										function() { $(this).removeClass('cimage_hover'); }
									);
									return true;
								})
						.insertAfter('.z-list:last');

					responseBody.empty().remove(); // clean up the loaded DOM.

					utils.infoBar.hide();
				}
			});
		},

		/**
		 * Finds the target of the "next" link of the list.
		 * @param parent The element that should contain the list (dom or textual)
		 */
		_getNextLinkPageUrl : function(parent) {
			// finds links with their text ~exactly~ "next" or "Next \u00bb" (») or "Next »"
			var anchors = $(parent).find('a:contains("next"),a:contains("Next \u00bb"),a:contains("Next »")')
					.filter(function() {return $(this).text() === 'Next \u00bb' || $(this).text() === 'next'; } );
			return anchors.last().attr('href');
		}
	},

	setLoadAsYouGo: function() {
		if (!settings.loadAsYouGo) { return; }

		env.lastLoadedChapter = env.currentChapter;

		var chapterLoadInterval = 0, refreshHashInterval = 0;

		chapterLoadInterval = setInterval(function () {loadChapterIfNeeded();}, 100);
		refreshHashInterval = setInterval(function () {refreshHash();}, 50);

		var storytextp = $('#storytextp')[0];

		function loadChapterIfNeeded() {
			if (env.lastLoadedChapter >= env.totalChapters) { // stop when you've loaded all chapters.
				clearInterval(chapterLoadInterval);
				chapterLoadInterval = -1;
			}

			if (env.lastLoadedChapter < env.totalChapters && !utils.infoBar.isShown() && utils.pos.getScreenfullsLeft(storytextp) < 1.5)  {
				features._loadChapterContent(env.lastLoadedChapter + 1, false /* do not add before */, function() { env.lastLoadedChapter++; });
			}
		}

		function refreshHash() {

			var currentHash = utils.parseNum(utils.getLocationHash()) || 0;
			if (currentHash >= (utils.parseNum(env.totalChapters) || 0)) {
				/* If there won't be anymore chapters loaded, we can stop checking for hashes.
				 * Otherwise, a new chapter might raise the totalChapters count and more hash refreshing will be needed. */
				if (chapterLoadInterval === -1) {
					clearInterval(refreshHashInterval);
					refreshHashInterval = -1;
				}
				return;
			}

			$('header.fftools-chapter-sep:not(.current-chapter)').each(function() {
				var chapId = utils.parseNum($(this).attr('data-chapterid')) || 0;
				if (chapId <= currentHash) { return; } // wev'e already passed this separator.
				if (utils.pos.getRelativeHeight(this) < 100) { // the separator is either in the top 100 pixels of the screen, or we've passed it.
					document.location.hash = chapId;
				}
			});
		}
	},

	/**
	 * Retrieves a chapter from the server asynchronously, parses it's contents,
	 * and inserts the chapter text before or after the current chapter's one.
	 * Note: This function also updates the environment's totalChapters with fresh info from the server.
	 * @param chapterNum The number of the chapter to load.
	 * @param addBefore Whether to add this chapter before the current one, or append it to the end.
	 * @param callback An optional function to call after the loading is complete.
	 */
	_loadChapterContent: function(chapterNum, addBefore, callback) {
		var chapterTitle = utils.chapters.getTitle(chapterNum);
		utils.infoBar.setText('-- Loading chapter ' + chapterNum + '/' + env.totalChapters + ': ' + chapterTitle + ' --');

		utils.httpRequest({
			url: utils.chapters.getLink(chapterNum),
			onload: function(responseDetails) {
				var regmatch = responseDetails.responseText.match(/<div class=['"]storytext[^'"]*['"] id=['"]storytext['"]>([\s\S]*?)<\/div>/i);
				if (regmatch == null || !regmatch[1]) { utils.infoBar.setText('Error loading next page'); return; }

				// calculating new maximum chapter, in case another chapter was added.
				// this is not necessary when loading full stories, since the chances for an update during load are slim, and this is a somewhat costly operation
				if (!settings.fullStoryLoad) {
					env.totalChapters = utils.chapters.getCountFromHtmlString(responseDetails.responseText);
				}

				var storytext = regmatch[1];
				var sharetext = '';

				// if we have a "Share" div, we remove it from the story text so we can put it /before/ the separator.
				var sharematch = storytext.match(/<div class='a2a_kit [\s\S]*?<\/div>/i);
				if (sharematch) {
					sharetext = sharematch[0];
					storytext = storytext.replace(sharetext, '');
				}

				// NOTE: I deliberately do not put the sharetext here (before the separator where it belongs) because a JS function must be called to initialize it, which I cannot found for now. I have to see if the share links are really nessecary

				// we insert 'before' the story-end so the 'end' would move to after the ~new~ chapter, and the next one will load after this new chapter and not after the original one.
				$(addBefore ? '#story-start' : '#story-end').before(features._getChapterSeparator(chapterNum, chapterTitle) + storytext);

				features._addEndOfStorySeparatorIfNeeded(chapterNum);

				utils.infoBar.hide();
				if (callback) { callback(); }
			}
		});
	},

	/***************** Options Menu *****************/

	settings: {
		load: function() {

			function _innerLoad(settName, parseFunc) {
                parseFunc = parseFunc || null;
				var value = utils.getOptionValue(settName);
				if (value !== undefined && parseFunc) { 
					value = parseFunc(value);
				}
				if (value === undefined) {
					value = defaultSettings[settName];
					utils.setOptionValue(settName, value);
				}
				settings[settName] = value;
			}

			function _splitWOEmptyParts(separator) {
				return function(val) {
					var split = val.toString().split(separator);
					var arr = [];
					for (var i = 0; i < split.length; i++) {
						if (split[i] != null && split[i].trim() !== '') {
							arr.push(split[i]);
						}
					}
					return arr;
				};
			}

			if (utils.getOptionValue('colorDate') === undefined) { 
				features.settings.save(defaultSettings);
			}
			_innerLoad('colorDate');
			_innerLoad('colorComplete');
			_innerLoad('dateFormat');
			_innerLoad('dateOrder');
			_innerLoad('sep');
			_innerLoad('fullStoryLoad');
			_innerLoad('loadAsYouGo');
			_innerLoad('loadListsAsYouGo');
			_innerLoad('markWords', _splitWOEmptyParts('|'));
			_innerLoad('combineReview');
			_innerLoad('shouldRelativeDate');
			_innerLoad('showPostingFrequency');
			_innerLoad('hideChaptersNavigator');
			_innerLoad('shortenFavsFollows');
			_innerLoad('viewLanguages', _splitWOEmptyParts('|'));
			_innerLoad('showFirstChapterSeparator');
			_innerLoad('usingFanFicFilter');			
			_innerLoad('colors_shade1');
			_innerLoad('colors_shade2');
			_innerLoad('colors_shade3');
			_innerLoad('colors_shade4');
			_innerLoad('colors_shade5');
			_innerLoad('colors_shade6');
			_innerLoad('colors_shade7');
			_innerLoad('colors_complete');
			_innerLoad('colors_marked_words');
			_innerLoad('filtersFormat');
			_innerLoad('colorWordCount');
			_innerLoad('colorWordStoryCount');
			_innerLoad('word_count1');
			_innerLoad('word_count2');
			_innerLoad('word_count3');
			_innerLoad('word_count4');
			_innerLoad('word_count5');
			_innerLoad('word_count6');
			_innerLoad('word_count7');
			_innerLoad('allowCtrlA');
			_innerLoad('fixLinks');
			_innerLoad('lowWordCount');
			_innerLoad('blacklistedWords', _splitWOEmptyParts('|'));
		},

		save: function(sett) {
			var s2s /* settings to set */ = sett || settings;
			function _innerSet(settName, serFunc) {
				var value = s2s[settName];
				if (serFunc) {
					value = serFunc(value); 
				}
				utils.setOptionValue(settName, value);
			}

			/* Workaround for some issues when trying to join */
			function _join(separator) {
				return function(val) {
					if (Array.isArray(val)) {
						return val.join(separator);
					} else {
						var split = val.toString().split(separator);
						var arr = [];
						for (var i = 0; i < split.length; i++) {
							if (split[i] !== '' && split[i] != null) {
								arr.push(split[i]);
							}
						}
						return arr.join(separator);
					}
				};
			}

			_innerSet('colorDate');
			_innerSet('colorComplete');
			_innerSet('dateFormat');
			_innerSet('dateOrder');
			_innerSet('sep');
			_innerSet('fullStoryLoad');
			_innerSet('loadAsYouGo');
			_innerSet('loadListsAsYouGo');
			_innerSet('markWords', _join('|'));
			_innerSet('combineReview');
			_innerSet('shouldRelativeDate');
			_innerSet('showPostingFrequency');
			_innerSet('hideChaptersNavigator');
			_innerSet('shortenFavsFollows');
			_innerSet('viewLanguages', _join('|'));
			_innerSet('showFirstChapterSeparator');
			_innerSet('usingFanFicFilter');			
			_innerSet('colors_shade1');
			_innerSet('colors_shade2');
			_innerSet('colors_shade3');
			_innerSet('colors_shade4');
			_innerSet('colors_shade5');
			_innerSet('colors_shade6');
			_innerSet('colors_shade7');
			_innerSet('colors_complete');
			_innerSet('colors_marked_words');
			_innerSet('filtersFormat');
			_innerSet('colorWordCount');
			_innerSet('colorWordStoryCount');
			_innerSet('word_count1');
			_innerSet('word_count2');
			_innerSet('word_count3');
			_innerSet('word_count4');
			_innerSet('word_count5');
			_innerSet('word_count6');
			_innerSet('word_count7');
			_innerSet('allowCtrlA');
			_innerSet('fixLinks');
			_innerSet('lowWordCount');
			_innerSet('blacklistedWords', _join('|'));
		}
	},

	/** This is used to create a menu at the top of the page, that opens a configuration window. */
	optionsMenu: {

		/** This sets up the menu (both the actual menu and the button that opens it) */
		setup: function() {
			$('.zui td:last-child').append(utils.parseHTML('<div id="menu-fftools" class="xmenu_item"><a class="dropdown-toggle" href="" onclick="return false;">Fanfiction Tools Options</a></div>'));
			$('#menu-fftools').click(features.optionsMenu.show);

			utils.addStyle(
				'#menu-fftools { display: inline-block; margin-top: 4px; float: right; text-decoration: none; }' +
				'#ffto-mask { top: 0; left: 0; width: 100%; height: 100%; position: fixed; opacity: 0.75; background-color: #777; z-index: 5; }' +
				'#ffto-menu-wrapper { border: 1px solid #CDCDCD; background-color: #F6F7EE; padding: 4px; width: 500px;' +
				'position: absolute; top: 50px; left: 50%; margin-left: -250px; z-index: 5; }' +
				'#ffto-menu { background-color: white; min-height: 150px; border: 1px solid #CDCDCD; }' +
				'#ffto-menu .tabs { background-color: #F0F1E6; margin-bottom: 2px; padding-bottom: 2px; }' +
				'#ffto-menu .tabs > ul { background-color: #F6F7EE; border-bottom: 1px solid #CDCDCD; }' +
				'#ffto-menu .tabs li { display: inline-block; padding: 0; }' +
				'#ffto-menu .tabs li:first-child { padding-left: 5px; }' +
				'#ffto-menu .tabs li.active { background-color: #F0F1E6; border-bottom: 1px solid #F0F1E6; border-left: 1px solid #CDCDCD; border-right: 1px solid #CDCDCD; margin-bottom: -1px; }' +
				'#ffto-menu .tabs li:first-child.active { border-left: none; }' +
				'#ffto-menu .tabs li a { display: inline-block; padding: 5px 8px; margin: 2px 1px; cursor: pointer; text-decoration: none; color: #000; }' +
				'#ffto-menu .tabs li a:hover { text-decoration: underline; border-bottom: none; }' +
				'#ffto-menu INPUT { width: auto; }' +
				'#ffto-menu-title { color: white; background-color: #339; font-weight: bold; font-size: 15px; padding: 5px 10px; }' +
				'.fftools-options-body { font-size: 12px; padding: 5px; }' +
				'.ffto-title { letter-spacing: 1px; margin-left: 3px; font-size: 16px; margin-top: 2px; margin-bottom: 2px; }' +
				'.ffto-sect { padding: 5px 2px; margin: 5px 0; border-top: 1px solid #CDCDCD; border-bottom: 1px solid #CDCDCD }' +
				'.ffto-sect:last-of-type { border-bottom: none }' +
				'#ffto-menu UL { padding: 0; margin: 0; list-style: none; }' +
				'#ffto-menu SELECT { font-size: 12px; }' +
				'#ffto-menu LABEL { display: inline-block; margin-top: 4px; margin-right: 5px; }' +
				'#ffto-menu INPUT[type=text] { font-size: 12px; padding: 2px; margin-right: 5px; width: auto; }' +
				'#ffto-menu INPUT[type=checkbox] { margin-top: 0; }' +
				'#ffto-menu .comment { font-size: 9px; display: inline-block; }' +
				'#ffto-menu .help { float: right; border: 1px solid #339; border-radius: 10px; height: 18px; width: 18px; text-align: center; cursor: help; margin-right: 15px; }' +
				'#ffto-sect-dates > UL { margin-bottom: 5px; }' +
				'#ffto-sect-dates > UL > LI { display: inline-block; width: 49%; }' +
				'#ffto-sect-dates > DIV { display: inline-block; margin: 0 5px; margin-top: 5px; }' +
				'#ffto-sect-autoload > UL { margin-bottom: 5px; }' +
				'#ffto-sect-autoload > UL > LI { display: inline-block; width: 49%; }' +
				'#ffto-sect-autoload > DIV { display: inline-block; margin: 0 5px; margin-top: 5px; }' +
				'#ffto-sect-info > UL { margin-bottom: 5px; }' +
				'#ffto-sect-info > UL > LI { display: inline-block; width: 49%; }' +
				'#ffto-sect-info > DIV { display: inline-block; margin: 0 5px; margin-top: 5px; }' +
				'#ffto-date-sep { text-align: center; }' +
				'#ffto-autoload-stories { margin-left: 5px; }' +
				'#ffto-autoload-lists { margin-left: 0px; }' +
				'#ffto-first-chap-sep { margin-left: 0px; }' +
				'#ffto-sect-info LI { margin: 3px 0 }' +
				'#ffto-menu-footer { font-size: 10px; margin-top: 2px; position: relative }' +
				'.ffto-link-to-script { display: inline-block; right: 0pt; bottom: 0 }' +
				'#ffto-buttons { text-align: center; padding: 5px 0px 14px 0px; }' +
				'#ffto-buttons INPUT[type=button] { margin: 3px }' +
				'#ffto-menu-close-x { float: right; color: white; border: medium none; font-weight: inherit; }' +
				'#ffto-sect-word-counts TD { padding-left: 5px; min-width: 90px; }' +
				'#ffto-sect-word-counts INPUT[type=number] { width: 85%; }');

			var col1_desc = 'Shows when the fic was updated within the last week',
				col2_desc = 'Shows when the fic was updated in the last two weeks',
				col3_desc = 'Shows when the fic was updated in the last month',
				col4_desc = 'Shows when the fic was last updated in the last two months',
				col5_desc = 'Shows when the fic was last updated in the last three months',
				col6_desc = 'Shows when the fic was last updated in the last six months',
				col7_desc = 'Shows when the fic was NOT updated at all in the last six months',
				col_complete_desc = 'Shows when the fic is complete';

			$(env.w.document.body).append(utils.parseHTML(
				'<div id="ffto-mask" style="display: none"></div>' +
				'<div id="ffto-menu-wrapper" style="display: none">' +
					'<div id="ffto-menu">' +
						'<div id="ffto-menu-title"><a id="ffto-menu-close-x" href="#" onclick="return false">X</a>Fanfiction Tools Options</div>' +
						'<div class="tabs">' +
							'<ul>' +
								'<li class="active main-tab"><a>Main</a></li>' +
								'<li class="colors-tab"><a>Colors</a></li>' +
								'<li class="word-counts-tab"><a>Word counts</a></li>' +
								'<li class="misc-tab"><a>Misc.</a></li>' +
							'</ul>' +
						'</div>' +
						'<div class="fftools-options-body main-tab">' +
							'<div class="ffto-title">Dates</div>' +
							'<div class="ffto-sect" id="ffto-sect-dates">' +
								'<ul>' +
									'<li><input id="ffto-color-dates" type="checkbox"' + (settings.colorDate ? ' checked="checked"' : '') + '/> <label for="ffto-color-dates">Color Dates</label></li>' +
									'<li><input id="ffto-relative-dates" type="checkbox"' + (settings.shouldRelativeDate ? ' checked="checked"' : '') + '/> <label for="ffto-relative-dates">Show Relative Dates</label></li>' +
								'</ul>' +
								'<div>' +
									'<label for="ffto-date-format">Date Format:</label>' +
									'<select id="ffto-date-format">' +
										'<option' + (settings.dateFormat === 0 ? ' selected="selected"' : '') + ' value="0">US - 12/31/2000</option>' +
										'<option' + (settings.dateFormat === 1 ? ' selected="selected"' : '') + ' value="1">UK - 31/12/2000</option>' +
									'</select>' +
								'</div>' +
								'<div>' +
									'<label for="ffto-date-sep">Separator:</label>' +
									'<input id="ffto-date-sep" type="text"  size="2" value="' + settings.sep + '"/>' +
								'</div>' +
								'<div>' +
									'<label for="ffto-dates-order">Dates order:</label>' +
									'<select id="ffto-dates-order">' +
										'<option' + (settings.dateOrder === 1 ? ' selected="selected"' : '') + ' value="1">Updated-Published</option>' +
										'<option' + (settings.dateOrder === 0 ? ' selected="selected"' : '') + ' value="0">Published-Updated</option>' +
									'</select>' +
								'</div>' +
							'</div>' +
							'<div class="ffto-title">Auto Loading</div>' +
							'<div class="ffto-sect" id="ffto-sect-autoload">' +
								'<div>' +
									'<label for="ffto-autoload-stories">Stories:</label>' +
									'<select id="ffto-autoload-stories">' +
										'<option' + ((!settings.loadAsYouGo && !settings.fullStoryLoad) ? ' selected="selected"' : '') + ' value="none">No autoloading</option>' +
										'<option' + ((settings.loadAsYouGo && !settings.fullStoryLoad) ? ' selected="selected"' : '') + ' value="chapter">Autoload next chapter</option>' +
										'<option' + (settings.fullStoryLoad ? ' selected="selected"' : '') + ' value="full">Autoload full story</option>' +
									'</select>' +
								'</div>' +
								'<ul>' +
									'<li>' +
										'<input id="ffto-first-chap-sep" type="checkbox"' + (settings.showFirstChapterSeparator ? ' checked="checked"' : '') + '/> <label for="ffto-first-chap-sep">Show title for first chapter</label>' +
									'</li>' +
									'<li>' +
										'<input id="ffto-hide-chapters-navigator" type="checkbox"' + (settings.hideChaptersNavigator ? ' checked="checked"' : '') + '/> <label for="ffto-hide-chapters-navigator">Hide chapters drop-down list</label>' +
									'</li>' +
									'<li>' +
										'<input id="ffto-autoload-lists" type="checkbox"' + (settings.loadListsAsYouGo ? ' checked="checked"' : '') + '/> <label for="ffto-autoload-lists">Autoload lists</label>' +
									'</li>' +
								'</ul>' +
							'</div>' +
							'<div class="ffto-title">Story Info</div>' +
							'<div class="ffto-sect" id="ffto-sect-info">' +
								'<ul>' +
									'<li>' +
										'<label for="ffto-marked-words">Words to mark:</label>' +
										'<input id="ffto-marked-words" type="text" value="' + settings.markWords.join('|') + '" size="25" />' +
										'<div class="comment"> - pipe-sign ("|") separated</div>' +
									'</li>' +
									'<li>' +
										'<div class="help" title="Show only stories of these languages. Empty list shows all languages">?</div>' +
										'<label for="ffto-view-langs">Story Languages:</label>' +
										'<input id="ffto-view-langs" type="text" value="' + settings.viewLanguages.join('|') + '" size="25" />' +
										'<div class="comment"> - pipe-sign ("|") separated</div>' +
									'</li>' +
									'<li>' +
										'<div class="help" title="Don\'t show stories with these words. Empty list shows all stories">?</div>' +
										'<label for="ffto-view-langs">Blacklisted Words:</label>' +
										'<input id="ffto-blacklisted-words" type="text" value="' + settings.blacklistedWords.join('|') + '" size="25" />' +
										'<div class="comment"> - pipe-sign ("|") separated</div>' +
									'</li>' +
									'<li>' +
										'<label for="ffto-low-word-count">Low word count:</label>' +
										'<input type="number" id="ffto-low-word-count" class="word-counts" value="' + settings.lowWordCount + '" size="7"/>' +
										'<div class="comment">Don\'t show stories with lower word count</div>' +
									'</li>' +
									'<li><input id="ffto-combine-reviews-link" type="checkbox"' + (settings.combineReview ? ' checked="checked"' : '') + '/> <label for="ffto-combine-reviews-link">Combine reviews link and count</label></li>' +
									'<li><input id="ffto-shorten-favs-follows" type="checkbox"' + (settings.shortenFavsFollows ? ' checked="checked"' : '') + '/> <label for="ffto-shorten-favs-follows">Shorten favs and follows</label></li>' +
									'<li><input id="ffto-posting-frequency" type="checkbox"' + (settings.showPostingFrequency ? ' checked="checked"' : '') + '/> <label for="ffto-posting-frequency">Show Posting Frequency</label></li>' +
									'<li><input id="ffto-color-complete" type="checkbox"' + (settings.colorComplete ? ' checked="checked"' : '') + '/> <label for="ffto-color-complete">Color Complete Stories</label></li>' +
								'</ul>' +
							'</div>' +
						'</div>' +
						'<div class="fftools-options-body colors-tab">' +
							'<div class="ffto-title">Story Status <span class="comment">(click in the text boxes to open a color chooser)</span></div>' +
							'<div class="ffto-sect" id="ffto-sect-color-status">' +
								'<table>' +
									'<tr>' +
										'<td><label title="' + col1_desc + '" for="ffto-colors-s1">Shade 1:</label></td>' +
										'<td><input type="text" title="' + col1_desc + '" id="ffto-colors-s1" class="color" value="' + settings.colors_shade1 + '"/></td>' +
										'<td><label title="' + col5_desc + '" for="ffto-colors-s5">Shade 5:</label></td>' +
										'<td><input type="text" title="' + col5_desc + '" id="ffto-colors-s5" class="color" value="' + settings.colors_shade5 + '"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label title="' + col2_desc + '" for="ffto-colors-s2">Shade 2:</label></td>' +
										'<td><input type="text" title="' + col2_desc + '" id="ffto-colors-s2" class="color" value="' + settings.colors_shade2 + '"/></td>' +
										'<td><label title="' + col6_desc + '" for="ffto-colors-s6">Shade 6:</label></td>' +
										'<td><input type="text" title="' + col6_desc + '" id="ffto-colors-s6" class="color" value="' + settings.colors_shade6 + '"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label title="' + col3_desc + '" for="ffto-colors-s3">Shade 3:</label></td>' +
										'<td><input type="text" title="' + col3_desc + '" id="ffto-colors-s3" class="color" value="' + settings.colors_shade3 + '"/></td>' +
										'<td><label title="' + col7_desc + '" for="ffto-colors-s7">Shade 7:</label></td>' +
										'<td><input type="text" title="' + col7_desc + '" id="ffto-colors-s7" class="color" value="' + settings.colors_shade7 + '"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label title="' + col4_desc + '" for="ffto-colors-s4">Shade 4:</label></td>' +
										'<td><input type="text" title="' + col4_desc + '" id="ffto-colors-s4" class="color" value="' + settings.colors_shade4 + '"/></td>' +
										'<td><label title="' + col_complete_desc + '" for="ffto-colors-complete">Complete:</label></td>' +
										'<td><input type="text" title="' + col_complete_desc + '" id="ffto-colors-complete" class="color" value="' + settings.colors_complete + '"/></td>' +
									'</tr>' +
								'</table>' +
							'</div>' +
							'<div class="ffto-title">Marked Words Colors</span></div>' +
							'<div class="ffto-sect" id="ffto-sect-color-misc">' +
								'<label for="ffto-colors-marked">Text Color:</label>' +
								'<input type="text" id="ffto-colors-marked" class="color" value="' + settings.colors_marked_words + '"/>' +
							'</div>' +
						'</div>' +
						'<div class="fftools-options-body word-counts-tab">' +
							'<div class="ffto-title">Word Counts</div>' +
							'<div class="ffto-sect" id="ffto-sect-word-counts">' +
							
									'<select id="ffto-colour-wordcound-stories">' +
										'<option' + ((!settings.colorWordCount && !settings.colorWordStoryCount) ? ' selected="selected"' : '') + ' value="none">Do not color word counts</option>' +
										'<option' + ((settings.colorWordCount && !settings.colorWordStoryCount) ? ' selected="selected"' : '') + ' value="chapter">Color word counts based on average chapter length</option>' +
										'<option' + (settings.colorWordStoryCount ? ' selected="selected"' : '') + ' value="story">Color word counts based on story length</option>' +
									'</select>' +
								'<table>' +
									'<tr>' +
										'<td><label for="ffto-words-t1"><span style="color: ' + settings.colors_complete + '">Threshold 1:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t1" class="word-counts" value="' + settings.word_count1 + '" size="7"/></td>' +
										'<td><label for="ffto-words-t5"><span style="color: ' + settings.colors_shade4 + '">Threshold 5:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t5" class="word-counts" value="' + settings.word_count5 + '" size="7"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label for="ffto-words-t2"><span style="color: ' + settings.colors_shade1 + '">Threshold 2:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t2" class="word-counts" value="' + settings.word_count2 + '" size="7"/></td>' +
										'<td><label for="ffto-words-t6"><span style="color: ' + settings.colors_shade5 + '">Threshold 6:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t6" class="word-counts" value="' + settings.word_count6 + '" size="7"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label for="ffto-words-t3"><span style="color: ' + settings.colors_shade2 + '">Threshold 3:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t3" class="word-counts" value="' + settings.word_count3 + '" size="7"/></td>' +
										'<td><label for="ffto-words-t7"><span style="color: ' + settings.colors_shade6 + '">Threshold 7:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t7" class="word-counts" value="' + settings.word_count7 + '" size="7" onchange="document.getElementById(\'ffto-words-t8\').value = this.value"/></td>' +
									'</tr>' +
									'<tr>' +
										'<td><label for="ffto-words-t4"><span style="color: ' + settings.colors_shade3 + '">Threshold 4:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t4" class="word-counts" value="' + settings.word_count4 + '" size="7"/></td>' +
										'<td><label for="ffto-words-t8"><span style="color: ' + settings.colors_shade7 + '">Threshold 8:</span></label></td>' +
										'<td><input type="number" id="ffto-words-t8" class="word-counts" value="' + settings.word_count7 + '" size="7" disabled/></td>' +
									'</tr>' +
								'</table>' +
							'</div>' +
						'</div>' +
						'<div class="fftools-options-body misc-tab">' +
							'<div class="ffto-title">Misc.</div>' +
							'<div class="ffto-sect">' +
								'<ul>' +
									'<li><input id="ffto-allow-ctrl-a" type="checkbox"' + (settings.allowCtrlA ? ' checked="checked"' : '') + '/> <label for="ffto-allow-ctrl-a">Allow select all with ctrl-a</label></li>' +
									'<li><input id="ffto-fix-links" type="checkbox"' + (settings.fixLinks ? ' checked="checked"' : '') + '/> <label for="ffto-fix-links">Change fake links to real links</label></li>' +
									'<li><input id="ffto-using-fan-fic-filter" type="checkbox"' + (settings.usingFanFicFilter ? ' checked="checked"' : '') + '/> <label for="ffto-using-fan-fic-filter" style="max-width:450px">Indicates you are using the fanfic filter extension, and to disable filtering and list auto loading with fanfiction tools</label></li>' +
								'</ul>' +
								'<div>' +
									'<label for="ffto-filters-format">Filters format:</label>' +
									'<select id="ffto-filters-format">' +
										'<option' + (settings.filtersFormat === 0 ? ' selected="selected"' : '') + ' value="0">Default</option>' +
										'<option' + (settings.filtersFormat === 1 ? ' selected="selected"' : '') + ' value="1">Always visible (right)</option>' +
										'<option' + (settings.filtersFormat === 2 ? ' selected="selected"' : '') + ' value="2">Always visible (right, don\'t follow)</option>' +
										'<option' + (settings.filtersFormat === 3 ? ' selected="selected"' : '') + ' value="3">Always visible (top)</option>' +
									'</select>' +
								'</div>' +
							'</div>' +
						'</div>' +
					'</div>' +
					'<div id="ffto-menu-footer">' +
						'<div id="ffto-buttons">' +
							'<input type="button" id="ffto-cancel-button" value="Cancel"/>' +
							'<input type="button" id="ffto-reset-button" value="Reset To Default"/>' +
							'<input type="button" id="ffto-save-button" value="Save Changes & Refresh"/>' +
						'</div>' +
						'<div class="ffto-link-to-script">' +
							'<a class="ffto-link-to-script" href="https://addons.mozilla.org/en-US/firefox/addon/fanfiction-tools/" target="_blank">Fanfiction Tools firefox extension by lesma</a>' +
							' based upon ' +
							'<a class="ffto-link-to-script" href="https://greasyfork.org/scripts/3337-fanfiction-tools" target="_blank">Fanfiction Tools by Ewino</a>' +
						'</div>' +
					'</div>' +
				'</div>'));

			$('#ffto-mask').click(features.optionsMenu.hide);
			$('#ffto-menu-close-x').click(features.optionsMenu.hide);
			$('#ffto-cancel-button').click(features.optionsMenu.hide);
			$('#ffto-reset-button').click(features.optionsMenu._resetSettings);
			$('#ffto-save-button').click(features.optionsMenu._setChanges);
			$('#ffto-menu .tabs .main-tab a').click(function() { features.optionsMenu._changeTab('main-tab'); });
			$('#ffto-menu .tabs .colors-tab a').click(function() { features.optionsMenu._changeTab('colors-tab'); });
			$('#ffto-menu .tabs .word-counts-tab a').click(function() { features.optionsMenu._changeTab('word-counts-tab'); });
			$('#ffto-menu .tabs .misc-tab a').click(function() { features.optionsMenu._changeTab('misc-tab'); });
			$('#ffto-using-fan-fic-filter').change(function(){
				if (this.checked === true) {
					$('#ffto-autoload-lists').prop( "disabled", true );
					$('#ffto-blacklisted-words').prop( "disabled", true );
					$('#ffto-view-langs').prop( "disabled", true );
					$('#ffto-low-word-count').prop( "disabled", true );
				} else {
					$('#ffto-autoload-lists').prop( "disabled", false );
					$('#ffto-blacklisted-words').prop( "disabled", false );
					$('#ffto-view-langs').prop( "disabled", false );
					$('#ffto-low-word-count').prop( "disabled", false );
				}
			});
			$('#ffto-using-fan-fic-filter').trigger('change');
		},

		_changeTab: function(tabToActivate) {
			$('.fftools-options-body').hide();
			$('.fftools-options-body.' + tabToActivate).show();
			$('#ffto-menu .tabs li').removeClass('active');
			$('#ffto-menu .tabs li.' + tabToActivate).addClass('active');
		},

		_loadColors: function() {
			$('#ffto-menu INPUT[type=text].color').each(function() {
				var el = $(this);
				el.minicolors({ defaultValue: el.val() });
			});
			features.optionsMenu._loadColors = $.noop;
		},

		/** Opens up the menu. */
		show: function() {
			features.optionsMenu._loadColors();
			features.optionsMenu._changeTab('main-tab');
			$('#ffto-mask').show();
			$('#ffto-menu-wrapper').show();
		},

		/** Hides the menu. */
		hide: function() {
			$('#ffto-mask').hide();
			$('#ffto-menu-wrapper').hide();
		},

		/**
		 * Update the script's settings with the selected values in the menu.
		 * Refreshes the page afterwards to apply the changes.
		 */
		_setChanges: function() {
			settings.colorDate = $('#ffto-color-dates')[0].checked;
			settings.colorComplete = $('#ffto-color-complete')[0].checked;
			settings.dateFormat = utils.parseNum($('#ffto-date-format')[0].value) || 0;
			settings.dateOrder = utils.parseNum($('#ffto-dates-order')[0].value) || 0;
			settings.sep = $('#ffto-date-sep')[0].value;
			settings.fullStoryLoad = ($('#ffto-autoload-stories')[0].value === 'full');
			settings.loadAsYouGo = ($('#ffto-autoload-stories')[0].value === 'chapter');				
			
			settings.showFirstChapterSeparator = ($('#ffto-first-chap-sep')[0].checked);
			settings.usingFanFicFilter = ($('#ffto-using-fan-fic-filter')[0].checked);
			
			settings.loadListsAsYouGo = $('#ffto-autoload-lists')[0].checked;
			settings.markWords = $('#ffto-marked-words')[0].value.split('|');
			settings.combineReview = $('#ffto-combine-reviews-link')[0].checked;
			settings.shouldRelativeDate = $('#ffto-relative-dates')[0].checked;
			settings.showPostingFrequency = $('#ffto-posting-frequency')[0].checked;
			settings.hideChaptersNavigator = $('#ffto-hide-chapters-navigator')[0].checked;
			settings.viewLanguages = $('#ffto-view-langs')[0].value.split('|');
			settings.shortenFavsFollows = $('#ffto-shorten-favs-follows')[0].checked;
			settings.colors_shade1 = $('#ffto-colors-s1').val();
			settings.colors_shade2 = $('#ffto-colors-s2').val();
			settings.colors_shade3 = $('#ffto-colors-s3').val();
			settings.colors_shade4 = $('#ffto-colors-s4').val();
			settings.colors_shade5 = $('#ffto-colors-s5').val();
			settings.colors_shade6 = $('#ffto-colors-s6').val();
			settings.colors_shade7 = $('#ffto-colors-s7').val();
			settings.colors_complete = $('#ffto-colors-complete').val();
			settings.colors_marked_words = $('#ffto-colors-marked').val();
			settings.filtersFormat = utils.parseNum($('#ffto-filters-format')[0].value) || 0;
			
			settings.colorWordStoryCount = ($('#ffto-colour-wordcound-stories')[0].value === 'story');
			settings.colorWordCount = ($('#ffto-colour-wordcound-stories')[0].value === 'chapter');
			
			settings.word_count1 = $('#ffto-words-t1').val();
			settings.word_count2 = $('#ffto-words-t2').val();
			settings.word_count3 = $('#ffto-words-t3').val();
			settings.word_count4 = $('#ffto-words-t4').val();
			settings.word_count5 = $('#ffto-words-t5').val();
			settings.word_count6 = $('#ffto-words-t6').val();
			settings.word_count7 = $('#ffto-words-t7').val();
			settings.allowCtrlA = $('#ffto-allow-ctrl-a')[0].checked;
			settings.fixLinks = $('#ffto-fix-links')[0].checked;
			settings.lowWordCount = $('#ffto-low-word-count').val();
			settings.blacklistedWords = $('#ffto-blacklisted-words')[0].value.split('|');

			// we use a timeout to ensure that we we don't set the settings from a 3rd party script (and therefore at risk).
			// actually GreaseMonkey throws an exception if we don't ensure that :)
			setTimeout(function() {
				features.settings.save();
				location.reload();
				features.optionsMenu.hide();
			}, 0);
		},

		/**
		 * Resets settings to default values
		 */
		_resetSettings: function() {
			if (!confirm("Are you sure you want to reset settings?")) { return; }
			setTimeout(function() {
				features.settings.save(defaultSettings);
				location.reload();
				features.optionsMenu.hide();
			}, 0);
		}

	},

	/***************** Separators *****************/

	/**
	 * Add CSS rules for chapter separators.
	 * This method is only called once and self destructs afterwards.
	 */
	addSeparatorsStyling: function() {
		utils.addStyle(
			'.fftools-chapter-sep { display: block; border-bottom: 1px solid; padding: 0 18px 5px; margin: 50px -15px 20px; font-weight: 100; font-size: 24px; }' +
			'.fftools-chapter-sep .prog-marker {float: right; font-size: 14px; margin-top: 4px;}' +
			'.fftools-end-marker { display: block; border-bottom: 1px solid; border-top: 1px solid; padding: 10px 15px; margin: 50px -15px; ' +
									'font-weight: 100; font-size: 24px; text-align: center }'
			);
		features.addSeparatorsStyling = $.noop;
	},


	/**
	 * Returns an HTML string of a chapter-separator element.
	 * @param chapterNum The number of the chapter (to identify the separator).
	 * @param chapterTitle The optional title of the chapter to view in the separator text. If not given, it fetches the chapter's title itself :)
	 * @return An HTML string.
	 */
	_getChapterSeparator: function(chapterNum, chapterTitle) {
		features.addSeparatorsStyling();
		if (chapterTitle == null) { chapterTitle = utils.chapters.getTitle(chapterNum); }
		var id = 'GEASEMONKEYSEPARATOR' + chapterNum,
			separatorText = 'Chapter ' + chapterNum;
		if (chapterTitle != separatorText) { // We have a chapter title!
			separatorText += ': ' + chapterTitle;
		}
		return '<header id="' + id + '" class="fftools-chapter-sep" data-chapterid="' + chapterNum + '">'
			+ '<div class="prog-marker">(' + chapterNum + '/' + env.totalChapters + ')</div>'
			+ separatorText
			+ '</header>';
	},

	/**
	 * Adds an "End of story"/"To be continued" remark/separator at the end of the story, if the given chapter is the last one.
	 * @param chapterNum The number of chapter being inserted.
	 */
	_addEndOfStorySeparatorIfNeeded: function(chapterNum) {
		var id = 'GEASEMONKEYSEPARATOR_END';
		if (chapterNum >= env.totalChapters && $('#' + id).length === 0) {
			features.addSeparatorsStyling();

			var text = env.isComplete ? 'End of story' : 'To be continued...';

			$('#story-end').after('<footer class="fftools-end-marker" id="' + id + '">' + text + '</footer>');
		}
	}
};

load();
