var idsToActions = {};
var contests = new Array();
var page = 1;
var tabIds = new Array();
var existing = new Array();
var dlc = new Array();
var priorities = new Array();
var urlStrings = new Array();
var blackFont = new Image();
var whiteFont = new Image();
var actionQueue = new Array();
var maxQueueSize = 0;
blackFont.src = "font_black.png";
whiteFont.src = "font_white.png";
var refreshInterval = null;
var tId = null;
var wId = null;
var iconCanvas = document.createElement("canvas");
iconCanvas.setAttribute("width", 19);
iconCanvas.setAttribute("height", 19);
var iconContext = iconCanvas.getContext("2d");
var iconImage = new Image();
iconImage.src = "icon.png";
var running = false;
var points = 0;
var retryCount = 0;
var tabUrls = {};
function StopRunning() {
	RevertIcon();
	UpdateIconDisplay();
	clearTimeout(nextThingTimeout);
	ClearAnInterval("Terminating", refreshInterval);
	for (var i = 0; i < tabIds.length; ++i) {
		chrome.tabs.remove(tabIds[i])
	}
	running = false
}
chrome.browserAction.onClicked.addListener(function () {
	if (!running) {
		iconContext.clearRect(0, 0, 19, 19);
		InitializeStarfield();
		UpdateProgressBar(0, 10);
		UpdateCountdown(0);
		UpdateEntered();
		UpdatePoints();
		UpdateIconDisplay();
		running = true;
		maxQueueSize = 0;
		Scrape()
	} else {
		StopRunning()
	}
});
function RevertIcon() {
	iconContext.drawImage(iconImage, 0, 0, 19, 19)
}
function GetTimestamp(offset) {
	return Math.round(new Date().getTime() / 1000) + offset
}
function bullcrap(key, val) {
	var result = localStorage[key];
	if (!result) {
		localStorage[key] = val;
		result = val
	}
	return result
}
function IsAsleep() {
	var startSleep = bullcrap("sleep_begin", "00:01");
	var endSleep = bullcrap("sleep_end", "00:02");
	startSleep = parseInt(startSleep.replace(":", ""));
	endSleep = parseInt(endSleep.replace(":", ""));
	var d = new Date();
	var currentTime = (d.getHours() * 100) + d.getMinutes();
	var sleeping = false;
	if (startSleep < endSleep) {
		sleeping = currentTime >= startSleep && currentTime < endSleep
	} else {
		sleeping = currentTime >= startSleep || currentTime < endSleep
	}
	return sleeping
}
function GetMillisecondsUntilWakeup() {
	var d = new Date();
	var currentTime = parseInt((d.getHours() * 100) + d.getMinutes());
	var endSleep = bullcrap("sleep_end", "18:00");
	var endParts = endSleep.split(":");
	var result = 0;
	if (parseInt(endSleep.replace(":", "")) > currentTime) {
		var hourDiff = parseInt(endParts[0]) - d.getHours();
		var minuteDiff = parseInt(endParts[1]) - d.getMinutes();
		result = (hourDiff * 1000 * 60 * 60) + (minuteDiff * 1000 * 60)
	} else {
		var hourDiff = (24 - d.getHours()) + parseInt(endParts[0]);
		var minuteDiff = parseInt(endParts[1]) - d.getMinutes();
		result = (hourDiff * 1000 * 60 * 60) + (minuteDiff * 1000 * 60)
	}
	return result
}
var starfield = new Array();
var starfieldCenter = {x: 9.5, y: 6};
function InitializeStarfield() {
	starfield = new Array();
	for (var i = 0; i < 20; ++i) {
		var x = Math.random() * 19;
		var y = Math.random() * 14;
		var d = Math.sqrt(Math.pow(x - starfieldCenter.x, 2) + Math.pow(y - starfieldCenter.y, 2));
		var xV = ((x - starfieldCenter.x) / d) / (Math.random() * 5 + 5);
		var yV = ((y - starfieldCenter.y) / d) / (Math.random() * 5 + 5);
		starfield.push({x: x, y: y, xv: xV, yv: yV, b: 0})
	}
}
function DrawStarfield() {
	iconContext.fillStyle = "#000000";
	iconContext.fillRect(0, 0, 19, 19);
	for (var i = 0; i < starfield.length; ++i) {
		iconContext.fillStyle = "rgba(" + starfield[i].b + "," + starfield[i].b + "," + starfield[i].b + ",255)";
		iconContext.fillRect(starfield[i].x - starfield[i].s / 2, starfield[i].y - starfield[i].s / 2, starfield[i].s, starfield[i].s)
	}
}
function UpdateStarfield() {
	for (var i = 0; i < starfield.length; ++i) {
		var xD = starfield[i].x - starfieldCenter.x;
		var yD = starfield[i].y - starfieldCenter.y;
		var d = Math.sqrt((xD * xD) + (yD * yD));
		starfield[i].x = starfield[i].x + ((d + 0.1) * starfield[i].xv);
		starfield[i].y = starfield[i].y + ((d + 0.1) * starfield[i].yv);
		if (starfield[i].x < -1 || starfield[i].x > 20 || starfield[i].y < -1 || starfield[i].y > 20) {
			starfield[i].x = starfieldCenter.x;
			starfield[i].y = starfieldCenter.y;
			var a = Math.random() * 2 * Math.PI;
			starfield[i].xv = Math.sin(a) / (Math.random() * 5 + 5);
			starfield[i].yv = Math.cos(a) / (Math.random() * 5 + 5);
			starfield[i].b = 0
		} else {
			var n = d / 13.435;
			starfield[i].b = Math.floor(n * 256) * 2
		}
		starfield[i].s = (starfield[i].b / 256) * 2;
		starfield[i].b = 255
	}
}
function UpdatePoints() {
	iconContext.fillStyle = "#FFFFFF";
	iconContext.fillRect(0, 4, 19, 8);
	var current = GetTimestamp(0);
	var arrayCopy = contests.slice(0);
	var myPoints = 0;
	for (var i = 0; i < arrayCopy.length; ++i) {
		if (arrayCopy[i].closes > current && arrayCopy[i].entered) {
			myPoints += arrayCopy[i].cost
		}
	}
	var stringed = myPoints.toString();
	DrawNumber(19 - (stringed.length * 3), 5, blackFont, myPoints)
}
function UpdateActivity() {
	var current = GetTimestamp(0);
	var EntriesPerHour = new Array();
	var ContestsPerHour = new Array();
	var arrayCopy = contests.slice(0);
	for (var i = 0; i < 19; ++i) {
		EntriesPerHour[i] = 0;
		ContestsPerHour[i] = 0
	}
	arrayCopy.sort(function (a, b) {
		return b.closes - a.closes
	});
	for (var i = 0; i < arrayCopy.length; ++i) {
		if (arrayCopy[i].closes > current) {
			var j = Math.floor((arrayCopy[i].closes - current) / (60 * 60));
			if (isNaN(j)) {
				Log(arrayCopy[i].closes);
				Log(current)
			}
			if (j < 19) {
				if (arrayCopy[i].entered) {
					EntriesPerHour[j]++
				}
				ContestsPerHour[j]++
			}
		}
	}
	iconContext.fillStyle = "#000000";
	iconContext.fillRect(0, 4, 19, 8);
	var maxEntered = EntriesPerHour[0];
	var maxContests = ContestsPerHour[0];
	for (var i = 1; i < 19; ++i) {
		var maxEntered = Math.max(maxEntered, EntriesPerHour[i]);
		var maxContests = Math.max(maxContests, ContestsPerHour[i])
	}
	if (maxContests == 0) {
		return
	}
	iconContext.lineWidth = 1;
	iconContext.lineCap = "butt";
	for (var i = 0; i < 19; ++i) {
		if (ContestsPerHour[i] > 0) {
			iconContext.strokeStyle = i % 2 == 0 ? "rgba(0,0,255,255)" : "rgba(0,0,128,255)";
			iconContext.beginPath();
			iconContext.moveTo(i + 0.5, 11.5);
			iconContext.lineTo(i + 0.5, 11.5 - Math.floor((ContestsPerHour[i] / maxContests) * 8));
			iconContext.stroke()
		}
		if (EntriesPerHour[i] > 0) {
			iconContext.strokeStyle = i % 2 == 0 ? "rgba(0,128,0,128)" : "rgba(0,255,0,128)";
			iconContext.beginPath();
			iconContext.moveTo(i + 0.5, 11.5);
			iconContext.lineTo(i + 0.5, 11.5 - Math.floor((EntriesPerHour[i] / maxEntered) * 8));
			iconContext.stroke()
		}
	}
}
function UpdateEntered() {
	var current = GetTimestamp(0);
	iconContext.fillStyle = "#808080";
	iconContext.fillRect(0, 12, 10, 7);
	iconContext.fillStyle = "#000000";
	iconContext.fillRect(0, 13, 9, 6);
	var count = 0;
	for (var i = 0; i < contests.length; ++i) {
		if (contests[i].entered && contests[i].closes > current) {
			count++
		}
	}
	var stringed = count.toString();
	DrawNumber(10 - (stringed.length * 3), 12, whiteFont, count)
}
function UpdateIconDisplay() {
	var imageData = iconContext.getImageData(0, 0, 19, 19);
	chrome.browserAction.setIcon({imageData: imageData})
}
function UpdateProgressBar(current, maximum) {
	var progress = current / maximum;
	iconContext.fillStyle = "#000000";
	iconContext.fillRect(0, 0, 19, 4);
	iconContext.fillStyle = "#008000";
	iconContext.fillRect(1, 1, progress * 17, 2);
	iconContext.fillStyle = "#00FF00";
	iconContext.fillRect(1, 2, progress * 17, 1)
}
function UpdateCountdown(n) {
	iconContext.fillStyle = "#808080";
	iconContext.fillRect(9, 12, 10, 7);
	iconContext.fillStyle = "#FFFFFF";
	iconContext.fillRect(10, 13, 9, 8);
	var stringed = n.toString();
	DrawNumber(19 - (stringed.length * 3), 12, blackFont, n)
}
function DrawNumber(x, y, font, value) {
	var stringed = value.toString();
	for (var i = 0; i < stringed.length; ++i) {
		var j = parseInt(stringed[i]);
		iconContext.drawImage(font, 3 * j, 0, 3, 7, x + (3 * i), y, 3, 7)
	}
}
function Scrape() {
	if (!wId) {
		chrome.windows.create({url: chrome.extension.getURL("about.html")}, function (w) {
			wId = w.id
		})
	}
	tabIds = new Array();
	existing = localStorage.existing;
	dlc = localStorage.dlc;
	priorities = localStorage.priorities;
	urlStrings = localStorage.urlStrings;
	if (existing) {
		existing = existing.split("<!$!>")
	} else {
		existing = new Array()
	}
	if (dlc) {
		dlc = dlc.split("<!$!>")
	} else {
		dlc = new Array()
	}
	if (priorities) {
		priorities = priorities.split("<!$!>")
	} else {
		priorities = new Array()
	}
	if (urlStrings) {
		urlStrings = urlStrings.split("<!$!>")
	} else {
		urlStrings = new Array()
	}
	page = 1;
	forumPage = 1;
	actionQueue = new Array();
	actionQueue.push({action: "scrape_open"});
	actionQueue.push({action: "enter_contests"});
	ProcessActionQueue()
}
function EnterSteamgifts(tab) {
	Scrape()
}
var nextThingToDo = null;
var timeUntilNextThing = 0;
var nextThingTimeout = null;
function DelayAndThenDoThing(m, n) {
	timeUntilNextThing = Math.floor(m + (Math.random() * (n - m)));
	if (timeUntilNextThing < 1000 * 60) {
		UpdateCountdown(Math.floor(timeUntilNextThing / 1000));
		UpdateIconDisplay();
		nextThingTimeout = setTimeout(CheckDelayAndDoThing, 1000)
	} else {
		UpdateCountdown(Math.floor(timeUntilNextThing / (60 * 1000)));
		UpdateIconDisplay();
		nextThingTimeout = setTimeout(CheckDelayAndDoThing, 1000 * 60)
	}
}
function CheckDelayAndDoThing() {
	var sleeping = IsAsleep();
	if (sleeping) {
		ClearAnInterval("Going to sleep", refreshInterval);
		nextThingToDo = Scrape;
		for (var i = 0; i < tabIds.length; ++i) {
			chrome.tabs.remove(tabIds[i])
		}
		tabIds = new Array();
		UpdateStarfield();
		DrawStarfield();
		timeUntilNextThing = GetMillisecondsUntilWakeup()
	}
	if (timeUntilNextThing < 1000 * 60) {
		if (!sleeping) {
			timeUntilNextThing -= 1000
		}
		UpdateCountdown(Math.floor(timeUntilNextThing / 1000));
		UpdateIconDisplay()
	} else {
		if (!sleeping) {
			timeUntilNextThing -= (1000 * 60)
		}
		UpdateCountdown(Math.floor(timeUntilNextThing / (1000 * 60)));
		UpdateIconDisplay()
	}
	if (Math.floor(timeUntilNextThing / 1000) <= 0) {
		UpdateCountdown(0);
		UpdateIconDisplay();
		nextThingToDo()
	} else {
		if (timeUntilNextThing < 1000 * 60) {
			nextThingTimeout = setTimeout(CheckDelayAndDoThing, 1000)
		} else {
			nextThingTimeout = setTimeout(CheckDelayAndDoThing, 1000 * 60)
		}
	}
}
function MessageHandler(request, sender, sendResponse) {
	if (!running) {
		return
	}
	delete idsToActions[sender.tab.id];
	if (request.type == "scrape_posts_results") {
		HandleScrapedPosts(request, sender)
	} else {
		if (request.type == "forum_scrape_results") {
			ScrapeForumThreads(request, sender)
		} else {
			if (request.type == "scrape_results") {
				UpdateProgressBar(request.data.results.last, request.data.results.total);
				UpdateIconDisplay();
				ClearAnInterval("Got message with scrape results", refreshInterval);
				contests = contests.concat(request.data.contests);
				contests = contests.filter(function (elm, i, arr) {
					for (var j = i + 1; j < arr.length; ++j) {
						if (arr[j].url === elm.url) {
							return false
						}
					}
					return true
				});
				UpdateEntered();
				UpdatePoints();
				UpdateIconDisplay();
				if (request.data.results.last != request.data.results.total) {
					nextThingToDo = function () {
						++page;
						chrome.tabs.update(sender.tab.id, {url: "http://www.steamgifts.com/open/page/" + page});
						idsToActions[sender.tab.id] = {type: "scrape_open"};
						ReloadUntilResult(sender.tab.id)
					};
					DelayAndThenDoThing(bullcrap("page_seconds_min", 4) * 1000, bullcrap("page_seconds_max", 10) * 1000)
				} else {
					for (var i = 0; i < contests.length; ++i) {
						var pIndex = priorities.indexOf(contests[i].title);
						var numEntries = 0;
						for (var j = 0; j < contests.length; ++j) {
							if (contests[i].title == contests[j].title && contests[j].entered) {
								numEntries++
							}
						}
						if (pIndex === -1) {
							priorities.push(contests[i].title);
							priorities.push(numEntries);
							contests[i].priority = numEntries
						} else {
							contests[i].priority = priorities[pIndex + 1]
						}
						var uIndex = urlStrings.indexOf(contests[i].title);
						if (uIndex === -1) {
							urlStrings.push(contests[i].title);
							var urlString = contests[i].url.substring(contests[i].url.lastIndexOf("/") + 1);
							urlStrings.push(urlString)
						}
					}
					localStorage.priorities = priorities.join("<!$!>");
					localStorage.urlStrings = urlStrings.join("<!$!>");
					points = request.points;
					ProcessActionQueue()
				}
			} else {
				if (request.type == "enter_result") {
					ClearAnInterval("got enter result", refreshInterval);
					setTimeout(function () {
						chrome.tabs.remove(sender.tab.id);
						delete idsToActions[sender.tab.id]
					}, 1000);
					if (request.succeeded !== 1) {
						if (request.lastRequest.title != "Unknown") {
							if (request.reason.indexOf("Exists") > -1 || request.reason.indexOf("Missing") > -1) {
								if (request.reason.indexOf("Exists") !== -1) {
									if (existing.indexOf(request.lastRequest.title) === -1) {
										existing.push(request.lastRequest.title);
										localStorage.existing = existing.join("<!$!>")
									}
								}
								if (request.reason.indexOf("Missing") !== -1) {
									if (dlc.indexOf(request.lastRequest.title) === -1) {
										dlc.push(request.lastRequest.title);
										localStorage.dlc = dlc.join("<!$!>")
									}
								}
							}
						}
						points = request.points
					} else {
						for (var i = 0; i < contests.length; ++i) {
							if (contests[i].url == request.lastRequest.url) {
								contests[i].entered = true
							}
						}
						points = request.points - request.lastRequest.cost
					}
					ProcessActionQueue()
				} else {
					if (request.type == "remove_result") {
						ClearAnInterval("got remove result", refreshInterval);
						setTimeout(function () {
							chrome.tabs.remove(sender.tab.id);
							delete idsToActions[sender.tab.id]
						}, 1000);
						if (request.succeeded !== 1) {
							points = request.points;
							contests = contests.filter(function (elm, i, arr) {
								return elm.url !== request.lastRequest.url
							})
						} else {
							for (var i = 0; i < contests.length; ++i) {
								if (contests[i].url == request.lastRequest.url) {
									contests[i].entered = false
								}
							}
							points = request.points + request.lastRequest.cost
						}
						ProcessActionQueue()
					}
				}
			}
		}
	}
}
chrome.runtime.onMessage.addListener(MessageHandler);
function EnterContest(contestToEnter) {
	nextThingToDo = function () {
		chrome.tabs.create({windowId: wId, url: contestToEnter.url, index: 9999, active: false}, function (newTab) {
			idsToActions[newTab.id] = {type: "enter_contest", title: contestToEnter.title, cost: contestToEnter.cost};
			tabIds.push(newTab.id);
			ReloadUntilResult(newTab.id)
		})
	};
	DelayAndThenDoThing(bullcrap("contest_seconds_min", 2) * 1000, bullcrap("contest_seconds_max", 3) * 1000)
}
function RemoveContest(contestToRemove) {
	nextThingToDo = function () {
		chrome.tabs.create({windowId: wId, url: contestToRemove.url, index: 9999, active: false}, function (newTab) {
			idsToActions[newTab.id] = {type: "remove_contest", title: contestToRemove.title, cost: contestToRemove.cost, url: contestToRemove.url};
			tabIds.push(newTab.id);
			ReloadUntilResult(newTab.id)
		})
	};
	DelayAndThenDoThing(bullcrap("contest_seconds_min", 2) * 1000, bullcrap("contest_seconds_max", 3) * 1000)
}
function ProcessActionQueue() {
	var doingSomething = false;
	while (actionQueue.length > 0 && !doingSomething) {
		maxQueueSize = Math.max(maxQueueSize, actionQueue.length);
		var thing = actionQueue.shift();
		if (thing.action == "enter") {
			if (!contests[thing.index].entered && dlc.indexOf(thing.contest.title) === -1 && existing.indexOf(thing.contest.title) === -1) {
				if (thing.contest.cost <= points) {
					Log("Entering " + thing.contest.title + " for " + thing.contest.cost + " from " + thing.contest.source + "(" + thing.contest.priority + ")");
					EnterContest(thing.contest);
					doingSomething = true
				} else {
					for (var i = contests.length - 1; i > thing.index; --i) {
						if (contests[i].entered && (contests[i].priority < thing.contest.priority || contests[i].priority == 0)) {
							actionQueue.splice(0, 0, thing);
							actionQueue.splice(0, 0, {contest: contests[i], index: i, action: "remove"});
							break
						}
					}
				}
			}
		} else {
			if (thing.action == "remove") {
				Log("Removing " + thing.contest.title + " for " + thing.contest.cost + " from " + thing.contest.source + "(" + thing.contest.priority + ")");
				RemoveContest(thing.contest);
				doingSomething = true
			} else {
				if (thing.action == "scrape_posts") {
					ScrapePosts(thing.url);
					doingSomething = true
				} else {
					if (thing.action == "scrape_forums") {
						doingSomething = true;
						chrome.tabs.create({windowId: wId, url: "http://www.steamgifts.com/forum/page/1", index: 9999, active: false}, function (newTab) {
							idsToActions[newTab.id] = {type: "scrape_threads"};
							tabIds.push(newTab.id);
							ReloadUntilResult(newTab.id)
						})
					} else {
						if (thing.action == "scrape_open") {
							doingSomething = true;
							chrome.tabs.create({windowId: wId, url: "http://www.steamgifts.com/open/page/1", index: 9999, active: false}, function (newTab) {
								idsToActions[newTab.id] = {type: "scrape_open"};
								tabIds.push(newTab.id);
								ReloadUntilResult(newTab.id)
							})
						} else {
							if (thing.action == "register_forum_contests") {
								contestUrls = contestUrls.filter(function (elm) {
									for (var i = 0; i < contests.length; ++i) {
										if (contests[i].url.indexOf(elm.url) !== -1) {
											Log("Contest from forums is public!");
											return false
										}
									}
									return true
								});
								for (var i = 0; i < contestUrls.length; ++i) {
									var contest = {};
									contest.url = contestUrls[i];
									contest.source = "forum";
									var uIndex = urlStrings.indexOf(contest.url.substring(contest.url.lastIndexOf("/") + 1));
									if (uIndex === -1) {
										contest.title = "Unknown"
									} else {
										contest.title = urlStrings[uIndex - 1]
									}
									contest.cost = 60;
									for (var j = 0; j < contests.length; ++j) {
										if (contests[j].title == contest.title) {
											contest.cost = contests[j].cost
										}
									}
									contest.priority = 1;
									var pIndex = priorities.indexOf(contest.title);
									if (pIndex !== -1) {
										contest.priority = priorities[pIndex + 1]
									}
									contest.priority++;
									contest.closes = GetTimestamp(0);
									contest.entered = false;
									if (contest.priority !== 0) {
										contests.push(contest)
									}
								}
							} else {
								if (thing.action == "enter_contests") {
									contests = contests.filter(function (elm, i, arr) {
										for (var j = i + 1; j < arr.length; ++j) {
											if (arr[j].url === elm.url) {
												return false
											}
										}
										return elm.url.indexOf("http://www.steamgifts.com/giveaway/") === 0
									});
									contests.sort(function (a, b) {
										if (a.priority != b.priority) {
											return b.priority - a.priority
										}
										if (a.priority != 0) {
											return a.closes - b.closes
										}
										return b.closes - a.closes
									});
									for (var i = 0; i < contests.length; ++i) {
										actionQueue.push({contest: contests[i], index: i, action: "enter"})
									}
								}
							}
						}
					}
				}
			}
		}
	}
	UpdateProgressBar(maxQueueSize - actionQueue.length, maxQueueSize);
	UpdateEntered();
	UpdatePoints();
	UpdateIconDisplay();
	if (!doingSomething && actionQueue.length == 0) {
		UpdateEntered();
		UpdateIconDisplay();
		UpdateProgressBar(1, 1);
		for (var i = 0; i < tabIds.length; ++i) {
			chrome.tabs.remove(tabIds[i])
		}
		nextThingToDo = Scrape;
		DelayAndThenDoThing(bullcrap("exec_minutes_min", 35) * 1000 * 60, bullcrap("exec_minutes_max", 60) * 1000 * 60)
	}
}
chrome.tabs.onUpdated.addListener(function (tabId, info) {
	if (info.hasOwnProperty("url")) {
		tabUrls[tabId] = info.url
	} else {
		if (!tabUrls.hasOwnProperty(tabId)) {
			tabUrls[tabId] = "www.steamgifts.com"
		}
	}
	if (info.status == "complete") {
		if (idsToActions.hasOwnProperty(tabId)) {
			chrome.tabs.sendMessage(tabId, idsToActions[tabId])
		} else {
		}
	}
});
chrome.windows.onRemoved.addListener(function (windowId) {
	if (windowId == wId) {
		StopRunning();
		wId = null
	}
});
chrome.tabs.onRemoved.addListener(function (tabId, info) {
	var t = tabIds.indexOf(tabId);
	if (t !== -1) {
		tabIds.splice(t, 1)
	}
	if (idsToActions.hasOwnProperty(tabId)) {
		delete idsToActions[tabId]
	}
});
var forumThreads = new Array();
var forumPage = 1;
function ScrapeForumThreads(request, sender) {
	ClearAnInterval("Got forum threads?", refreshInterval);
	var oldestCaredAbout = GetTimestamp(60 * 60 * bullcrap("forum_post_age", 1) * -1);
	var oldest = GetTimestamp(0);
	forumThreads = forumThreads.concat(request.data);
	forumThreads = forumThreads.filter(function (elm, i, arr) {
		for (var j = i + 1; j < arr.length; ++j) {
			if (arr[j].url === elm.url) {
				return false
			}
		}
		var valid = bullcrap("skip_posts", "http://www.steamgifts.com/forum/5vgHq/faq-site-guidelines-comment-formatting-user-add-ons").indexOf(elm.url) === -1;
		if (!valid) {
			Log(elm.url + " in skip list")
		}
		return valid
	});
	for (var i = 0; i < forumThreads.length; ++i) {
		oldest = Math.min(oldest, forumThreads[i].lastPost)
	}
	if (oldest > oldestCaredAbout) {
		nextThingToDo = function () {
			++forumPage;
			chrome.tabs.update(sender.tab.id, {url: "http://www.steamgifts.com/forum/page/" + forumPage});
			idsToActions[sender.tab.id] = {type: "scrape_threads"};
			ReloadUntilResult(sender.tab.id)
		};
		DelayAndThenDoThing(bullcrap("page_seconds_min", 4) * 1000, bullcrap("page_seconds_max", 10) * 1000)
	} else {
		forumThreads = forumThreads.filter(function (elm) {
			return elm.lastPost >= oldestCaredAbout
		});
		for (var i = 0; i < forumThreads.length; ++i) {
			actionQueue.splice(0, 0, {action: "scrape_posts", url: forumThreads[i].url})
		}
		ProcessActionQueue()
	}
}
var postsPage = 1;
function ScrapePosts(url) {
	postsPage = 1;
	nextThingToDo = function () {
		chrome.tabs.create({windowId: wId, url: url, index: 9999, active: false}, function (newTab) {
			idsToActions[newTab.id] = {type: "scrape_posts", url: url};
			tabIds.push(newTab.id);
			ReloadUntilResult(newTab.id)
		})
	};
	DelayAndThenDoThing(bullcrap("forum_seconds_min", 4) * 1000, bullcrap("forum_seconds_max", 10) * 1000)
}
var contestUrls = new Array();
function HandleScrapedPosts(request, sender) {
	ClearAnInterval("Got scraped posts?", refreshInterval);
	contestUrls = contestUrls.concat(request.data);
	if (request.results.last != request.results.total) {
		nextThingToDo = function () {
			++postsPage;
			chrome.tabs.update(sender.tab.id, {url: request.url + "/page/" + postsPage});
			idsToActions[sender.tab.id] = {type: "scrape_posts", url: request.url};
			ReloadUntilResult(sender.tab.id)
		};
		DelayAndThenDoThing(bullcrap("forum_seconds_min", 4) * 1000, bullcrap("forum_seconds_max", 10) * 1000)
	} else {
		setTimeout(function () {
			chrome.tabs.remove(sender.tab.id);
			delete idsToActions[sender.tab.id]
		}, 1000);
		ProcessActionQueue()
	}
}
function IfTabDoesNotExist(id, func) {
	chrome.tabs.get(id, function (tab) {
		if (!tab) {
			func()
		}
	})
}
function HarshExit() {
	Log("Catastropic exit!  User meddling!  Unacceptable!");
	if (wId) {
		chrome.windows.remove(wId)
	}
	wId = null;
	StopRunning()
}
function SetAnInterval(fn, t) {
	return setInterval(fn, t)
}
function ClearAnInterval(reason, interval) {
	clearInterval(interval);
	interval = null
}
function Reload(t) {
	chrome.tabs.reload(t)
}
function ReloadUntilResult(t) {
	retryCount = 0;
	refreshInterval = SetAnInterval(function () {
		try {
			if (tabUrls.hasOwnProperty(t) && tabUrls[t].indexOf("steamgifts.com") !== -1) {
				Log("Reloading tab with url " + tabUrls[t]);
				Reload(t);
				++retryCount
			}
			IfTabDoesNotExist(t, HarshExit)
		} catch (err) {
			ClearAnInterval(err, refreshInterval);
			throw err
		}
	}, 10000)
}
function Log(t) {
	if (typeof t == "string") {
		console.log(new Date().toTimeString() + " " + t)
	} else {
		console.log(new Date().toTimeString());
		console.log(t)
	}
}
;