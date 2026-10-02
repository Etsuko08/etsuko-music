import os
import sys
import json
import time
import urllib.parse
import urllib.request
import threading
import socket
import requests

# Force IPv4 across all socket operations in python (urllib, requests, socket.create_connection)
# to eliminate 21-second Windows IPv6 handshake timeouts on networks without IPv6 routes
orig_getaddrinfo = socket.getaddrinfo
def getaddrinfo_ipv4(host, port, family=0, type=0, proto=0, flags=0):
    try:
        res = orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        if res:
            return res
    except Exception:
        pass
    return orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = getaddrinfo_ipv4

try:
    import urllib3.util.connection
    urllib3.util.connection.allowed_gai_family = lambda: socket.AF_INET
except Exception:
    pass

# Ensure UTF-8 output on Windows consoles to prevent charmap errors
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from bottle import Bottle, request, response, static_file, HTTPResponse, BaseRequest
from ytmusicapi import YTMusic
from . import db

# Allow up to 50MB request payloads so users can pick local image files as avatars
BaseRequest.MEMFILE_MAX = 50 * 1024 * 1024

app = Bottle()

# In-memory cache for stream URLs to keep playback snappy
CACHE_EXPIRY = 1800  # 30 mins
STREAM_CACHE = {}

APP_VERSION = "69.5"
UPDATE_BEACON_URL = "https://raw.githubusercontent.com/Etsuko08/etsuko-music/main/version.json"

DOWNLOADS_DIR = os.path.join(os.path.expanduser("~"), ".etsuko", "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

try:
    ytmusic = YTMusic()
except Exception as e:
    print(f"[Etsuko] Warning initializing YTMusic: {e}")
    ytmusic = None

def get_yt_dlp_opts():
    opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio/best',
        'quiet': True,
        'no_warnings': True,
        'noplaylist': True,
        'extract_flat': False,
        'skip_download': True,
        'socket_timeout': 8,
        'retries': 2,
        'source_address': '0.0.0.0',
    }
    opts['js_runtimes'] = {'node': {}}
    return opts

def resolve_audio_stream(video_id, force=False):
    now = time.time()
    if not force and video_id in STREAM_CACHE:
        url, exp = STREAM_CACHE[video_id]
        if now < exp:
            return url

    url = f"https://www.youtube.com/watch?v={video_id}"
    import yt_dlp
    ydl_opts = get_yt_dlp_opts()
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info.get('url')
            if not stream_url and 'formats' in info:
                audio_formats = [f for f in info['formats'] if f.get('acodec') != 'none' and f.get('vcodec') == 'none']
                if audio_formats:
                    audio_formats.sort(key=lambda x: x.get('abr') or 0, reverse=True)
                    stream_url = audio_formats[0].get('url')
                else:
                    stream_url = info['formats'][-1].get('url')
            
            if stream_url:
                STREAM_CACHE[video_id] = (stream_url, now + CACHE_EXPIRY)
                return stream_url
    except Exception as e:
        print(f"[Etsuko] Error resolving stream for {video_id}: {e}")
    return None

def clean_thumbnail(thumbnails, video_id=None):
    if not thumbnails:
        return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg" if video_id else "assets/default_cover.png"
    url = thumbnails[-1]['url']
    if "=" in url:
        url = url.split("=")[0] + "=w544-h544-l90-rj"
    elif "hq720.jpg" in url:
        if video_id:
            url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        else:
            url = url.replace("hq720.jpg", "hqdefault.jpg")
    return url

# Verified high-res 1:1 square hits for zero-delay startup with zero letterboxing
DEFAULT_TRENDING = [
    {"videoId": "J7p4bzqLvCw", "title": "Blinding Lights", "artist": "The Weeknd", "duration": "3:22", "thumbnail": "https://yt3.googleusercontent.com/R_cjQK3wwLPEzri1jerx-79zgzGocoKvwGU3NMONaTsaMM0Idd641pfB8r5jgfpn6I8JAoFtf9RBIcI=w544-h544-l90-rj"},
    {"videoId": "3_g2un5M350", "title": "Starboy (feat. Daft Punk)", "artist": "The Weeknd", "duration": "3:51", "thumbnail": "https://yt3.googleusercontent.com/dcxXIIlest09vnvKznWM9VWQXu1EL7lKxBzXGzwgmVjmMNBm1dEWT_0qn1xrEZYyKF_qRE1TLq8P_JY_mQ=w544-h544-l90-rj"},
    {"videoId": "xIQpLlYC8xA", "title": "Houdini", "artist": "Eminem", "duration": "3:48", "thumbnail": "https://yt3.googleusercontent.com/Xx3dX1EJDirqwpfQL05uAgmKGYpzTcFDXjjHqjNpIhgY5MWTJRLSlOjaYVtup2Ku6gBYEqXoxw5aGKC3=w544-h544-l90-rj"},
    {"videoId": "kIft-LUHHVA", "title": "Espresso", "artist": "Sabrina Carpenter", "duration": "2:56", "thumbnail": "https://yt3.googleusercontent.com/bTWlZSenrOAYgH4r6NAzyDraWQR_wLl3OuRexJ_8h3NZUVHEilRSzUmKNa9YMOFSVcF0YtOuzKdXrt2UHg=w544-h544-l90-rj"},
    {"videoId": "WKZO-CWeOVA", "title": "BIRDS OF A FEATHER", "artist": "Billie Eilish", "duration": "3:31", "thumbnail": "https://yt3.googleusercontent.com/mXJjWX4E6Gpr03CUYl18PdVXlczmoL2Tm-LEBGafIr_8smlHnl8AHniJu0_7Y80e-aeloJxcryQQx0ZJ=w544-h544-l90-rj"},
    {"videoId": "phLb_SoPBlA", "title": "Not Like Us", "artist": "Kendrick Lamar", "duration": "4:35", "thumbnail": "https://yt3.googleusercontent.com/8qk3C_zpd2FXHVN8BpMBFL6h9J5BlKlbcKOlvDMvIgBWBsAblDoTjU98RGbFH9DxtnN1X5zRzc9sSvWr=w544-h544-l90-rj"},
    {"videoId": "4EQkYVtE-28", "title": "Circles", "artist": "Post Malone", "duration": "3:36", "thumbnail": "https://yt3.googleusercontent.com/YoQ-A-GOpgeE8tgdF3Rcf5z9V8NIIKjLH6_7X3QphIQUwVHioLu7Ik2wQzU0oCkyNm1TeLDLDYvomJ8=w544-h544-l90-rj"},
    {"videoId": "OsfAnsMY21M", "title": "Levitating", "artist": "Dua Lipa", "duration": "3:24", "thumbnail": "https://yt3.googleusercontent.com/UpJ_IhBqyhQV9b2UGcDxxWDm14kRQ2eY1o9S96AGsbE7Ol8isbpbPA0Yefvg8S8ZGAX9L1g4xaj21zVJ=w544-h544-l90-rj"},
    {"videoId": "DlFXDl_ROAM", "title": "Die With A Smile", "artist": "Lady Gaga, Bruno Mars", "duration": "4:12", "thumbnail": "https://yt3.googleusercontent.com/RFK4wHeGqwI3DndbARbRJB21IC0TcmqnrlyjxYK7T-nC8wlIVbfxNaCIFKNvSpchDKmYyVLe1RN36w=w544-h544-l90-rj"},
    {"videoId": "2nR1zrNzgcY", "title": "FE!N (feat. Playboi Carti)", "artist": "Travis Scott", "duration": "3:12", "thumbnail": "https://yt3.googleusercontent.com/eBvJuWpjg0Mx8DBa5WIhCzEopXyMnxkjWSU895BDGjTpNeqrliLrv3zGqNNuCUoXL1EkEAr5VQ3cx2pW=w544-h544-l90-rj"},
    {"videoId": "aHmg0jsmNhg", "title": "vampire", "artist": "Olivia Rodrigo", "duration": "3:40", "thumbnail": "https://yt3.googleusercontent.com/F32A1XBuQEkcOnYin-1BURG2MK_q12Ebovqwe8im8KXf8BHJ_jXW_7NnK73K6QOH-1D6QZKrrZGbNrlS=w544-h544-l90-rj"},
    {"videoId": "aC9HkZW2hZk", "title": "Cruel Summer", "artist": "Taylor Swift", "duration": "2:59", "thumbnail": "https://yt3.googleusercontent.com/OhxDTHQOQzSrcdgH9hzqzp1v22GYDE-QKnkryvCeq4ddx-3K3_c8oDXN0E6NvHlMn1q4XV59aHr0oL4f=w544-h544-l90-rj"},
    {"videoId": "AdEKgwUqPKI", "title": "Kill Bill", "artist": "SZA", "duration": "2:34", "thumbnail": "https://yt3.googleusercontent.com/tw5VGXEsehs9OpwnpbubqGp_3Pq9so7QShdyJSlCpXeI2mLRvqRqLNbA7EC4zcNWrFE0_lj9HxpZ23v6=w544-h544-l90-rj"},
    {"videoId": "FrsOnNxIrg8", "title": "God's Plan", "artist": "Drake", "duration": "3:19", "thumbnail": "https://yt3.googleusercontent.com/9Oe4acEXgmAlCKgcgI6JlSXi2Tj30u6anzvfGBrunGO-fLhBTgzy-ei1ugPJpZDD5ArKFod9H4RTA5g0=w544-h544-l90-rj"},
    {"videoId": "_GWKkqNoyEA", "title": "Counting Stars", "artist": "OneRepublic", "duration": "4:18", "thumbnail": "https://yt3.googleusercontent.com/m2pZLjozMvQBj21LgvAIslVPP-T2xQlxbxCTJ98vpPN8HZ0fgR-wisJQ2IzrKS2yLTAYBjs0TpOYnIY=w544-h544-l90-rj"},
    {"videoId": "9ssQKlLxBdQ", "title": "Thunder", "artist": "Imagine Dragons", "duration": "3:08", "thumbnail": "https://yt3.googleusercontent.com/weYQWfEwWNPOuAm34geXN1LkSYPlsJay78NnQgHC3PKsyZcdvBHIsMtqoFh3rioA4XgMdHMQd3h6vH6mbA=w544-h544-l90-rj"},
    {"videoId": "BSTsnWoslP4", "title": "Bohemian Rhapsody", "artist": "Queen", "duration": "5:55", "thumbnail": "https://yt3.googleusercontent.com/nLn1gxvYiZqzXOY9HyUXVXbFtmR5nhY8sDpbvBT1aw-Ejjsz__Nz90sZoc4nZgff2sf8WjowuVRVBlBTww=w544-h544-l90-rj"},
    {"videoId": "4D7u5KF7SP8", "title": "Get Lucky (feat. Pharrell Williams and Nile Rodgers)", "artist": "Daft Punk, Pharrell Williams, Nile Rodgers", "duration": "6:10", "thumbnail": "https://yt3.googleusercontent.com/N55arCGj69gtw6thXK8JUPisxoVYiwuIEQ7I6SGlkEyNcSJ7xIWPe76Vuu1SiUqRyx5w9qvR_zV8fV3CWQ=w544-h544-l90-rj"},
    {"videoId": "2NiyrtYegso", "title": "Wake Me Up", "artist": "Avicii", "duration": "4:08", "thumbnail": "https://yt3.googleusercontent.com/XincHWEjkXhpbavoQEHWRbTcVdvHsujjr7OAw-73KUCILFgjLdevPW8vkoaRMibnwkTtGWkEDyKbuNeK=w544-h544-l90-rj"},
    {"videoId": "pqrUQrAcfo4", "title": "Do I Wanna Know?", "artist": "Arctic Monkeys", "duration": "4:33", "thumbnail": "https://yt3.googleusercontent.com/7a03Ybk8vbe8c4dl4E8l77Y4e9aEWjQvTfOAdLdXxsnjZ57gYQ8FsKra9SgXAHT-jtiwuq6lukCfbRKL=w544-h544-l90-rj"}
]

# Enable CORS for all routes
@app.hook('after_request')
def enable_cors():
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, Range'

@app.route('/api/search', method=['GET', 'OPTIONS'])
def search_tracks():
    if request.method == 'OPTIONS':
        return {}
    query = request.query.get('q', '').strip()
    filter_type = request.query.get('filter', 'songs')
    if not query:
        return {"results": []}

    results = []
    # 1. Primary search with YTMusic
    if ytmusic:
        try:
            raw_results = ytmusic.search(query, filter=filter_type, limit=25)
            # If specific filter returned nothing, try without filter
            if not raw_results and filter_type == 'songs':
                raw_results = ytmusic.search(query, limit=25)

            seen_keys = set()
            for r in raw_results:
                result_type = r.get('resultType', filter_type)
                if filter_type == 'songs' or result_type in ('song', 'video'):
                    video_id = r.get('videoId')
                    if not video_id:
                        continue
                    title = r.get('title', 'Unknown Title')
                    artists = ", ".join([a['name'] for a in r.get('artists', [{'name': 'Unknown'}])])
                    norm_key = (title.lower().strip(), artists.lower().strip())
                    if norm_key in seen_keys:
                        continue
                    seen_keys.add(norm_key)

                    album = r.get('album', {}).get('name', '') if r.get('album') else ''
                    results.append({
                        "videoId": video_id,
                        "title": title,
                        "artist": artists,
                        "album": album,
                        "duration": r.get('duration', '3:30'),
                        "thumbnail": clean_thumbnail(r.get('thumbnails', []), video_id),
                        "isLiked": db.is_liked(video_id)
                    })
                elif filter_type == 'albums' or result_type == 'album':
                    bid = r.get('browseId')
                    if not bid or bid in seen_keys:
                        continue
                    seen_keys.add(bid)
                    results.append({
                        "type": "album",
                        "browseId": bid,
                        "title": r.get('title', 'Unknown Album'),
                        "artist": ", ".join([a['name'] for a in r.get('artists', [{'name': 'Unknown'}])]),
                        "year": r.get('year', ''),
                        "thumbnail": clean_thumbnail(r.get('thumbnails', []))
                    })
                elif filter_type == 'artists' or result_type == 'artist':
                    bid = r.get('browseId')
                    if not bid or bid in seen_keys:
                        continue
                    seen_keys.add(bid)
                    results.append({
                        "type": "artist",
                        "browseId": bid,
                        "name": r.get('artist', r.get('name', 'Unknown Artist')),
                        "subscribers": r.get('subscribers', ''),
                        "thumbnail": clean_thumbnail(r.get('thumbnails', []))
                    })
        except Exception as e:
            print(f"[Etsuko] YTMusic search error: {e}")

    # 2. Fallback to yt-dlp search if results empty and filter is songs
    if not results and filter_type == 'songs':
        try:
            import yt_dlp
            ydl_opts = {
                'format': 'bestaudio/best',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': 'in_playlist',
                'skip_download': True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch15:{query} song audio", download=False)
                for entry in info.get('entries', []):
                    vid = entry.get('id')
                    if not vid:
                        continue
                    dur_secs = entry.get('duration') or 200
                    # Ignore non-music compilations (>15 min) or sound effects (<20s)
                    if dur_secs > 900 or dur_secs < 20:
                        continue
                    m, s = divmod(dur_secs, 60)
                    thumbs = entry.get('thumbnails', [])
                    thumb_url = clean_thumbnail(thumbs, vid)
                    results.append({
                        "videoId": vid,
                        "title": entry.get('title', 'Unknown Title'),
                        "artist": entry.get('uploader', 'Unknown Artist'),
                        "album": "",
                        "duration": f"{m}:{s:02d}",
                        "thumbnail": thumb_url,
                        "isLiked": db.is_liked(vid)
                    })
        except Exception as e:
            print(f"[Etsuko] yt-dlp fallback search error: {e}")

    return {"results": results}

HOME_CACHE = {"trending": [], "expires": 0}

def fetch_live_trending_async():
    try:
        raw_songs = ytmusic.search('Top 50 Global Hits', filter='songs', limit=25)
        parsed = []
        for item in raw_songs:
            video_id = item.get('videoId')
            if not video_id:
                continue
            artists = ", ".join([a['name'] for a in item.get('artists', [{'name': 'Unknown'}])])
            parsed.append({
                "videoId": video_id,
                "title": item.get('title', 'Unknown Track'),
                "artist": artists,
                "duration": item.get('duration', '3:30'),
                "thumbnail": clean_thumbnail(item.get('thumbnails', [])),
                "isLiked": db.is_liked(video_id)
            })
        if parsed:
            HOME_CACHE["trending"] = parsed
            HOME_CACHE["expires"] = time.time() + 1800
    except Exception as e:
        print(f"[Etsuko] Live trending fetch error: {e}")

@app.route('/api/home', method=['GET'])
def get_home_feed():
    now = time.time()
    
    if HOME_CACHE["trending"] and now < HOME_CACHE["expires"]:
        trending_tracks = HOME_CACHE["trending"]
    else:
        # Instant 0.001s response with verified default hits
        trending_tracks = [{**t, "isLiked": db.is_liked(t["videoId"])} for t in DEFAULT_TRENDING]
        # Refresh in background without blocking startup
        if now >= HOME_CACHE["expires"]:
            HOME_CACHE["expires"] = now + 600  # Avoid multiple spawns
            threading.Thread(target=fetch_live_trending_async, daemon=True).start()

    categories = [
        {"id": "pop", "name": "Pop Hits", "query": "Pop Hits", "color": "#a855f7", "colorEnd": "#581c87", "image": "assets/genres/pop.jpg", "sub": "Global Chart Toppers"},
        {"id": "hiphop", "name": "Hip-Hop & Rap", "query": "Hip Hop Hits", "color": "#d97706", "colorEnd": "#78350f", "image": "assets/genres/hiphop.jpg", "sub": "Beats, Bars & Traps"},
        {"id": "lofi", "name": "Lo-Fi Beats", "query": "Lo-Fi Chill Beats", "color": "#0ea5e9", "colorEnd": "#0c4a6e", "image": "assets/genres/lofi.jpg", "sub": "Deep Chill & Study"},
        {"id": "rock", "name": "Rock Classics", "query": "Rock Classics", "color": "#ef4444", "colorEnd": "#7f1d1d", "image": "assets/genres/rock.jpg", "sub": "Riffs & Heavy Anthems"},
        {"id": "electronic", "name": "EDM & Dance", "query": "EDM Dance Hits", "color": "#06b6d4", "colorEnd": "#164e63", "image": "assets/genres/edm.jpg", "sub": "Club Drops & Synths"},
        {"id": "anime", "name": "Anime & J-Pop", "query": "Anime Openings", "color": "#f43f5e", "colorEnd": "#881337", "image": "assets/genres/anime.jpg", "sub": "OSTs & J-Rock Energy"},
        {"id": "gaming", "name": "Gaming Soundtrack", "query": "Gaming Soundtrack", "color": "#8b5cf6", "colorEnd": "#3b0764", "image": "assets/genres/gaming.jpg", "sub": "Cyberpunk & Epic Scores"},
        {"id": "rnb", "name": "R&B / Soul", "query": "R&B Soul", "color": "#f97316", "colorEnd": "#7c2d12", "image": "assets/genres/rnb.jpg", "sub": "Smooth Night Grooves"}
    ]

    return {
        "trending": trending_tracks,
        "categories": categories
    }

@app.route('/api/stream_url/<video_id>', method=['GET'])
def get_stream_url(video_id):
    url = resolve_audio_stream(video_id)
    if url:
        return {"url": url, "proxyUrl": f"/api/proxy_stream/{video_id}"}
    return HTTPResponse(status=404, body=json.dumps({"error": "Audio stream not found"}))

@app.route('/api/proxy_stream/<video_id>', method=['GET'])
def proxy_audio_stream(video_id):
    # Instant offline serving if track was downloaded locally
    local_file = os.path.join(DOWNLOADS_DIR, f"{video_id}.m4a")
    if os.path.exists(local_file) and os.path.getsize(local_file) > 10000:
        return static_file(f"{video_id}.m4a", root=DOWNLOADS_DIR, mimetype="audio/mp4")

    stream_url = resolve_audio_stream(video_id)
    if not stream_url:
        return HTTPResponse(status=404, body="Stream not found")
    
    range_header = request.headers.get('Range')
    req_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive',
    }
    if range_header:
        req_headers['Range'] = range_header

    try:
        upstream = requests.get(stream_url, headers=req_headers, stream=True, timeout=(5, 12))
        if upstream.status_code >= 400:
            print(f"[Etsuko] Stream error ({upstream.status_code}) for {video_id}, re-resolving fresh stream...")
            stream_url = resolve_audio_stream(video_id, force=True)
            if not stream_url:
                return HTTPResponse(status=404, body="Stream not found")
            upstream = requests.get(stream_url, headers=req_headers, stream=True, timeout=(5, 12))

        content_type = upstream.headers.get('Content-Type', 'audio/webm')
        content_range = upstream.headers.get('Content-Range')
        content_length = upstream.headers.get('Content-Length')
        accept_ranges = upstream.headers.get('Accept-Ranges', 'bytes')

        headers = {
            'Content-Type': content_type,
            'Accept-Ranges': accept_ranges,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range',
            'Cache-Control': 'no-cache'
        }
        if content_range:
            headers['Content-Range'] = content_range
        if content_length:
            headers['Content-Length'] = content_length

        def body_generator():
            try:
                for chunk in upstream.iter_content(chunk_size=64 * 1024):
                    if chunk:
                        yield chunk
            except Exception as e:
                # Client closed stream or socket dropped
                pass
            finally:
                try:
                    upstream.close()
                except Exception:
                    pass

        return HTTPResponse(status=upstream.status_code, body=body_generator(), headers=headers)
    except Exception as e:
        print(f"[Etsuko] Stream proxy exception: {e}")
        return HTTPResponse(status=500, body=f"Stream proxy error: {e}")

@app.route('/api/album/<browse_id>', method=['GET'])
def get_album_details(browse_id):
    if not ytmusic:
        return HTTPResponse(status=500, body=json.dumps({"error": "YTMusic not initialized"}))
    try:
        album_data = ytmusic.get_album(browse_id)
        if not album_data:
            return HTTPResponse(status=404, body=json.dumps({"error": "Album not found"}))

        album_cover = clean_thumbnail(album_data.get('thumbnails', []))
        artists_str = ", ".join([a['name'] for a in album_data.get('artists', [{'name': 'Unknown Artist'}])])
        album_title = album_data.get('title', 'Unknown Album')
        year = album_data.get('year', '')

        tracks = []
        for t in album_data.get('tracks', []):
            vid = t.get('videoId')
            if not vid:
                continue
            track_artists = ", ".join([a['name'] for a in t.get('artists', [{'name': artists_str}])])
            track_thumb = clean_thumbnail(t.get('thumbnails', [])) if t.get('thumbnails') else album_cover
            tracks.append({
                "videoId": vid,
                "title": t.get('title', 'Unknown Track'),
                "artist": track_artists,
                "album": album_title,
                "duration": t.get('duration', '3:30'),
                "thumbnail": track_thumb,
                "isLiked": db.is_liked(vid)
            })

        return {
            "browseId": browse_id,
            "title": album_title,
            "artist": artists_str,
            "year": year,
            "thumbnail": album_cover,
            "tracks": tracks
        }
    except Exception as e:
        print(f"[Etsuko] Error fetching album {browse_id}: {e}")
        return HTTPResponse(status=500, body=json.dumps({"error": str(e)}))

def fetch_ml_radio(video_id):
    try:
        res = requests.post(
            'https://music.youtube.com/youtubei/v1/next',
            json={
                'context': {'client': {'clientName': 'WEB_REMIX', 'clientVersion': '1.20260928.01.00', 'hl': 'en'}},
                'playlistId': f'RDAMVM{video_id}',
                'videoId': video_id,
                'enablePersistentPlaylistPanel': True,
                'isAudioOnly': True
            },
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
            timeout=6
        )
        if res.status_code == 200:
            data = res.json()
            panel = data.get('contents', {}).get('singleColumnMusicWatchNextResultsRenderer', {}).get('tabbedRenderer', {}).get('watchNextTabbedResultsRenderer', {}).get('tabs', [{}])[0].get('tabRenderer', {}).get('content', {}).get('musicQueueRenderer', {}).get('content', {}).get('playlistPanelRenderer', {})
            items = panel.get('contents', [])
            tracks = []
            for item in items:
                v = item.get('playlistPanelVideoRenderer', {})
                vid = v.get('videoId')
                if not vid or vid == video_id:
                    continue
                title = v.get('title', {}).get('runs', [{}])[0].get('text', 'Unknown')
                artist = ''.join(r.get('text', '') for r in v.get('longBylineText', {}).get('runs', [])).split('•')[0].strip() or 'Unknown'
                duration = v.get('lengthText', {}).get('runs', [{}])[0].get('text', '3:30')
                thumbs = v.get('thumbnail', {}).get('thumbnails', [])
                thumb = thumbs[-1].get('url') if thumbs else f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg'
                if '=' in thumb:
                    thumb = thumb.split('=')[0] + '=w544-h544-l90-rj'
                tracks.append({
                    'videoId': vid,
                    'title': title,
                    'artist': artist,
                    'duration': duration,
                    'thumbnail': thumb,
                    'isLiked': db.is_liked(vid)
                })
            return tracks
    except Exception as e:
        print(f"[Etsuko] ML Radio fetch notice: {e}")
    return []

@app.route('/api/radio/<video_id>', method=['GET'])
def get_radio(video_id):
    # 1. Primary: YouTube ML Radio (RDAMVM) - official machine learning queue
    ml_tracks = fetch_ml_radio(video_id)
    if ml_tracks and len(ml_tracks) > 0:
        return {"tracks": ml_tracks}

    # 2. Fallback: ytmusicapi watch playlist
    try:
        if ytmusic:
            watch_playlist = ytmusic.get_watch_playlist(videoId=video_id, limit=20)
            tracks = []
            for track in watch_playlist.get('tracks', []):
                tid = track.get('videoId')
                if not tid or tid == video_id:
                    continue
                artists = ", ".join([a['name'] for a in track.get('artists', [{'name': 'Unknown'}])])
                tracks.append({
                    "videoId": tid,
                    "title": track.get('title', 'Unknown Track'),
                    "artist": artists,
                    "duration": track.get('length', '3:00'),
                    "thumbnail": clean_thumbnail(track.get('thumbnail', [])),
                    "isLiked": db.is_liked(tid)
                })
            return {"tracks": tracks}
    except Exception as e:
        print(f"[Etsuko] Radio fallback error: {e}")
    return {"tracks": []}

@app.route('/api/lyrics/<video_id>', method=['GET'])
def get_lyrics(video_id):
    title = request.query.get('title', '')
    artist = request.query.get('artist', '')

    # 1. Try LRCLIB for synced lyrics
    if title:
        try:
            params_dict = {"track_name": title}
            if artist and artist != 'Unknown Artist':
                params_dict["artist_name"] = artist
            params = urllib.parse.urlencode(params_dict)
            lrclib_url = f"https://lrclib.net/api/get?{params}"
            req = urllib.request.Request(lrclib_url, headers={'User-Agent': 'EtsukoMusicPlayer/1.0'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                synced = data.get('syncedLyrics')
                plain = data.get('plainLyrics')
                if synced or plain:
                    return {
                        "synced": synced,
                        "plain": plain,
                        "source": "LRCLIB"
                    }
        except Exception:
            pass

    # 2. Try YouTube Music lyrics
    try:
        if ytmusic:
            watch_data = ytmusic.get_watch_playlist(videoId=video_id)
            lyrics_browse_id = watch_data.get('lyrics')
            if lyrics_browse_id:
                lyrics_data = ytmusic.get_lyrics(lyrics_browse_id)
                if lyrics_data and lyrics_data.get('lyrics'):
                    return {
                        "synced": None,
                        "plain": lyrics_data.get('lyrics'),
                        "source": "YouTube Music"
                    }
    except Exception as e:
        print(f"[Etsuko] Lyrics error: {e}")

    return {"synced": None, "plain": "No lyrics found for this track.", "source": "None"}

# --- Offline Downloads Subsystem ---
@app.route('/api/download/track', method=['POST', 'OPTIONS'])
def download_track():
    if request.method == 'OPTIONS':
        return {}
    data = request.json or {}
    video_id = data.get('videoId')
    if not video_id:
        return HTTPResponse(status=400, body=json.dumps({"error": "Missing videoId"}))

    local_path = os.path.join(DOWNLOADS_DIR, f"{video_id}.m4a")
    if os.path.exists(local_path) and os.path.getsize(local_path) > 10000:
        db.save_downloaded_track(data, local_path)
        return {"success": True, "alreadyDownloaded": True, "localPath": local_path}

    def do_download():
        try:
            stream_url = resolve_audio_stream(video_id)
            if not stream_url:
                print(f"[Etsuko] Download failed: could not resolve stream for {video_id}")
                return
            r = requests.get(stream_url, stream=True, timeout=25)
            if r.status_code == 200:
                tmp_path = local_path + ".tmp"
                with open(tmp_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=128 * 1024):
                        if chunk:
                            f.write(chunk)
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 10000:
                    if os.path.exists(local_path):
                        try: os.remove(local_path)
                        except: pass
                    os.rename(tmp_path, local_path)
                    db.save_downloaded_track(data, local_path)
                    print(f"[Etsuko] Successfully saved track offline: {data.get('title')}")
        except Exception as e:
            print(f"[Etsuko] Download error for {video_id}: {e}")

    threading.Thread(target=do_download, daemon=True).start()
    return {"success": True, "message": "Download initiated"}

@app.route('/api/download/tracks', method=['GET'])
def get_downloads():
    tracks = db.get_downloaded_tracks()
    return {"tracks": tracks}

@app.route('/api/download/status/<video_id>', method=['GET'])
def check_download_status(video_id):
    local_path = os.path.join(DOWNLOADS_DIR, f"{video_id}.m4a")
    downloaded = os.path.exists(local_path) and os.path.getsize(local_path) > 10000
    if downloaded and not db.is_downloaded(video_id):
        db.save_downloaded_track({"videoId": video_id}, local_path)
    return {"downloaded": downloaded, "isDownloaded": downloaded}

@app.route('/api/download/delete/<video_id>', method=['DELETE', 'POST', 'OPTIONS'])
def delete_download(video_id):
    if request.method == 'OPTIONS':
        return {}
    local_path = os.path.join(DOWNLOADS_DIR, f"{video_id}.m4a")
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception as e:
            print(f"[Etsuko] File delete error: {e}")
    db.delete_downloaded_track(video_id)
    return {"success": True}

# --- Background Stream Prefetcher ---
@app.route('/api/prefetch_stream/<video_id>', method=['GET', 'OPTIONS'])
def prefetch_audio_stream(video_id):
    if request.method == 'OPTIONS':
        return {}
    def _worker():
        try:
            resolve_audio_stream(video_id)
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()
    return {"status": "prefetching"}

# --- Native Windows System Master Volume Synchronization ---
def get_windows_system_volume():
    try:
        import ctypes
        from ctypes import wintypes, POINTER, Structure, c_void_p, c_float, byref, cast
        ole32 = ctypes.windll.ole32
        ole32.CoInitialize(None)
        class GUID(Structure):
            _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]
        CLSID_MMDevEnum = GUID(0xBCDE0395, 0xE52F, 0x467C, (wintypes.BYTE * 8)(0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E))
        IID_IMMDevEnum = GUID(0xA95664D2, 0x9614, 0x4F35, (wintypes.BYTE * 8)(0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6))
        IID_IAudioEndpointVolume = GUID(0x5CDF2C82, 0x841E, 0x4546, (wintypes.BYTE * 8)(0x97, 0x22, 0x0C, 0xF7, 0x40, 0x78, 0x22, 0x9A))

        enum_ptr = c_void_p()
        ole32.CoCreateInstance(byref(CLSID_MMDevEnum), None, 1, byref(IID_IMMDevEnum), byref(enum_ptr))
        vtable = cast(cast(enum_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))
        GetDefaultAudioEndpoint = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, wintypes.DWORD, wintypes.DWORD, POINTER(c_void_p))(vtable[4])
        dev_ptr = c_void_p()
        GetDefaultAudioEndpoint(enum_ptr, 0, 0, byref(dev_ptr))
        dev_vtable = cast(cast(dev_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))
        Activate = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(GUID), wintypes.DWORD, c_void_p, POINTER(c_void_p))(dev_vtable[3])
        vol_ptr = c_void_p()
        Activate(dev_ptr, byref(IID_IAudioEndpointVolume), 1, None, byref(vol_ptr))
        vol_vtable = cast(cast(vol_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))
        GetMasterVolumeLevelScalar = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(c_float))(vol_vtable[9])
        GetMute = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(wintypes.BOOL))(vol_vtable[14])
        vol = c_float()
        mute = wintypes.BOOL()
        GetMasterVolumeLevelScalar(vol_ptr, byref(vol))
        GetMute(vol_ptr, byref(mute))
        return {"volume": float(vol.value), "muted": bool(mute.value)}
    except Exception as e:
        return {"volume": 0.75, "muted": False}

def set_windows_system_volume(vol_scalar=None, mute=None):
    try:
        import ctypes
        from ctypes import wintypes, POINTER, Structure, c_void_p, c_float, byref, cast
        ole32 = ctypes.windll.ole32
        ole32.CoInitialize(None)
        class GUID(Structure):
            _fields_ = [('Data1', wintypes.DWORD), ('Data2', wintypes.WORD), ('Data3', wintypes.WORD), ('Data4', wintypes.BYTE * 8)]
        CLSID_MMDevEnum = GUID(0xBCDE0395, 0xE52F, 0x467C, (wintypes.BYTE * 8)(0x8E, 0x3D, 0xC4, 0x57, 0x92, 0x91, 0x69, 0x2E))
        IID_IMMDevEnum = GUID(0xA95664D2, 0x9614, 0x4F35, (wintypes.BYTE * 8)(0xA7, 0x46, 0xDE, 0x8D, 0xB6, 0x36, 0x17, 0xE6))
        IID_IAudioEndpointVolume = GUID(0x5CDF2C82, 0x841E, 0x4546, (wintypes.BYTE * 8)(0x97, 0x22, 0x0C, 0xF7, 0x40, 0x78, 0x22, 0x9A))

        enum_ptr = c_void_p()
        ole32.CoCreateInstance(byref(CLSID_MMDevEnum), None, 1, byref(IID_IMMDevEnum), byref(enum_ptr))
        vtable = cast(cast(enum_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))
        GetDefaultAudioEndpoint = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, wintypes.DWORD, wintypes.DWORD, POINTER(c_void_p))(vtable[4])
        dev_ptr = c_void_p()
        GetDefaultAudioEndpoint(enum_ptr, 0, 0, byref(dev_ptr))
        dev_vtable = cast(cast(dev_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))
        Activate = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, POINTER(GUID), wintypes.DWORD, c_void_p, POINTER(c_void_p))(dev_vtable[3])
        vol_ptr = c_void_p()
        Activate(dev_ptr, byref(IID_IAudioEndpointVolume), 1, None, byref(vol_ptr))
        vol_vtable = cast(cast(vol_ptr, POINTER(c_void_p)).contents, POINTER(c_void_p))

        if vol_scalar is not None:
            SetMasterVolumeLevelScalar = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, c_float, c_void_p)(vol_vtable[7])
            SetMasterVolumeLevelScalar(vol_ptr, c_float(max(0.0, min(1.0, float(vol_scalar)))), None)
        if mute is not None:
            SetMute = ctypes.WINFUNCTYPE(ctypes.c_long, c_void_p, wintypes.BOOL, c_void_p)(vol_vtable[13])
            SetMute(vol_ptr, wintypes.BOOL(bool(mute)), None)
        return True
    except Exception as e:
        return False

@app.route('/api/system/volume', method=['GET', 'POST', 'OPTIONS'])
def system_volume_endpoint():
    if request.method == 'OPTIONS':
        return {}
    if request.method == 'POST':
        data = request.json or {}
        vol = data.get('volume')
        muted = data.get('muted')
        set_windows_system_volume(vol, muted)
        return {"success": True}
    return get_windows_system_volume()

@app.route('/api/library/like', method=['POST', 'OPTIONS'])
def toggle_like():
    if request.method == 'OPTIONS':
        return {}
    track = request.json
    liked = db.toggle_like(track)
    return {"liked": liked}

@app.route('/api/library/unlike', method=['POST', 'OPTIONS'])
def unlike_track():
    if request.method == 'OPTIONS':
        return {}
    data = request.json
    video_id = data.get("videoId") or data.get("video_id")
    if video_id:
        db.remove_like(video_id)
    return {"success": True}

@app.route('/api/library/likes', method=['GET'])
def get_likes():
    return {"tracks": db.get_liked_songs()}

@app.route('/api/library/likes/clear', method=['POST', 'OPTIONS'])
def clear_all_likes():
    if request.method == 'OPTIONS':
        return {}
    db.clear_liked_songs()
    return {"success": True}

@app.route('/api/library/playlist/<playlist_id:int>/clear', method=['POST', 'OPTIONS'])
def clear_single_playlist(playlist_id):
    if request.method == 'OPTIONS':
        return {}
    db.clear_playlist_tracks(playlist_id)
    return {"success": True}

@app.route('/api/library/playlists', method=['GET', 'POST', 'OPTIONS'])
def handle_playlists():
    if request.method == 'OPTIONS':
        return {}
    if request.method == 'POST':
        data = request.json
        name = data.get('name', 'My Playlist').strip()
        desc = data.get('description', '')
        cover = data.get('cover', '')
        pid = db.create_playlist(name, desc, cover)
        return {"id": pid, "name": name, "success": pid is not None}
    return {"playlists": db.get_playlists()}

@app.route('/api/library/playlist/<playlist_id:int>', method=['GET', 'DELETE', 'OPTIONS'])
def handle_single_playlist(playlist_id):
    if request.method == 'OPTIONS':
        return {}
    if request.method == 'DELETE':
        db.delete_playlist(playlist_id)
        return {"success": True}
    tracks = db.get_playlist_tracks(playlist_id)
    return {"tracks": tracks}

@app.route('/api/library/playlist/<playlist_id:int>/add', method=['POST', 'OPTIONS'])
def add_to_playlist(playlist_id):
    if request.method == 'OPTIONS':
        return {}
    track = request.json
    added = db.add_track_to_playlist(playlist_id, track)
    return {"success": added}

@app.route('/api/library/playlist/<playlist_id:int>/track/<video_id>', method=['DELETE', 'OPTIONS'])
def remove_track_from_playlist(playlist_id, video_id):
    if request.method == 'OPTIONS':
        return {}
    db.remove_track_from_playlist(playlist_id, video_id)
    return {"success": True}

@app.route('/api/profile', method=['GET', 'POST', 'OPTIONS'])
def handle_profile():
    if request.method == 'OPTIONS':
        return {}
    if request.method == 'POST':
        data = request.json or {}
        name = data.get('name', '').strip()
        bio = data.get('bio', '').strip()
        avatar = data.get('avatar', 'assets/default_user.png')
        if not avatar or avatar == 'assets/logo.png':
            avatar = 'assets/default_user.png'
        db.update_profile(name, bio, avatar)
        return {"success": True, "profile": {"name": name, "bio": bio, "avatar": avatar}}
    return {"profile": db.get_profile()}

@app.route('/api/library/history', method=['GET', 'POST', 'OPTIONS'])
def handle_history():
    if request.method == 'OPTIONS':
        return {}
    if request.method == 'POST':
        track = request.json
        db.record_history(track)
        return {"success": True}
    return {"history": db.get_history()}

@app.route('/api/version', method=['GET'])
def get_version():
    return {"version": APP_VERSION}

@app.route('/api/update/check', method=['GET'])
def check_for_updates():
    try:
        r = requests.get(UPDATE_BEACON_URL, headers={'User-Agent': f'Etsuko-App/{APP_VERSION}'}, timeout=8)
        r.raise_for_status()
        remote = r.json()
        remote_ver = str(remote.get('version', '')).strip()

        def parse_ver(v):
            parts = []
            for x in v.replace('v', '').split('.'):
                clean = ''.join(c for c in x if c.isdigit())
                if clean:
                    parts.append(int(clean))
            return parts

        cur_parts = parse_ver(APP_VERSION)
        rem_parts = parse_ver(remote_ver)
        is_newer = rem_parts > cur_parts

        return {
            "updateAvailable": is_newer,
            "currentVersion": APP_VERSION,
            "latestVersion": remote_ver,
            "downloadUrl": remote.get('download_url'),
            "portableUrl": remote.get('download_url_standalone') or remote.get('portable_url'),
            "changelog": remote.get('changelog', '')
        }
    except Exception as e:
        return {"updateAvailable": False, "currentVersion": APP_VERSION, "error": str(e)}

UPDATE_STATE = {
    "status": "idle",
    "percent": 0.0,
    "downloaded_bytes": 0,
    "total_bytes": 0,
    "speed_mbps": 0.0,
    "error": None
}
UPDATE_CANCEL_FLAG = False

@app.route('/api/update/status', method=['GET'])
def get_update_status():
    return UPDATE_STATE

@app.route('/api/update/cancel', method=['POST', 'OPTIONS'])
def cancel_update():
    global UPDATE_CANCEL_FLAG
    if request.method == 'OPTIONS':
        return {}
    UPDATE_CANCEL_FLAG = True
    UPDATE_STATE["status"] = "idle"
    return {"success": True}

@app.route('/api/update/install', method=['POST', 'OPTIONS'])
def perform_update():
    global UPDATE_CANCEL_FLAG
    if request.method == 'OPTIONS':
        return {}
    try:
        data = request.json or {}
        download_url = data.get('downloadUrl')
        if not download_url:
            return HTTPResponse(status=400, body=json.dumps({"error": "No download URL provided"}))

        if UPDATE_STATE["status"] == "downloading":
            return {"success": True, "message": "Already downloading"}

        UPDATE_CANCEL_FLAG = False
        UPDATE_STATE["status"] = "downloading"
        UPDATE_STATE["percent"] = 0.0
        UPDATE_STATE["downloaded_bytes"] = 0
        UPDATE_STATE["total_bytes"] = 0
        UPDATE_STATE["speed_mbps"] = 0.0
        UPDATE_STATE["error"] = None

        def download_and_install():
            global UPDATE_CANCEL_FLAG
            import tempfile, subprocess
            try:
                temp_dir = tempfile.gettempdir()
                dest_exe = os.path.join(temp_dir, "Etsuko_Update_Setup.exe")
                
                # High-speed streaming download using requests with IPv4 connection
                r = requests.get(
                    download_url,
                    stream=True,
                    timeout=20,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                r.raise_for_status()

                total_bytes = int(r.headers.get('content-length') or 0)
                UPDATE_STATE["total_bytes"] = total_bytes
                downloaded = 0
                start_time = time.time()
                last_calc_time = start_time
                last_calc_bytes = 0

                chunk_size = 128 * 1024
                with open(dest_exe, 'wb') as out_file:
                    for chunk in r.iter_content(chunk_size=chunk_size):
                        if UPDATE_CANCEL_FLAG:
                            UPDATE_STATE["status"] = "idle"
                            return
                        if chunk:
                            out_file.write(chunk)
                            downloaded += len(chunk)
                            UPDATE_STATE["downloaded_bytes"] = downloaded
                            
                            now = time.time()
                            if total_bytes > 0:
                                UPDATE_STATE["percent"] = round((downloaded / total_bytes) * 100, 1)
                            
                            if now - last_calc_time >= 0.2:
                                elapsed = now - last_calc_time
                                bytes_diff = downloaded - last_calc_bytes
                                speed_mb = (bytes_diff / (1024 * 1024)) / (elapsed if elapsed > 0 else 1)
                                UPDATE_STATE["speed_mbps"] = round(speed_mb, 2)
                                last_calc_time = now
                                last_calc_bytes = downloaded

                UPDATE_STATE["percent"] = 100.0
                UPDATE_STATE["status"] = "installing"
                time.sleep(0.5)

                installed_dir = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Etsuko")
                target_exe = os.path.join(installed_dir, "etsuko.exe")
                current_exe = os.path.abspath(sys.executable)
                bat_path = os.path.join(temp_dir, "etsuko_updater.bat")
                
                bat_content = f"""@echo off
timeout /t 1 /nobreak >nul
taskkill /F /IM etsuko.exe >nul 2>&1
timeout /t 1 /nobreak >nul
start "" /wait "{dest_exe}" /SILENT /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS
if exist "{current_exe}" (
    copy /y "{target_exe}" "{current_exe}" >nul 2>&1
    start "" "{current_exe}"
) else (
    start "" "{target_exe}"
)
del "%~f0"
"""
                with open(bat_path, "w", encoding="utf-8") as bf:
                    bf.write(bat_content)

                DETACHED_PROCESS = 0x00000008
                CREATE_NEW_PROCESS_GROUP = 0x00000200
                try:
                    subprocess.Popen(
                        ["cmd.exe", "/c", bat_path],
                        creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
                        close_fds=True
                    )
                except Exception:
                    subprocess.Popen(["cmd.exe", "/c", bat_path])

                time.sleep(1.2)
                os._exit(0)
            except Exception as e:
                print(f"[Etsuko] Update error: {e}")
                UPDATE_STATE["status"] = "error"
                UPDATE_STATE["error"] = str(e)

        threading.Thread(target=download_and_install, daemon=True).start()
        return {"success": True, "message": "Download started"}
    except Exception as e:
        UPDATE_STATE["status"] = "error"
        UPDATE_STATE["error"] = str(e)
        return HTTPResponse(status=500, body=json.dumps({"error": str(e)}))


# Serve static frontend files
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    FRONTEND_DIR = os.path.join(sys._MEIPASS, "frontend")
else:
    FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

@app.route('/')
def serve_index():
    return static_file('index.html', root=FRONTEND_DIR)

@app.route('/<filepath:path>')
def serve_static(filepath):
    return static_file(filepath, root=FRONTEND_DIR)

from bottle import ServerAdapter
from wsgiref.simple_server import make_server, WSGIRequestHandler, WSGIServer
from socketserver import ThreadingMixIn

class ThreadedWSGIServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True
    allow_reuse_address = True

class QuietWSGIRequestHandler(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass

class ThreadedWSGIServerAdapter(ServerAdapter):
    def run(self, handler):
        server = make_server(self.host, self.port, handler,
                             server_class=ThreadedWSGIServer,
                             handler_class=QuietWSGIRequestHandler)
        server.serve_forever()

def start_server(host='127.0.0.1', port=52331):
    print(f"[Etsuko] Starting concurrent multi-threaded backend streaming server on http://{host}:{port}")
    try:
        app.run(host=host, port=port, server=ThreadedWSGIServerAdapter, quiet=True)
    except Exception as e:
        print(f"[Etsuko] Threaded server fallback: {e}")
        app.run(host=host, port=port, quiet=True, debug=False)

if __name__ == '__main__':
    start_server()
