var lastRequest = null;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log(request);
	console.log(sender);
	lastRequest = request;
	if ($("img.login").length > 0) {
		alert("Please login!");
		$("img.login").click()
	} else {
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
	var accountLink = $('a:contains("Account (")').first();
	var numberOfPoints = GetNumeric(accountLink.text());
	return parseInt(numberOfPoints)
}
function GetResults() {
	var resultsText = $("p.results").first().text();
	var n = GetNumerics(resultsText);
	return{type: "number_of_contests", first: n[0], last: n[1], total: n[2]}
}
function GetContests() {
	var notContributor = $("div.post").not(":has(div.contributor_only)");
	var contributorValid = $("div.post").has("div.contributor_only.green");
	var valid = $.merge(notContributor, contributorValid);
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
	var contestsArray = new Array();
	for (var i = 0; i < contests.length; ++i) {
		var contestData = {};
		contestData.url = "http://www.steamgifts.com" + $(contests[i]).find("div.title a").attr("href");
		contestData.title = $(contests[i]).find("div.title a").text();
		contestData.entered = $(contests[i]).hasClass("fade");
		contestData.cost = parseInt(GetNumeric($(contests[i]).find("div.title span").not(".new").first().text()));
		contestData.closes = GetCloseTimestamp($(contests[i]).find("div.time_remaining strong").first().text());
		contestData.source = "public";
		contestsArray.push(contestData)
	}
	scrapeResult.contests = contestsArray;
	chrome.runtime.sendMessage({type: "scrape_results", data: scrapeResult, points: GetPoints()})
}
function EnterContest() {
	var entryButton = $("a.rounded.view").first();
	var entered = 0;
	if (entryButton.text().indexOf("Enter to Win!") !== -1) {
		console.log("Entering!");
		entered = 1;
		$("#form_enter_giveaway").submit(function () {
			chrome.runtime.sendMessage({type: "enter_result", succeeded: entered, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()});
			return true
		});
		$("#form_enter_giveaway").submit()
	} else {
		chrome.runtime.sendMessage({type: "enter_result", succeeded: entered, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()})
	}
}
function RemoveContest() {
	var entryButton = $("a.rounded.remove_entry").first();
	var cancelled = 0;
	if (entryButton.text().indexOf("Remove") !== -1) {
		console.log("Removing!");
		cancelled = 1;
		$("#form_enter_giveaway").submit(function () {
			chrome.runtime.sendMessage({type: "remove_result", succeeded: cancelled, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()});
			return true
		});
		$("#form_enter_giveaway").submit()
	} else {
		chrome.runtime.sendMessage({type: "remove_result", succeeded: cancelled, reason: entryButton.text(), lastRequest: lastRequest, points: GetPoints()})
	}
}
function GetThreads() {
	return $(".row")
}
function ScrapeThreads() {
	var threads = GetThreads();
	var results = new Array();
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
	var results = new Array();
	for (var i = 0; i < giveaways.length; ++i) {
		var url = $(giveaways[i]).attr("href");
		if (url.indexOf("http://www.steamgifts.com") === -1) {
			url = "http://www.steamgifts.com" + url
		}
		results.push(url)
	}
	chrome.runtime.sendMessage({type: "scrape_posts_results", data: results, points: GetPoints(), results: GetResults(), url: lastRequest.url})
}
;