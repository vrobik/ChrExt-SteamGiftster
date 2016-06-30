var existing = null;
var dlc = null;
var priorities = null;
function save_options() {
	var select = document.getElementById("maxWords");
	var maxWords = select.children[select.selectedIndex].value;
	localStorage.maxWords = maxWords;
	var status = document.getElementById("status");
	status.innerHTML = "Options Saved.";
	setTimeout(function () {
		status.innerHTML = ""
	}, 750)
}
function bullcrap(key, val) {
	var result = localStorage[key];
	if (!result) {
		localStorage[key] = val;
		result = val
	}
	return result
}
function load_games() {
	existing = localStorage.existing;
	dlc = localStorage.dlc;
	priorities = localStorage.priorities;
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
	console.log(existing);
	console.log(dlc);
	console.log(priorities);
	var games = new Array();
	for (var i = 0; i < priorities.length; i += 2) {
		var game = {title: priorities[i], priority: priorities[i + 1]};
		game.existing = existing.indexOf(game.title) !== -1;
		game.dlc = dlc.indexOf(game.title) !== -1;
		games.push(game)
	}
	games = games.sort(function (a, b) {
		if ((a.existing) && !(b.existing)) {
			return 1
		} else {
			if ((b.existing) && !(a.existing)) {
				return -1
			}
		}
		if (a.priority != b.priority) {
			return b.priority - a.priority
		}
		return a.title.localeCompare(b.title)
	});
	for (var i = 0; i < games.length; ++i) {
		var c = i % 2 == 0 ? "" : "alt";
		var htmlString = "<tr><th class='spec" + c + "'><span class='name'>" + games[i].title + "</span></th><td class='" + c + "'><center><input type='number' class='priority gameinput' name='priority' value='" + games[i].priority + "'></center></td><td class='" + c + "'><center><input type='checkbox' class='owned gameinput' name='owned' " + (games[i].existing ? "checked" : "") + "></center></td><td class='" + c + "'><center><input type='checkbox' class='dlc gameinput' name='dlc' " + (games[i].dlc ? "checked" : "") + "></center></td></tr>";
		$("#games").append(htmlString)
	}
	$("#page_seconds_min").val(bullcrap("page_seconds_min", 4));
	$("#page_seconds_max").val(bullcrap("page_seconds_max", 10));
	$("#contest_seconds_min").val(bullcrap("contest_seconds_min", 2));
	$("#contest_seconds_max").val(bullcrap("contest_seconds_max", 3));
	$("#forum_seconds_min").val(bullcrap("forum_seconds_min", 4));
	$("#forum_seconds_max").val(bullcrap("forum_seconds_max", 10));
	$("#exec_minutes_min").val(bullcrap("exec_minutes_min", 35));
	$("#exec_minutes_max").val(bullcrap("exec_minutes_max", 60));
	$("#sleep_begin").val(bullcrap("sleep_begin", "00:01"));
	$("#sleep_end").val(bullcrap("sleep_end", "00:02"));
	$("#forum_post_age").val(bullcrap("forum_post_age", 1));
	$(".timeinput").change(function () {
		UpdateTime($(this))
	});
	$("#priorities").val(localStorage.priorities);
	$("#skip_posts").val(bullcrap("skip_posts", "http://www.steamgifts.com/forum/5vgHq/faq-site-guidelines-comment-formatting-user-add-ons"));
	$("#skip_posts").change(function () {
		localStorage.skip_posts = $(this).val()
	});
	$("#priorities").change(function () {
		localStorage.priorities = $(this).val()
	});
	$(".gameinput").change(function () {
		console.log(this);
		var row = $(this).parent().parent().parent();
		var game = row.find("span.name").text();
		var priority = row.find("input.priority").val();
		var isOwned = row.find("input.owned").is(":checked");
		var isDLC = row.find("input.dlc").is(":checked");
		console.log(game + " " + priority + " " + isOwned + " " + isDLC);
		var ownedIndex = existing.indexOf(game);
		var dlcIndex = dlc.indexOf(game);
		var priorityIndex = priorities.indexOf(game);
		priorities[priorityIndex + 1] = priority;
		if (isOwned && ownedIndex === -1) {
			existing.push(game)
		} else {
			if (!isOwned && ownedIndex !== -1) {
				existing.splice(ownedIndex, 1)
			}
		}
		if (isDLC && dlcIndex === -1) {
			dlc.push(game)
		} else {
			if (!isDLC && dlcIndex !== -1) {
				dlc.splice(dlcIndex, 1)
			}
		}
		localStorage.priorities = priorities.join("<!$!>");
		localStorage.existing = existing.join("<!$!>");
		localStorage.dlc = dlc.join("<!$!>")
	});
	$(".clearurlstrings").click(function () {
		localStorage.urlStrings = ""
	});
	$(".cleardlc").click(function () {
		localStorage.dlc = "";
		location.reload()
	});
	$("#usedChars").text(GetLocalStorageUsed());
	$("#usedPercent").text(100 * (GetLocalStorageUsed() / (2.5 * 1024 * 1024)));
	var sheet = document.styleSheets[0];
	sheet.insertRule("th {#CAE8EA url(" + chrome.extension.getURL("bg_header.jpg") + ") no-repeat}");
	sheet.insertRule('th.spec {background", "#fff url(' + chrome.extension.getURL("bullet1.gif") + ") no-repeat}");
	sheet.insertRule('th.specalt {background", "#f5fafa url(' + chrome.extension.getURL("bullet2.gif") + ") no-repeat}")
}
function UpdatePriority(element) {
	var game = $(element).parent().parent().find("th").first().find("span").text();
	alert(game)
}
function UpdateOwned(element) {
	var game = $(element).parent().parent().find("th").first().find("span").text();
	alert(game)
}
function UpdateDLC(element) {
	var game = $(element).parent().parent().find("th").first().find("span").text();
	alert(game)
}
function UpdateTime(element) {
	localStorage[$(element).attr("id")] = $(element).val();
	console.log(localStorage[$(element).attr("id")])
}
function GetLocalStorageUsed() {
	charsUsed = 0;
	for (var key in localStorage) {
		charsUsed = charsUsed + (2 * key.length) + (localStorage[key].length * 2)
	}
	return charsUsed
}
document.addEventListener("DOMContentLoaded", load_games);