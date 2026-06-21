/**
 * BrazucaPlay - Provider Nuvio para conteúdo
 * Usando provedores globais com suporte a português
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Connection': 'keep-alive'
};

const TMDB_API_KEY = 'd131017ccc6e5462a81c9304d21476de';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Novos Servidores de Embed que suportam TMDB
const SERVERS = [
  {
    name: 'VidSrc',
    url: 'https://vidsrc.me/embed/{mediaType}?tmdb={tmdbId}{seasonEpisode}',
    language: 'Multi'
  },
  {
    name: 'SmashyStream',
    url: 'https://embed.smashystream.com/playere.php?tmdb={tmdbId}',
    language: 'Multi'
  },
  {
    name: 'AutoEmbed',
    url: 'https://autoembed.to/{mediaType}/tmdb/{tmdbId}{seasonEpisode2}',
    language: 'Multi'
  }
];

function requestRaw(method, urlString, options) {
  return fetch(urlString, {
    method: method,
    headers: (options && options.headers) || {},
    body: (options && options.body) || undefined
  }).then(function(response) {
    return response.text().then(function(body) {
      if (response.ok) {
        return { status: response.status, headers: response.headers, body: body };
      } else {
        throw new Error('HTTP ' + response.status + ': ' + body);
      }
    });
  });
}

function getJson(url) {
  return requestRaw('GET', url, { headers: HEADERS }).then(function(res) {
    try {
      return JSON.parse(res.body);
    } catch (e) {
      throw new Error('Invalid JSON from GET ' + url + ': ' + e.message);
    }
  });
}

function fetchMovieDetails(tmdbId) {
  var url = TMDB_BASE_URL + '/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';
  return getJson(url).then(function(data) {
    return {
      id: data.id,
      title: data.title,
      year: data.release_date ? data.release_date.split('-')[0] : '',
      imdbId: (data.external_ids && data.external_ids.imdb_id) ? data.external_ids.imdb_id : '',
      mediaType: 'movie'
    };
  });
}

function fetchTvDetails(tmdbId) {
  var url = TMDB_BASE_URL + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';
  return getJson(url).then(function(data) {
    return {
      id: data.id,
      title: data.name,
      year: data.first_air_date ? data.first_air_date.split('-')[0] : '',
      imdbId: (data.external_ids && data.external_ids.imdb_id) ? data.external_ids.imdb_id : '',
      mediaType: 'tv'
    };
  });
}

function fetchMediaDetails(tmdbId, mediaType) {
  if (mediaType === 'movie') return fetchMovieDetails(tmdbId);
  if (mediaType === 'tv') return fetchTvDetails(tmdbId);
  return fetchMovieDetails(tmdbId).catch(function() { return fetchTvDetails(tmdbId); });
}

function formatServerUrl(server, mediaDetails, seasonNum, episodeNum) {
  var url = server.url
    .replace('{mediaType}', mediaDetails.mediaType)
    .replace('{tmdbId}', mediaDetails.id);
  
  if (mediaDetails.mediaType === 'tv' && seasonNum && episodeNum) {
    url = url.replace('{seasonEpisode}', '&season=' + seasonNum + '&episode=' + episodeNum);
    url = url.replace('{seasonEpisode2}', '-' + seasonNum + '-' + episodeNum);
  } else {
    url = url.replace('{seasonEpisode}', '');
    url = url.replace('{seasonEpisode2}', '');
  }
  return url;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise(function(resolve) {
    fetchMediaDetails(tmdbId, mediaType)
      .then(function(mediaDetails) {
        var streams = [];
        SERVERS.forEach(function(server) {
          var embedUrl = formatServerUrl(server, mediaDetails, seasonNum, episodeNum);
          streams.push({
            name: 'BrazucaPlay ' + server.name + ' (' + server.language + ')',
            title: mediaDetails.title + ' (' + mediaDetails.year + ')',
            url: embedUrl,
            quality: 'Auto',
            size: 'Unknown',
            headers: HEADERS,
            provider: 'brazucaplay'
          });
        });
        resolve(streams);
      })
      .catch(function() { resolve([]); });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
