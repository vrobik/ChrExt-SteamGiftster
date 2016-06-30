var DEV = ( localStorage.dev === "true" ) ? true : false;
var lastRequest = null;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	Log(request);
	Log(sender);
	lastRequest = request;
	if ($("img.nav__sits").length > 0) {
		alert("Please login!");
		$("img.nav__sits").click()
	} else {
		if( $('.nav__button-container--active .nav__notification').length > 0 ){
		//<div class="nav__button-container nav__button-container--notification nav__button-container--active">
		//		<a title="Giveaways Won" class="nav__button" href="/giveaways/won"><i class="fa fa-trophy"></i><div class="nav__notification">1</div></a>
		//	</div>
			chrome.runtime.sendMessage({type: "won_game"});
			setTimeout( alert("WOOOOOON"), 50000 );
		}else{
			if (request.type == "scrape_open") {
				Scrape()
			} else {
				if (request.type == "enter_contest") {
					EnterContest()
				} else {
					if (request.type == "remove_contest") {
						RemoveContest()
					} else {
						if (request.type == "scrape_threads") {
							ScrapeThreads()
						} else {
							if (request.type == "scrape_posts") {
								ScrapePosts()
							}
						}
					}
				}
			}
		}
	}
});
function GetNumeric(inputString) {
	return inputString.replace(/\D/g, "")
}
function GetNumerics(inputString) {
	var results = inputString.split(" ");
	for (var i = 0; i < results.length; ++i) {
		results[i] = results[i].replace(/\D/g, "")
	}
	results = results.filter(function (n) {
		return n
	});
	return results
}
function GetPoints() {
	var numberOfPoints = GetNumeric($(".nav__points").text());
	return parseInt(numberOfPoints)
}
function GetResults() {
	var resultsText = $(".pagination__results").first().text();
	var n = GetNumerics(resultsText);
	return{type: "number_of_contests", first: n[0], last: n[1], total: n[2]}
}
function GetContests() {
	var notContributor = $("div.giveaway__row-outer-wrap").not(":has(div.contributor_only)");
	var groups = $("div.giveaway__row-outer-wrap").has("div.giveaway__column--group");
	var contributorValid = $("div.giveaway__row-outer-wrap").has("div.giveaway__column--contributor-level.giveaway__column--contributor-level--positive");
	var valid = $.merge(notContributor, contributorValid, groups);
	return valid
}
function OpenContest(contest) {
	var contestUrl = contest.find("a").first().attr("href");
	contestUrl = "http://www.steamgifts.com" + contestUrl;
	chrome.runtime.sendMessage({type: "enter_contest", url: contestUrl})
}
function GetTimestamp(offset) {
	return Math.round(new Date().getTime() / 1000) + offset
}
function GetCloseTimestamp(inputString) {
	var multiplier = 1;
	if (inputString.indexOf("minute") !== -1) {
		multiplier *= 60
	} else {
		if (inputString.indexOf("hour") !== -1) {
			multiplier *= 60 * 60
		} else {
			if (inputString.indexOf("day") !== -1) {
				multiplier *= 60 * 60 * 24
			} else {
				if (inputString.indexOf("week") !== -1) {
					multiplier *= 60 * 60 * 24 * 7
				} else {
					if (inputString.indexOf("month") !== -1) {
						multiplier *= 60 * 60 * 24 * 30
					}
				}
			}
		}
	}
	if (inputString.indexOf("ago") !== -1) {
		multiplier *= -1
	}
	return GetTimestamp(GetNumeric(inputString) * multiplier)
}
function Scrape() {
	var scrapeResult = {};
	scrapeResult.results = GetResults();
	var contests = GetContests();
	var contestsArray = [];
	for (var i = 0; i < contests.length; ++i) {
		var contestData = {};
		contestData.url = "http://www.steamgifts.com" + $(contests[i]).find(".giveaway__heading__name").attr("href");
		contestData.title = $(contests[i]).find(".giveaway__heading__name").text();
		contestData.entered = $(contests[i]).find(".giveaway__row-inner-wrap").hasClass("is-faded");
		contestData.cost = parseInt(GetNumeric($(contests[i]).find(".giveaway__heading__thin").last().text()));
		contestData.closes = GetCloseTimestamp($(contests[i]).find(".giveaway__columns div span").first().text());
		contestData.source = "public";
		contestsArray.push(contestData)
	}
	scrapeResult.contests = contestsArray;
	chrome.runtime.sendMessage({type: "scrape_results", data: scrapeResult, points: GetPoints()})
}
function EnterContest() {
	var entryButton = $(".sidebar__entry-insert");
	var entered = 0;
	if (entryButton.text().indexOf("Enter Giveaway") !== -1) {
		Log("Entering!");
		entered = 1;
		entryButton.click();
		chrome.runtime.sendMessage({type: "enter_result", succeeded: entered, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()});
	} else {
		chrome.runtime.sendMessage({type: "enter_result", succeeded: entered, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()})
	}
}
function RemoveContest() {
	var entryButton = $(".sidebar__entry-delete");
	var cancelled = 0;
	if (entryButton.text().indexOf("Remove Entry") !== -1) {
		Log("Removing!");
		cancelled = 1;
		entryButton.click();
			chrome.runtime.sendMessage({type: "remove_result", succeeded: cancelled, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()});
	} else {
		chrome.runtime.sendMessage({type: "remove_result", succeeded: cancelled, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()})
	}
}
function GetThreads() {
	return $(".row")
}
function ScrapeThreads() {
	var threads = GetThreads();
	var results = [];
	for (var i = 0; i < threads.length; ++i) {
		var result = {};
		result.url = "http://www.steamgifts.com" + $(threads[i]).find("div.details div.title a").attr("href");
		if ($(threads[i]).find("div.reply p")) {
			result.lastPost = GetCloseTimestamp($(threads[i]).find("div.reply p").first().text())
		} else {
			result.lastPost = GetCloseTimestamp($(threads[i]).find("div.author p a").last().text())
		}
		results.push(result)
	}
	chrome.runtime.sendMessage({type: "forum_scrape_results", data: results, points: GetPoints()})
}
function ScrapePosts() {
	var giveaways = $('a[href*="/giveaway/"]');
	var results = [];
	for (var i = 0; i < giveaways.length; ++i) {
		var url = $(giveaways[i]).attr("href");
		if (url.indexOf("http://www.steamgifts.com") === -1) {
			url = "http://www.steamgifts.com" + url
		}
		results.push(url)
	}
	chrome.runtime.sendMessage({type: "scrape_posts_results", data: results, points: GetPoints(), results: GetResults(), url: lastRequest.url})
}
function Log(t) {
	if (typeof t == "string") {
		DEV && console.log(new Date().toTimeString() + " " + t)
	} else {
		DEV && console.log(new Date().toTimeString());
		DEV && console.log(t)
	}
}
;