var DEV = localStorage.dev === "true";
var existing = null;
var dlc = null;
var priorities = null;
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
		existing = []
	}
	if (dlc) {
		dlc = dlc.split("<!$!>")
	} else {
		dlc = []
	}
	if (priorities) {
		priorities = priorities.split("<!$!>")
	} else {
		priorities = []
	}
	Log(existing);
	Log(dlc);
	Log(priorities);
	var games = [];
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
		var htmlString = "<div class='tr'>" +
							"<span class='th spec" + c + "'>" +
								"<span class='name'>" + games[i].title + "</span>" +
							"</span>" +
							"<span class='td td-first " + c + "'>" +
								"<input type='number' class='priority gameinput' name='priority' value='" + games[i].priority + "'>" +
							"</span>" +
							"<span class='td " + c + "'>" +
								"<input type='checkbox' class='owned gameinput' name='owned' " + (games[i].existing ? "checked" : "") + ">" +
							"</span>" +
							"<span class='td " + c + "'>" +
								"<input type='checkbox' class='dlc gameinput' name='dlc' " + (games[i].dlc ? "checked" : "") + ">" +
							"</span>" +
						"</div>";
		$("#games").append(htmlString)
	}
	var $dev = $("#dev");
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
	$ch = ( bullcrap("dev", DEV) === "true" ) ? true : false;
	$dev.prop('checked', $ch );
	$(".timeinput").change(function () {
		UpdateTime($(this))
	});
	document.getElementsByClassName('storage_upload')[0].disabled = !$ch;
	document.getElementsByClassName('storage_download')[0].disabled = !$ch;
	var $priorities = $("#priorities");
	var $existing = $("#existing");
	var $dlcs = $("#dlcs");
	var $skipPosts = $("#skip_posts");
	$priorities.val(localStorage.priorities);
	$existing.val(localStorage.existing);
	$dlcs.val(localStorage.dlc);
	$skipPosts.val(bullcrap("skip_posts", "http://www.steamgifts.com/forum/5vgHq/faq-site-guidelines-comment-formatting-user-add-ons"));
	$skipPosts.change(function () {
		localStorage.skip_posts = $(this).val()
	});
	$priorities.change(function () {
		localStorage.priorities = $(this).val()
	});
	$existing.change(function () {
		localStorage.existing = $(this).val()
	});
	$dlcs.change(function () {
		localStorage.dlc = $(this).val()
	});
	$dev.change(function () {
		let dev = $(this).is(':checked');
		localStorage.dev = dev;
		DevChange(dev);
	});
	$(".gameinput").change(function () {
		var row = $(this).parent().parent();
		var game = row.find("span.name").text();
		var priority = row.find("input.priority").val();
		var isOwned = row.find("input.owned").is(":checked");
		var isDLC = row.find("input.dlc").is(":checked");
		Log(game + " " + priority + " " + isOwned + " " + isDLC);
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

	$(".clear_id").click(function () {
		chrome.storage.sync.get('user_id',function(e){
			DEV && console.log(e);
		});
		chrome.storage.sync.remove('user_id');
	});
	$(".storage_download").click(function () {
		loadChangesAjax();
	});
	$(".storage_upload").click(function () {
		DEV && console.log('storage clicked');
		chrome.storage.sync.get('user_id',function(e){
			if( JSON.stringify(e)=='{}' ) {
				DEV && console.log('empty');
			}else{
				localStorage.user_id = e.user_id;
			}
			setTimeout( saveChangesAjax(),500);
		});
	});

	$("#usedChars").text(GetLocalStorageUsed());
	$("#usedPercent").text(100 * (GetLocalStorageUsed() / (2.5 * 1024 * 1024)));
}

function saveChangesAjax(){
	var request = $.ajax({
		method: "POST",
		url: "http://worldcup-vrobik.rhcloud.com/sync-set",
		data: { id: 			localStorage.user_id,
			existing: 		localStorage.existing,
			urlstrings: 	localStorage.urlStrings,
			priorities: 	localStorage.priorities,
			dlc: 			localStorage.dlc
		}
	});
	request.done(function( msg ) {
		localStorage.user_id = msg;
		setTimeout( saveChanges(), 1000);
		DEV && console.log('Done id:' + msg);
	});

	request.fail(function( jqXHR, textStatus ) {
		DEV && console.log(jqXHR);
		DEV && console.log( "Request failed: " + textStatus );
	});
}
function loadChangesAjax(){
	var request = $.ajax({
		method: "POST",
		url: "http://worldcup-vrobik.rhcloud.com/sync-get",
		data: { id: localStorage.user_id}
	});
	request.done(function( msg ) {
		msg = JSON.parse( msg );
		localStorage.existing = msg.existing;
		localStorage.urlStrings = msg.urlstrings;
		localStorage.priorities = msg.priorities;
		localStorage.dlc = msg.dlc;
	});

	request.fail(function( jqXHR, textStatus ) {
		DEV && console.log(jqXHR);
		DEV && console.log( "Request failed: " + textStatus );
	});
}

function saveChanges() {
	var theValue = localStorage.user_id;
	if (!theValue) {
		DEV && console.log('Error: No value specified');
		return;
	}
	chrome.storage.sync.set({'user_id': theValue}, function() {
		DEV && console.log('Settings saved');
	});
}
function UpdatePriority(element) {
	var game = $(element).parent().parent().find(".th").first().find("span").text();
	alert(game)
}
function UpdateOwned(element) {
	var game = $(element).parent().parent().find(".th").first().find("span").text();
	alert(game)
}
function UpdateDLC(element) {
	var game = $(element).parent().parent().find(".th").first().find("span").text();
	alert(game)
}
function UpdateTime(element) {
	localStorage[$(element).attr("id")] = $(element).val();
	Log(localStorage[$(element).attr("id")])
}
function GetLocalStorageUsed() {
	charsUsed = 0;
	for (var key in localStorage) {
		charsUsed = charsUsed + (2 * key.length) + (localStorage[key].length * 2)
	}
	return charsUsed
}
function Log(t) {
	if (typeof t == "string") {
		DEV && console.log(new Date().toTimeString() + " " + t)
	} else {
		DEV && console.log(new Date().toTimeString());
		DEV && console.log(t)
	}
}
DevChange = (active) => {
	let upload = document.getElementsByClassName('storage_upload')[0],
		download = document.getElementsByClassName('storage_download')[0];
	if( !active ){
		upload.disabled = true;
		download.disabled = true;
	}else{
		upload.disabled = false;
		download.disabled = false;
	}
};
document.addEventListener("DOMContentLoaded", load_games);