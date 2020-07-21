let tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

let player;
let nextPage;
let videos = [];
const skipBuffer = 200;
let ready = 0;
let playlistIdString;
let playlistIds = [];

let KEY ="@Hy`RxB`0HUfsO/u4rqc2d3M1/QYrECwfj`Ew3j";

// Encryption from codepen # dXMyNQ
function decryptKey(cypherKey) {
  var key = cypherKey.split('');
  key = key.map(function(char) {
    return String.fromCharCode(char.charCodeAt() + 1); // This line is the only thing that changes anything.  
  });
  key = key.join('');
  return key;
}
function encyptKey(plainKey) {
  var key = plainKey.split('');
  key = key.map(function(char) {
    return String.fromCharCode(char.charCodeAt() - 1); // This line is the only thing that changes anything.   
  });
  key = key.join('');
  return key;
}
//end of stolen code

const getPlaylist = async playlistID => {
  const result = await axios.get(
    `https://www.googleapis.com/youtube/v3/playlists`,
    {
      params: {
        part: "snippet",
        id: playlistID,
        key: decryptKey(KEY)
      }
    }
  )
  return result.data;
};

const getPlayListItems = async playlistID => {
  const result = await axios.get(
    `https://www.googleapis.com/youtube/v3/playlistItems`,
    {
      params: {
        part: "id,snippet,status",
        playlistId: playlistID,
        pageToken: nextPage,
        key: decryptKey(KEY)
      }
    }
  );
  nextPage = result.data.nextPageToken;
  return result.data;
};

async function getAllItems(id) {
  let data = await getPlayListItems(id);
  if (!(data.items.length < 50)) {
    await getAllItems(id);
  }
  data.items.forEach(element => {
    videos.push(element.snippet.resourceId.videoId);
  });
}

$('#playlist_input').on('change', function(){
  loadPlaylist();
});


function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


function cueBuffer(id) {
  let buffer = [];
  let index = videos.indexOf(id);
  for (let i = index - skipBuffer / 2; i < index + skipBuffer / 2; i++) {
    if (i >= 0 && i < videos.length) {
      buffer.push(videos[i]);
    }
  }
  player.cuePlaylist(buffer);
  player.playVideoAt(buffer.indexOf(id));
}

async function loadPlaylist() {
  if (!$('#playlist_input').val()){
    return;
  }
  $('#loading').fadeIn("fast");
  playlistIds = $('#playlist_input').val().split(',');
  $.each(playlistIds, function(i, id){
    let regex = id.match(/list=(.*)/);
    if(regex){playlistIds[i] = regex[1]};
    
  });
  let playlistData = await getPlaylist(playlistIds.join(','));
  if (playlistData.items.length < 1){
    showError('No valid playlists found in "'+playlistIds.join(', ')+'"');
    $('#loading').fadeOut("fast");
    return;
  }
  playlistIds = [];
  playlistData.items.forEach(pl => {
    playlistIds.push(pl.id);
  });
  videos = [];
  document.cookie = "playlistId="+playlistIds.join(', ');
  let promises = [];
  for await ( const id of playlistIds){
    promises.push(getAllItems(id));
  }
  await Promise.all(promises);
  // if (Math.random() >= 0.9) {
  //   videos[0] = 'dQw4w9WgXcQ';
  // }
  shuffleArray(videos);
  cueBuffer(videos[0]);
  if (playlistData.items.length > 1) {
    $('#top_info').html('Now playing from multiple playlists.');
    $('#playlists_names_list').empty().show();
    playlistData.items.forEach(pl =>{
      $('#playlists_names_list').append('"'+pl.snippet.title+'" ');
    });
  }
  else {
    $('#playlists_names_list').empty().hide();
    $('#top_info').html('Now playing from "'+playlistData.items[0].snippet.title+'"');
  }
}

let playlistIndex;
let currentId;

function onPlayerStateChange(event) {
  $("#title").html(player.getVideoData().title);
  $("#author").html('by '+player.getVideoData().author);
  $('#loading').hide();

  if (event.data == YT.PlayerState.PLAYING) {
    playlistIndex = event.target.getPlaylistIndex();
    currentId = player.getVideoData().video_id;
  }
  if (event.data == YT.PlayerState.ENDED) {
    if (playlistIndex == player.getPlaylist().length-1){
      if (currentId == videos[videos.length - 1]) { // last song in the list
        shuffleArray(videos);
        cueBuffer(videos[0]);
      }
      else{
        cueBuffer(currentId);
        player.nextVideo()
      }
    }
  }
  if (event.data != YT.PlayerState.PAUSED) {
    player.playVideo();
  }
  if(!$('#player_area').visible){
    $('#player_area').show();
  }
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    height: "450",
    width: "800",
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  $('#loading').fadeOut("fast");
  $('#top_info').fadeIn("fast");
  $('#playlist_input').fadeIn("fast");
  $('#playlist_input').val(getCookie("playlistId"));
  loadPlaylist();
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function showError(errText) {
  $('#err').html(errText);
  $('#err').fadeIn("fast").delay(10000).fadeOut("slow");
}
