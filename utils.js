/*
Utils for the fanfiction.net page

*/
utils = {
	
	/** Logical XOR */
	XOR: function(a, b) {
		return ( (a && !b) || (!a && b) );
	},

	/** The date right now. */
	now: new Date(),

	/** Returns the hash part of the location */
	getLocationHash: function() {
		return location.hash.substr(1);
	},

	parseNum: function(num) {
		if (typeof(num) === "number") { return num; }

		if (typeof(num) === "string") {
			return Number(num.trim().replace(/,/g, ''));
		}

		return Number(num);
	},

	/**
	 * Adds commas after every 3 digits in the number.
	 * @param num The number to format
	 */
	getReadableNumber: function(num) {
		var str = (num+"").split("."), // stringify the number and split it by dots.
			full = str[0].replace(/(\d)(?=(\d{3})+\b)/g,"$1,"), // adding commas to the part before the dot
			dec = str[1] || ""; // getting the part after the dot, if exists
		return (dec) ? full + '.' + dec : full;
	},

	getLocation: function() {
		var canonical = $('link[rel="canonical"]');
		var url = canonical.length > 0 ? canonical[0].href : document.location();
		return (url || '').replace('//fanfiction.net/', '//www.fanfiction.net/');
	},

	/**
	 * Performs an AJAX request
	 * @param configObj Object an object containing request the information:
	 * @cfg object headers A dictionary of headers to be sent with the request.
	 * @cfg string method The type of method to use in the request. Defaults to GET.
	 * @cfg string url The url to request.
	 * @cfg Function onload The callback to call when the request is done. Passed the response object.
	 */
	httpRequest: function (configObj) {
		if (!configObj.headers) { configObj.headers = {}; }
		configObj.headers['User-Agent'] = 'Mozilla/4.0 (compatible) Greasemonkey';

		var req = new XMLHttpRequest();
		var url = configObj.url;
		if (url.indexOf('http') < 0) {
			url = window.location.origin + url;
		}
		
		req.open(configObj.method || 'GET', url, true);
		req.onreadystatechange = function () {
		  if (req.readyState === 4) {
			configObj.onload(req);
		  }
		};
		req.send(null);
	},

	chapters: {

		/** Returns the current chapter by the page's url. It doesn't use the navigator because there isn't one in single-chapter stories. */
		getCurrent: function() {
			var loc = /(.*\/s\/\d+\/)(\d+)(\/[^#]*)?/i.exec(utils.getLocation());
			return (loc && loc[2]) ? utils.parseNum(loc[2]) : 1;
		},

		/**
		 * Formats a link to a specific chapter.
		 * @param chapterNum The number of the chapter to link to.
		 */
		getLink: function(chapterNum) {
			var loc = /(.*\/s\/\d+\/)(\d+)(\/[^#]*)?/i.exec(utils.getLocation());
			return loc[1] + chapterNum + (loc[3] || '');
		},

		/**
		 * Returns the title of a chapter.
		 * @param chapterNum The number of the chapter to link to.
		 */
		getTitle: function(chapterNum) {
			var navigator = utils.getChapterNavigator();
			if (navigator.length < 1) { return 'Unknown title. No navigation combo-box found'; }
			var children = $(navigator[0]).children('option[value="' + chapterNum + '"]');
			if (children.length < 1) { return 'Unknown title. Chapter not found in navigation combo-box.'; }

			// strip the chapter number from the option text and return it.
			return children[0].text.replace(new RegExp('^' + chapterNum + '\\.\\s*'), '');
		},

		/**
		 * Returns the id of the last chapter of the story (by returning the last option in this page's chapterNavigator.
         * (via getChapterNavigator())
		 */
		getCount: function() {
			var lastChapterEl = utils.getChapterNavigator().first().children('option:last-child');
			if (lastChapterEl.length > 0) { return lastChapterEl[0].value; }
		},

        /**
         * Parse the string to find the navigator and the max chapter.
         * If nothing is found, the last option in this page's chapterNavigator is returned. (via getChapterNavigator())
         * @param htmlString The HTML text to parse for a chapter navigator
         */
        getCountFromHtmlString: function(htmlString) {
            var chapterOptions = htmlString.match(/<SELECT title='chapter navigation'[^>]*>([^\n]+)<\/select>/); // get all options in a "chapter navigation" combo-box.
            if (chapterOptions && chapterOptions.length > 1) {
                var lastOption = chapterOptions[1].match(/.*<option\s+value="?(\d+)"?[^>]*>/); // get the LAST option's value.
                if (lastOption && lastOption.length > 1) {
                    return lastOption[1];
                }
            }

            // If we're here, we failed to parse the HTML string.
            // In which case - let's get the last chapter from our own navigator!
            return utils.chapters.getCount();
        }
	},

	dates: {

		/**
		 * Parses an FF.net formatted date (in the form of mm-dd-yym or a span with a data-xutime) into a JS date.
		 * @param dateString A string representing a date formatted in mm-dd-yy or an html tag text with a data-xutime.
		 * @return A JavaScript date.
		 */
		parseFFDate: function(dateString) {
			if (dateString.match(/.*data-xutime.*/)) {
				// Multiply with 1000 because Unix timestamps are in seconds but date in javascript works with milliseconds. Thanks phelougu!
				timestamp = $(dateString)[0].getAttribute("data-xutime") * 1000;
				return new Date(timestamp);
			} else {
				var parts = dateString.match("([01]?\\d)-([0-3]?\\d)-(\\d\\d)"),
					year = (parts[3] < 50 ? '20' : '19') + parts[3];
				var month, day;
				if (settings.dateFormat === 0) {
					// US format
					month = (parts[1] - 1);
					day = parts[2];
				} else {
					// UK format
					month = (parts[2] - 1);
					day = parts[1];
				}
					
				return new Date(year, month, day, utils.now.getHours(), utils.now.getMinutes(), utils.now.getSeconds());
			}
		},

		/**
		 * Formats a date into the user's specified format (US/UK and its chosen separator).
		 * @param date A JavaScript date.
		 * @return string A date formatted string.
		 */
		formatDate: function(date) {
			if (!date) { return ''; }
            if (settings.dateFormat === 0) { // US format
                return (date.getMonth() + 1) + settings.sep + date.getDate() + settings.sep + date.getFullYear(); // US date format
            } else {
                return date.getDate() + settings.sep + (date.getMonth() + 1) + settings.sep + date.getFullYear(); // UK date format
            }
		},

		/**
		 * Formats a date and colors it by the user's specifications (normal or relative formats).
		 * Also adds a tooltip for extra information if needed.
		 * @param date The date to format.
		 * @param isComplete Whether the story is complete.
		 * @param prefix A string to write before to the formatted date (not prepended if isComplete is true!)
		 * @param avgPostingFrequency A number noting the average number of days between chapters posting.
		 * @return An HTML string of the formatted date.
		 */
		formatDateExtended: function(date, isComplete, prefix, avgPostingFrequency) {
            avgPostingFrequency = avgPostingFrequency || 0;
			var isRelative = settings.shouldRelativeDate,
				isColor = (isComplete && settings.colorComplete) || (!isComplete && settings.colorDate);

			var daysPassed = Math.round((utils.now - date) / 1000/60/60/24),
				relativeDate = this.getRelativeDate(daysPassed),
				strDate = this.formatDate(date);

			if (settings.showPostingFrequency && (new Date() - date) / 1000/60/60/24 < 10 * avgPostingFrequency) {
				relativeDate += ' (' + this.getTextualFrequency(avgPostingFrequency) + ')';
			}

			// if complete, write Complete. otherwise, print the normal or relative date.
			var text = isComplete ? 'Complete' : isRelative ? relativeDate : strDate,
				abbr = '';

			// abbr for non-normal dates is the normally formatted date. for complete with relative date, also add the relative one.
			if (isRelative || isComplete) { abbr = strDate; }
			if (isRelative && isComplete) { abbr += ' - ' + relativeDate; }

			// apply the abbreviation tag if set
			if (abbr) { text = '<abbr title="' + abbr + '">' + text + '</abbr>'; }

			// apply colors if set
			if (isColor) { text = '<span style="color: ' + this.colorDates(daysPassed, isComplete, settings.showPostingFrequency ? avgPostingFrequency : 0) + ';">' + text + '</span>'; }

			// add the prefix if story's not completed.
			if (prefix && !isComplete) { text = prefix + text; }

			return text;
		},


		/**
		 * Returns the color to draw dates in (according to how long ago they occurred)
		 * @param daysPassed How many days passed since the date (indicates the color used).
		 * @param isComplete Whether the story is complete (hence it should get a "completed" color)
		 * @return A CSS color string.
		 */
		colorDates: function(daysPassed, isComplete, avgFrequecy) {
			var completeColor = settings.colors_complete;
			var colors = [
				settings.colors_shade1,
				settings.colors_shade2,
				settings.colors_shade3,
				settings.colors_shade4,
				settings.colors_shade5,
				settings.colors_shade6,
				settings.colors_shade7
			];
			if (isComplete) { return completeColor; }

			// compute the score.
			var score = 0;
			if (avgFrequecy) {
				if (avgFrequecy <= 0.75) { score = 0; }
				else if (avgFrequecy < 14) { score = 1; }
				else if (avgFrequecy < 31) { score = 2; }
				else if (avgFrequecy < 60) { score = 3; }
				else if (avgFrequecy < 90) { score = 4; }
				else if (avgFrequecy < 180) { score = 5; }
				else { score = 6; }
			} else {
				if (daysPassed < 7) { score = 0; }
				else if (daysPassed < 14) { score = 1; }
				else if (daysPassed < 31) { score = 2; }
				else if (daysPassed < 60) { score = 3; }
				else if (daysPassed < 90) { score = 4; }
				else if (daysPassed < 180) { score = 5; }
				else { score = 6; }
			}

			return colors[score];
		},

		/**
		 * Gets a string indicating how much time has passed in English.
		 * @param daysPassed The number of days passed.
		 */
		getRelativeDate: function(daysPassed) {
			switch (daysPassed) {
				case 0:
					return "Today";
				case 1:
					return "Yesterday";
				default:
					return this.getTextualTimespan(daysPassed) + ' ago';
			}
		},

		/**
		 * Gets a string indicating how much time has passed in English.
		 * @param days The number of days passed.
		 */
		getTextualFrequency: function(days) {
			if (days <= 0) {
				return 'infinitely';
			} else if (days < 1.5) {
				return 'daily';
			} else if (days < 2.5) {
				return 'every couple of days';
			} else if (days < 5) {
				return 'twice a week';
			} else if (days < 9) {
				return 'weekly';
			} else if (days < 18) {
				return 'twice a month';
			} else if (days < 36) {
				return 'monthly';
			} else if (days < 72) {
				return 'bimonthly';
			} else {
				return ('every ' + this.getTextualTimespan(days)).replace('every about', 'about every');
			}
		},

		/**
		 * Gets a string indicating the amount of time in English.
		 * @param days The number of days to mark.
		 */
		getTextualTimespan: function(totalDays) {
			var result = '';

			var approximate = false;

			var totalMonths = Math.floor(totalDays / 30);
			var daysInsideMonth = totalDays - (totalMonths * 30);
			if (totalMonths > 0 && daysInsideMonth != 0) {
				if (daysInsideMonth < 6) {
					// it's still the start of the month, round the days down.
					totalDays -= daysInsideMonth;
					approximate = true;
				} else if (daysInsideMonth > 25) {
					// it's the end of the month, round the days up!
					totalDays += (30 - daysInsideMonth);
					totalMonths += 1;
					approximate = true;
				} else {
					// It's valid enough, we'll include the days inside the month.
				}
			}

			var years = Math.floor(totalDays / 365);

			var months = totalMonths - (years * 12);
			if (months > 0) {
				// since months are calculated as always 30 days, it's always an approximate.
				approximate = true;
				if (months <= Math.min(years, 3)) {
					// it's the start of the year, round the months down
					totalDays -= months * 30;
					months = 0;
				} else if (months > 7 + (7 - Math.min(years, 7))) {
					// it's the end of the year, round the months down
					totalDays += (12 - months) * 30;
					months = 0;
					years += 1;
				}
			}

			var weeks = Math.floor(((totalDays % 365) % 30) / 7);
			var days = Math.floor(totalDays % 7);

			if (years > 0) { result += ', ' + years + " year" + (years > 1 ? 's' : ''); }
			if (months > 0) { result += ', ' + months + " month" + (months > 1 ? 's' : ''); }
			if (years == 0 && weeks > 0) { result += ', ' + weeks + " week" + (weeks > 1 ? 's' : ''); }
			if (years == 0 && months == 0 && days  > 0) { result += ', ' + days + " day" + (days  > 1 ? 's' : ''); }
			// remove the heading comma
			result = result.substr(2);

			if (approximate) result = 'about ' + result;
			return result;
		}
	},

	infoBar: {

		/** The element used for signalling ajax operations */
		bar: null,

		/**
		 * Shows the loading bar with the specified text in it.
		 * @param text The text to show in the bar.
		 */
		setText: function(text) {
			if (!this.bar) { utils.infoBar._init(); }
			this.bar.innerHTML = text;
			this.bar.style.display = 'block';
		},

		/** Hides the loading bar. */
		hide: function() {
			if (!this.bar) { return; } // nothing to hide if it weren't initialized.
			this.bar.style.display = 'none';
		},

		/** Returns whether the bar is initialized and shown. */
		isShown: function() {
			if (!this.bar) { return false; } // if the bar wasn't initialized, it's practically hidden :)
			return (this.bar.style.display !== 'none');
		},

		/** Initializes the loading bar. */
		_init: function() {
			if (this.bar) { return; }
			this.bar = document.createElement('div');
			this.bar.innerHTML = '-- Loading --';
			var style = utils.infoBar.bar.style;
			style.position = 'fixed';
			style.left = '0px';
			style.right = '0px';
			style.bottom = '0px';
			style.backgroundColor = 'black';
			style.border="3px solid red";
			style.color = 'white';
			style.padding = '4px';
			style.textAlign = 'center';
			style.display = 'none';
			document.body.appendChild(this.bar);
		}
	},

	pos: {

		/**
		 * Returns the distance to the bottom of the page or element,
		 * divided by screen height.
		 * This is useful when we want something to happen when the
		 * user is getting close to the end of the page or element.
		 * @param el The element to measure the length of. Defaults to the body
		 */
		getScreenfullsLeft: function(el) {
			if (!el) el = env.w.document.body;
			var distance = this._getElementBottom(el) - this._screenBottom();
			return distance / this._screenHeight();
		},

		getRelativeHeight: function(el) {
			return el.offsetTop - this._screenOffset();
		},

		_getElementBottom: function(el) {
			return el.offsetTop + el.scrollHeight;
		},

		_bodyLength: function() {
			return env.w.document.body.scrollHeight;
		},

		_screenBottom: function() {
			return env.w.pageYOffset + this._screenHeight();
		},

		_screenOffset: function() {
			return env.w.pageYOffset;
		},

		_screenHeight: function() {
			return env.w.innerHeight;
		}
	},

	/**
	 * Marks the specified words in the text in a red color and returns the formatted text.
	 * This is not a simple replace function since we don't want to perform replaces for words inside HTML tags and attributes
	 * (since marking these will break the HTML and the rest of the marking). i.e. we don't want to mark <a href="/s/123/WordToMark_bla_bla">
	 * @param text The text to mark the words in.
	 * @param wordsToMark An array of words to mark in the text.
	 * @return The text with the specified words marked in coloring tags.
	 */
	markWords: function(text, wordsToMark) {
		var prefix = '</span><span style="color: ' + settings.colors_marked_words + ';">', suffix = '</span><span>';
		for (var i = 0; i < wordsToMark.length; ++i)
		{
			var lcaseWord = wordsToMark[i].toLowerCase(),
				wordLength = lcaseWord.length;

			if (lcaseWord.trim() === '') { continue; } // apparently, trying to mark an empty string crashes Firefox. go figure :)

			var index = text.toLowerCase().indexOf(lcaseWord);

			while (index > -1) {
				var foundWord = text.substr(index, wordLength), // the word that was found (we need it to keep the found word's case)
					textBefore = text.substr(0, index); // the text from the start of the text till the start of the word.

				if (textBefore.split('<').length <= textBefore.split('>').length) { // if we're not in a middle of a tag (we have more or same amount of closing brackets than starting brackets)
					text = textBefore + prefix + foundWord + suffix + text.substr(index + wordLength); // perform the replace.
				}
				index = text.toLowerCase().indexOf(lcaseWord, index + prefix.length + wordLength + suffix.length);
			}
		}
		
		text = '<span>' + text + '</span>';

		return text;
	},

	/** Hides the chapter navigation box (chapter combo box) at the end of a story page. */
	getChapterNavigator: function() {
		var result = $('select[title="Chapter Navigation"]');
		utils.getChapterNavigator = function() { return result; }; // cache the navigator
		return result;
	},

	getWordCountColor: function(wordsPerChapter) {
		var score = 0;
		var colors = [
			settings.colors_complete,
			settings.colors_shade1,
			settings.colors_shade2,
			settings.colors_shade3,
			settings.colors_shade4,
			settings.colors_shade5,
			settings.colors_shade6,
			settings.colors_shade7
		];
		if (wordsPerChapter >= settings.word_count1) { score = 0; }
		else if (wordsPerChapter >= settings.word_count2) { score = 1; }
		else if (wordsPerChapter >= settings.word_count3) { score = 2; }
		else if (wordsPerChapter >= settings.word_count4) { score = 3; }
		else if (wordsPerChapter >= settings.word_count5) { score = 4; }
		else if (wordsPerChapter >= settings.word_count6) { score = 5; }
		else if (wordsPerChapter >= settings.word_count7) { score = 6; }
		else { score = 7; }
		return colors[score];
	},
	
	/**
	* Adds CSS styles to the page
	*/
	addStyle(css) {
		var div = $("<div />", {
		html: '&shy;<style>' + css + '</style>'
	  }).children().appendTo("body");   
	},
	
	/**
	*	Gets a value from local storage
	*/
	getOptionValue(name, defaultValue) {
		var value = JSON.parse(localStorage.getItem(name));
		
		if(value !== null && (typeof value !== "undefined") ) {
			return value;
		} else {
			return defaultValue;
		}
	},
	
	/** 
	* Sets an option in the local settings
	*/
	setOptionValue(name, value){
		localStorage.setItem(name, JSON.stringify(value));
	},
	
	parseHTML(rawHTML) {
		// Using Dom parser as a content script does not have access to nsIParserUtils
		var parser = new DOMParser();
		var doc = parser.parseFromString(rawHTML, "text/html");
		return doc.body.innerHTML;
	}
};