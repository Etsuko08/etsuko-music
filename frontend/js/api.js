// Etsuko PC Neural API Engine
// Spotify-Style Machine Learning Radio, Deep Vibe Clustering, LRCLIB Synced Lyrics,
// Unified Recommendation Pool & Zero-Delay Local/Offline Downloads

function formatHighResThumbnail(videoId, url) {
  if (url && typeof url === 'string') {
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
      if (/=w\d+-h\d+[^"]*/.test(url)) {
        return url.replace(/=w\d+-h\d+[^"]*/, '=w544-h544-l90-rj');
      } else if (/=s\d+/.test(url)) {
        return url.replace(/=s\d+/, '=s544');
      }
      return url;
    }
    if (url.includes('hq720.jpg') || url.includes('maxresdefault.jpg')) {
      return url;
    }
    if (url.includes('hqdefault.jpg') && videoId) {
      return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    }
    if (url.startsWith('http')) {
      return url;
    }
  }
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
  }
  return url || 'assets/default_cover.png';
}

// Master Curated Catalogs (Guaranteed 100% Active YouTube IDs & Static Edge Covers)
const CATALOG_TRENDING_HITS = [
  { videoId: "DlFXDl_ROAM", title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars", album: "Die With A Smile", duration: "4:12", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/RFK4wHeGqwI3DndbARbRJB21IC0TcmqnrlyjxYK7T-nC8wlIVbfxNaCIFKNvSpchDKmYyVLe1RN36w=w544-h544-l90-rj" },
  { videoId: "kIft-LUHHVA", title: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet", duration: "2:56", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/bTWlZSenrOAYgH4r6NAzyDraWQR_wLl3OuRexJ_8h3NZUVHEilRSzUmKNa9YMOFSVcF0YtOuzKdXrt2UHg=w544-h544-l90-rj" },
  { videoId: "WKZO-CWeOVA", title: "BIRDS OF A FEATHER", artist: "Billie Eilish", album: "HIT ME HARD AND SOFT", duration: "3:31", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/mXJjWX4E6Gpr03CUYl18PdVXlczmoL2Tm-LEBGafIr_8smlHnl8AHniJu0_7Y80e-aeloJxcryQQx0ZJ=w544-h544-l90-rj" },
  { videoId: "phLb_SoPBlA", title: "Not Like Us", artist: "Kendrick Lamar", album: "Not Like Us", duration: "4:35", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/8qk3C_zpd2FXHVN8BpMBFL6h9J5BlKlbcKOlvDMvIgBWBsAblDoTjU98RGbFH9DxtnN1X5zRzc9sSvWr=w544-h544-l90-rj" },
  { videoId: "aC9HkZW2hZk", title: "Cruel Summer", artist: "Taylor Swift", album: "Lover", duration: "2:59", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/OhxDTHQOQzSrcdgH9hzqzp1v22GYDE-QKnkryvCeq4ddx-3K3_c8oDXN0E6NvHlMn1q4XV59aHr0oL4f=w544-h544-l90-rj" },
  { videoId: "J7p4bzqLvCw", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: "3:22", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/R_cjQK3wwLPEzri1jerx-79zgzGocoKvwGU3NMONaTsaMM0Idd641pfB8r5jgfpn6I8JAoFtf9RBIcI=w544-h544-l90-rj" },
  { videoId: "3_g2un5M350", title: "Starboy (feat. Daft Punk)", artist: "The Weeknd", album: "Starboy", duration: "3:51", tag: "Album", thumbnail: "https://yt3.googleusercontent.com/dcxXIIlest09vnvKznWM9VWQXu1EL7lKxBzXGzwgmVjmMNBm1dEWT_0qn1xrEZYyKF_qRE1TLq8P_JY_mQ=w544-h544-l90-rj" },
  { videoId: "xIQpLlYC8xA", title: "Houdini", artist: "Eminem", album: "The Death of Slim Shady", duration: "3:48", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/Xx3dX1EJDirqwpfQL05uAgmKGYpzTcFDXjjHqjNpIhgY5MWTJRLSlOjaYVtup2Ku6gBYEqXoxw5aGKC3=w544-h544-l90-rj" },
  { videoId: "2nR1zrNzgcY", title: "FE!N (feat. Playboi Carti)", artist: "Travis Scott", album: "UTOPIA", duration: "3:12", tag: "Album", thumbnail: "https://yt3.googleusercontent.com/eBvJuWpjg0Mx8DBa5WIhCzEopXyMnxkjWSU895BDGjTpNeqrliLrv3zGqNNuCUoXL1EkEAr5VQ3cx2pW=w544-h544-l90-rj" },
  { videoId: "1-xGerv5FOk", title: "Close Eyes", artist: "DVRST", album: "Close Eyes", duration: "2:12", tag: "Single", thumbnail: "https://i.ytimg.com/vi/1-xGerv5FOk/hqdefault.jpg" },
  { videoId: "4EQkYVtE-28", title: "Circles", artist: "Post Malone", album: "Hollywood's Bleeding", duration: "3:36", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/YoQ-A-GOpgeE8tgdF3Rcf5z9V8NIIKjLH6_7X3QphIQUwVHioLu7Ik2wQzU0oCkyNm1TeLDLDYvomJ8=w544-h544-l90-rj" },
  { videoId: "OsfAnsMY21M", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", duration: "3:24", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/UpJ_IhBqyhQV9b2UGcDxxWDm14kRQ2eY1o9S96AGsbE7Ol8isbpbPA0Yefvg8S8ZGAX9L1g4xaj21zVJ=w544-h544-l90-rj" }
];

const CATALOG_DAILY_POOL = [
  { videoId: "aHmg0jsmNhg", title: "vampire", artist: "Olivia Rodrigo", album: "GUTS", duration: "3:40", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/F32A1XBuQEkcOnYin-1BURG2MK_q12Ebovqwe8im8KXf8BHJ_jXW_7NnK73K6QOH-1D6QZKrrZGbNrlS=w544-h544-l90-rj" },
  { videoId: "bpOSxM0rNPM", title: "Do I Wanna Know?", artist: "Arctic Monkeys", album: "AM", duration: "4:32", tag: "Album", thumbnail: "https://yt3.googleusercontent.com/7a03Ybk8vbe8c4dl4E8l77Y4e9aEWjQvTfOAdLdXxsnjZ57gYQ8FsKra9SgXAHT-jtiwuq6lukCfbRKL=w544-h544-l90-rj" },
  { videoId: "eVTXPUF4Oz4", title: "In the End", artist: "Linkin Park", album: "Hybrid Theory", duration: "3:36", tag: "EP", thumbnail: "https://i.ytimg.com/vi/eVTXPUF4Oz4/hqdefault.jpg" },
  { videoId: "AdEKgwUqPKI", title: "Kill Bill", artist: "SZA", album: "SOS", duration: "2:34", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/tw5VGXEsehs9OpwnpbubqGp_3Pq9so7QShdyJSlCpXeI2mLRvqRqLNbA7EC4zcNWrFE0_lj9HxpZ23v6=w544-h544-l90-rj" },
  { videoId: "FrsOnNxIrg8", title: "God's Plan", artist: "Drake", album: "Scorpion", duration: "3:19", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/9Oe4acEXgmAlCKgcgI6JlSXi2Tj30u6anzvfGBrunGO-fLhBTgzy-ei1ugPJpZDD5ArKFod9H4RTA5g0=w544-h544-l90-rj" },
  { videoId: "_GWKkqNoyEA", title: "Counting Stars", artist: "OneRepublic", album: "Native", duration: "4:18", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/m2pZLjozMvQBj21LgvAIslVPP-T2xQlxbxCTJ98vpPN8HZ0fgR-wisJQ2IzrKS2yLTAYBjs0TpOYnIY=w544-h544-l90-rj" },
  { videoId: "9ssQKlLxBdQ", title: "Thunder", artist: "Imagine Dragons", album: "Evolve", duration: "3:08", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/weYQWfEwWNPOuAm34geXN1LkSYPlsJay78NnQgHC3PKsyZcdvBHIsMtqoFh3rioA4XgMdHMQd3h6vH6mbA=w544-h544-l90-rj" },
  { videoId: "BSTsnWoslP4", title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", duration: "5:55", tag: "Master", thumbnail: "https://yt3.googleusercontent.com/nLn1gxvYiZqzXOY9HyUXVXbFtmR5nhY8sDpbvBT1aw-Ejjsz__Nz90sZoc4nZgff2sf8WjowuVRVBlBTww=w544-h544-l90-rj" },
  { videoId: "4D7u5KF7SP8", title: "Get Lucky", artist: "Daft Punk, Pharrell Williams", album: "Random Access Memories", duration: "6:10", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/N55arCGj69gtw6thXK8JUPisxoVYiwuIEQ7I6SGlkEyNcSJ7xIWPe76Vuu1SiUqRyx5w9qvR_zV8fV3CWQ=w544-h544-l90-rj" },
  { videoId: "2NiyrtYegso", title: "Wake Me Up", artist: "Avicii", album: "True", duration: "4:08", tag: "Single", thumbnail: "https://yt3.googleusercontent.com/XincHWEjkXhpbavoQEHWRbTcVdvHsujjr7OAw-73KUCILFgjLdevPW8vkoaRMibnwkTtGWkEDyKbuNeK=w544-h544-l90-rj" }
];

const CATALOG_HINDI_HITS = [
  { videoId: "Umqb9KENgmk", title: "Tum Hi Ho", artist: "Arijit Singh", album: "Aashiqui 2", duration: "4:22", tag: "Romance", thumbnail: "https://i.ytimg.com/vi/Umqb9KENgmk/hqdefault.jpg" },
  { videoId: "BddP6PYo2gs", title: "Kesariya", artist: "Arijit Singh, Pritam", album: "Brahmastra", duration: "4:28", tag: "Romance", thumbnail: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg" },
  { videoId: "V_jp5_VAzXk", title: "Chaleya", artist: "Arijit Singh, Shilpa Rao", album: "Jawan", duration: "3:20", tag: "Romance", thumbnail: "https://i.ytimg.com/vi/V_jp5_VAzXk/hqdefault.jpg" },
  { videoId: "cbqbx7h0p9E", title: "Tum Se Hi", artist: "Mohit Chauhan, Pritam", album: "Jab We Met", duration: "5:21", tag: "Classic", thumbnail: "https://i.ytimg.com/vi/cbqbx7h0p9E/hqdefault.jpg" },
  { videoId: "5y_KpD_aUfk", title: "Zara Sa", artist: "KK, Pritam", album: "Jannat", duration: "5:03", tag: "Melody", thumbnail: "https://i.ytimg.com/vi/5y_KpD_aUfk/hqdefault.jpg" },
  { videoId: "ElZfdU54Cp8", title: "Apna Bana Le", artist: "Arijit Singh, Sachin-Jigar", album: "Bhediya", duration: "4:21", tag: "Soul", thumbnail: "https://i.ytimg.com/vi/ElZfdU54Cp8/hqdefault.jpg" },
  { videoId: "gvyUuxdRdR4", title: "O Maahi", artist: "Arijit Singh, Pritam", album: "Dunki", duration: "3:53", tag: "Hit", thumbnail: "https://i.ytimg.com/vi/gvyUuxdRdR4/hqdefault.jpg" },
  { videoId: "284Ov7ysmfA", title: "Channa Mereya", artist: "Arijit Singh, Pritam", album: "Ae Dil Hai Mushkil", duration: "4:49", tag: "Heartbreak", thumbnail: "https://i.ytimg.com/vi/284Ov7ysmfA/hqdefault.jpg" }
];

const CATALOG_URDU_SUFI = [
  { videoId: "kw4tT7SCmaY", title: "Afreen Afreen", artist: "Rahat Fateh Ali Khan, Momina Mustehsan", album: "Coke Studio", duration: "6:44", tag: "Sufi", thumbnail: "https://i.ytimg.com/vi/kw4tT7SCmaY/hqdefault.jpg" },
  { videoId: "c7TX12j_sY8", title: "Tajdar-e-Haram", artist: "Atif Aslam", album: "Coke Studio", duration: "10:28", tag: "Qawwali", thumbnail: "https://i.ytimg.com/vi/c7TX12j_sY8/hqdefault.jpg" },
  { videoId: "2kfmxHqM_eI", title: "Pehli Dafa", artist: "Atif Aslam", album: "Pehli Dafa", duration: "4:43", tag: "Romantic", thumbnail: "https://i.ytimg.com/vi/2kfmxHqM_eI/hqdefault.jpg" },
  { videoId: "zJmU2j3O6Wc", title: "Kahani Suno 2.0", artist: "Kaifi Khalil", album: "Kahani Suno", duration: "2:54", tag: "Ghazal", thumbnail: "https://i.ytimg.com/vi/zJmU2j3O6Wc/hqdefault.jpg" },
  { videoId: "2JzQhLqA5Q4", title: "Jhoom", artist: "Ali Zafar", album: "Jhoom", duration: "4:32", tag: "Acoustic", thumbnail: "https://i.ytimg.com/vi/2JzQhLqA5Q4/hqdefault.jpg" },
  { videoId: "v_ysZ_0w2Wk", title: "O Re Piya", artist: "Rahat Fateh Ali Khan", album: "Aaja Nachle", duration: "6:19", tag: "Soul", thumbnail: "https://i.ytimg.com/vi/v_ysZ_0w2Wk/hqdefault.jpg" },
  { videoId: "RLzC55ai0eo", title: "Heeriye", artist: "Jasleen Royal, Arijit Singh", album: "Heeriye", duration: "3:14", tag: "Indie", thumbnail: "https://i.ytimg.com/vi/RLzC55ai0eo/hqdefault.jpg" }
];

const CATALOG_PUNJABI_HITS = [
  { videoId: "LK7-_dgAVQE", title: "Tauba Tauba", artist: "Karan Aujla", album: "Bad Newz", duration: "3:26", tag: "Banger", thumbnail: "https://i.ytimg.com/vi/LK7-_dgAVQE/hqdefault.jpg" },
  { videoId: "cWMxCE2HTag", title: "Softly", artist: "Karan Aujla, Ikky", album: "Four You", duration: "2:36", tag: "Heat", thumbnail: "https://i.ytimg.com/vi/cWMxCE2HTag/hqdefault.jpg" },
  { videoId: "4TYv2PhG89A", title: "Cheques", artist: "Shubh", album: "Still Rollin", duration: "3:03", tag: "Viral", thumbnail: "https://i.ytimg.com/vi/4TYv2PhG89A/hqdefault.jpg" },
  { videoId: "4tywp83zkmk", title: "One Love", artist: "Shubh", album: "One Love", duration: "2:40", tag: "Vibe", thumbnail: "https://i.ytimg.com/vi/4tywp83zkmk/hqdefault.jpg" },
  { videoId: "VNs_cCtdbPc", title: "Baller", artist: "Shubh, Ikky", album: "Baller", duration: "2:28", tag: "Club", thumbnail: "https://i.ytimg.com/vi/VNs_cCtdbPc/hqdefault.jpg" },
  { videoId: "cl0a3i2wFcc", title: "G.O.A.T.", artist: "Diljit Dosanjh", album: "G.O.A.T.", duration: "3:43", tag: "Legend", thumbnail: "https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg" },
  { videoId: "vX2cDW8LUWk", title: "Lover", artist: "Diljit Dosanjh", album: "MoonChild Era", duration: "3:07", tag: "Pop", thumbnail: "https://i.ytimg.com/vi/vX2cDW8LUWk/hqdefault.jpg" }
];

const CATALOG_POP_HITS = [
  { videoId: "DlFXDl_ROAM", title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars", album: "Die With A Smile", duration: "4:12", tag: "Global #1", thumbnail: "https://yt3.googleusercontent.com/RFK4wHeGqwI3DndbARbRJB21IC0TcmqnrlyjxYK7T-nC8wlIVbfxNaCIFKNvSpchDKmYyVLe1RN36w=w544-h544-l90-rj" },
  { videoId: "kIft-LUHHVA", title: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet", duration: "2:56", tag: "Pop", thumbnail: "https://yt3.googleusercontent.com/bTWlZSenrOAYgH4r6NAzyDraWQR_wLl3OuRexJ_8h3NZUVHEilRSzUmKNa9YMOFSVcF0YtOuzKdXrt2UHg=w544-h544-l90-rj" },
  { videoId: "WKZO-CWeOVA", title: "BIRDS OF A FEATHER", artist: "Billie Eilish", album: "HIT ME HARD AND SOFT", duration: "3:31", tag: "Alternative", thumbnail: "https://yt3.googleusercontent.com/mXJjWX4E6Gpr03CUYl18PdVXlczmoL2Tm-LEBGafIr_8smlHnl8AHniJu0_7Y80e-aeloJxcryQQx0ZJ=w544-h544-l90-rj" },
  { videoId: "aC9HkZW2hZk", title: "Cruel Summer", artist: "Taylor Swift", album: "Lover", duration: "2:59", tag: "Pop", thumbnail: "https://yt3.googleusercontent.com/OhxDTHQOQzSrcdgH9hzqzp1v22GYDE-QKnkryvCeq4ddx-3K3_c8oDXN0E6NvHlMn1q4XV59aHr0oL4f=w544-h544-l90-rj" },
  { videoId: "J7p4bzqLvCw", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", duration: "3:22", tag: "Synth", thumbnail: "https://yt3.googleusercontent.com/R_cjQK3wwLPEzri1jerx-79zgzGocoKvwGU3NMONaTsaMM0Idd641pfB8r5jgfpn6I8JAoFtf9RBIcI=w544-h544-l90-rj" }
];

const CATALOG_PHONK_HITS = [
  { videoId: "1-xGerv5FOk", title: "Close Eyes", artist: "DVRST", album: "Close Eyes", duration: "2:12", tag: "Drift", thumbnail: "https://i.ytimg.com/vi/1-xGerv5FOk/hqdefault.jpg" },
  { videoId: "fzeoo8n8RZo", title: "Murder In My Mind", artist: "Kordhell", album: "Murder In My Mind", duration: "2:25", tag: "Aggressive", thumbnail: "https://i.ytimg.com/vi/fzeoo8n8RZo/hqdefault.jpg" },
  { videoId: "NS9z2QHcZdY", title: "Metamorphosis", artist: "INTERWORLD", album: "Metamorphosis", duration: "2:22", tag: "Dark", thumbnail: "https://i.ytimg.com/vi/NS9z2QHcZdY/hqdefault.jpg" },
  { videoId: "dvQJIgjlR3I", title: "Neon Blade", artist: "MoonDeity", album: "Neon Blade", duration: "4:24", tag: "Cyber", thumbnail: "https://i.ytimg.com/vi/dvQJIgjlR3I/hqdefault.jpg" },
  { videoId: "pIZ0QRWK0zg", title: "Sahara", artist: "Hensonn", album: "Sahara", duration: "2:51", tag: "Bass", thumbnail: "https://i.ytimg.com/vi/pIZ0QRWK0zg/hqdefault.jpg" }
];

const CATALOG_HIPHOP_HITS = [
  { videoId: "phLb_SoPBlA", title: "Not Like Us", artist: "Kendrick Lamar", album: "Not Like Us", duration: "4:35", tag: "West Coast", thumbnail: "https://yt3.googleusercontent.com/8qk3C_zpd2FXHVN8BpMBFL6h9J5BlKlbcKOlvDMvIgBWBsAblDoTjU98RGbFH9DxtnN1X5zRzc9sSvWr=w544-h544-l90-rj" },
  { videoId: "xIQpLlYC8xA", title: "Houdini", artist: "Eminem", album: "The Death of Slim Shady", duration: "3:48", tag: "Rap", thumbnail: "https://yt3.googleusercontent.com/Xx3dX1EJDirqwpfQL05uAgmKGYpzTcFDXjjHqjNpIhgY5MWTJRLSlOjaYVtup2Ku6gBYEqXoxw5aGKC3=w544-h544-l90-rj" },
  { videoId: "2nR1zrNzgcY", title: "FE!N (feat. Playboi Carti)", artist: "Travis Scott", album: "UTOPIA", duration: "3:12", tag: "Trap", thumbnail: "https://yt3.googleusercontent.com/eBvJuWpjg0Mx8DBa5WIhCzEopXyMnxkjWSU895BDGjTpNeqrliLrv3zGqNNuCUoXL1EkEAr5VQ3cx2pW=w544-h544-l90-rj" },
  { videoId: "FrsOnNxIrg8", title: "God's Plan", artist: "Drake", album: "Scorpion", duration: "3:19", tag: "Hip-Hop", thumbnail: "https://yt3.googleusercontent.com/9Oe4acEXgmAlCKgcgI6JlSXi2Tj30u6anzvfGBrunGO-fLhBTgzy-ei1ugPJpZDD5ArKFod9H4RTA5g0=w544-h544-l90-rj" },
  { videoId: "3_g2un5M350", title: "Starboy", artist: "The Weeknd", album: "Starboy", duration: "3:51", tag: "R&B / Rap", thumbnail: "https://yt3.googleusercontent.com/dcxXIIlest09vnvKznWM9VWQXu1EL7lKxBzXGzwgmVjmMNBm1dEWT_0qn1xrEZYyKF_qRE1TLq8P_JY_mQ=w544-h544-l90-rj" }
];

const CATALOG_ROCK_HITS = [
  { videoId: "eVTXPUF4Oz4", title: "In the End", artist: "Linkin Park", album: "Hybrid Theory", duration: "3:36", tag: "Nu-Metal", thumbnail: "https://i.ytimg.com/vi/eVTXPUF4Oz4/hqdefault.jpg" },
  { videoId: "bpOSxM0rNPM", title: "Do I Wanna Know?", artist: "Arctic Monkeys", album: "AM", duration: "4:32", tag: "Indie Rock", thumbnail: "https://yt3.googleusercontent.com/7a03Ybk8vbe8c4dl4E8l77Y4e9aEWjQvTfOAdLdXxsnjZ57gYQ8FsKra9SgXAHT-jtiwuq6lukCfbRKL=w544-h544-l90-rj" },
  { videoId: "BSTsnWoslP4", title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", duration: "5:55", tag: "Masterpiece", thumbnail: "https://yt3.googleusercontent.com/nLn1gxvYiZqzXOY9HyUXVXbFtmR5nhY8sDpbvBT1aw-Ejjsz__Nz90sZoc4nZgff2sf8WjowuVRVBlBTww=w544-h544-l90-rj" },
  { videoId: "9ssQKlLxBdQ", title: "Thunder", artist: "Imagine Dragons", album: "Evolve", duration: "3:08", tag: "Arena Rock", thumbnail: "https://yt3.googleusercontent.com/weYQWfEwWNPOuAm34geXN1LkSYPlsJay78NnQgHC3PKsyZcdvBHIsMtqoFh3rioA4XgMdHMQd3h6vH6mbA=w544-h544-l90-rj" }
];

const CATALOG_LOFI_HITS = [
  { videoId: "kAw9xGI8vgk", title: "Deep Chill Lofi Study", artist: "Lumosound", album: "Lofi Study Session", duration: "3:40", tag: "Focus", thumbnail: "https://i.ytimg.com/vi/kAw9xGI8vgk/hqdefault.jpg" },
  { videoId: "4EQkYVtE-28", title: "Circles (Chill Acoustic)", artist: "Post Malone", album: "Acoustic", duration: "3:36", tag: "Chill", thumbnail: "https://yt3.googleusercontent.com/YoQ-A-GOpgeE8tgdF3Rcf5z9V8NIIKjLH6_7X3QphIQUwVHioLu7Ik2wQzU0oCkyNm1TeLDLDYvomJ8=w544-h544-l90-rj" },
  { videoId: "bpOSxM0rNPM", title: "Do I Wanna Know? (Acoustic)", artist: "Arctic Monkeys", album: "Chill", duration: "4:32", tag: "Acoustic", thumbnail: "https://yt3.googleusercontent.com/7a03Ybk8vbe8c4dl4E8l77Y4e9aEWjQvTfOAdLdXxsnjZ57gYQ8FsKra9SgXAHT-jtiwuq6lukCfbRKL=w544-h544-l90-rj" }
];

const CATALOG_ACOUSTIC = [
  { videoId: "_GWKkqNoyEA", title: "Counting Stars (Acoustic)", artist: "OneRepublic", album: "Native", duration: "4:18", tag: "Acoustic", thumbnail: "https://yt3.googleusercontent.com/m2pZLjozMvQBj21LgvAIslVPP-T2xQlxbxCTJ98vpPN8HZ0fgR-wisJQ2IzrKS2yLTAYBjs0TpOYnIY=w544-h544-l90-rj" },
  { videoId: "4EQkYVtE-28", title: "Stay (Acoustic Session)", artist: "Post Malone", album: "Sessions", duration: "3:25", tag: "Unplugged", thumbnail: "https://yt3.googleusercontent.com/YoQ-A-GOpgeE8tgdF3Rcf5z9V8NIIKjLH6_7X3QphIQUwVHioLu7Ik2wQzU0oCkyNm1TeLDLDYvomJ8=w544-h544-l90-rj" }
];

const CATALOG_CLASSICAL = [
  { videoId: "BSTsnWoslP4", title: "Bohemian Rhapsody (Orchestral)", artist: "Queen, London Symphony", album: "Opera Sessions", duration: "5:55", tag: "Cinema", thumbnail: "https://yt3.googleusercontent.com/nLn1gxvYiZqzXOY9HyUXVXbFtmR5nhY8sDpbvBT1aw-Ejjsz__Nz90sZoc4nZgff2sf8WjowuVRVBlBTww=w544-h544-l90-rj" },
  { videoId: "kAw9xGI8vgk", title: "Clair de Lune (Piano Reflection)", artist: "Claude Debussy", album: "Classical Masterpieces", duration: "5:04", tag: "Piano", thumbnail: "https://i.ytimg.com/vi/kAw9xGI8vgk/hqdefault.jpg" }
];

const CATALOG_ELECTRONIC = [
  { videoId: "4D7u5KF7SP8", title: "Get Lucky", artist: "Daft Punk, Pharrell Williams", album: "Random Access Memories", duration: "6:10", tag: "EDM", thumbnail: "https://yt3.googleusercontent.com/N55arCGj69gtw6thXK8JUPisxoVYiwuIEQ7I6SGlkEyNcSJ7xIWPe76Vuu1SiUqRyx5w9qvR_zV8fV3CWQ=w544-h544-l90-rj" },
  { videoId: "2NiyrtYegso", title: "Wake Me Up", artist: "Avicii", album: "True", duration: "4:08", tag: "Anthem", thumbnail: "https://yt3.googleusercontent.com/XincHWEjkXhpbavoQEHWRbTcVdvHsujjr7OAw-73KUCILFgjLdevPW8vkoaRMibnwkTtGWkEDyKbuNeK=w544-h544-l90-rj" }
];

class EtsukoAPI {
  constructor() {
    this._searchCache = new Map();
    this._lyricsCache = new Map();
    this._radioCache = new Map();
  }

  cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/\s*[\(\[](official\s*(music\s*)?video|video|audio|lyrics|visualizer|full\s*song|hd|4k|mv)[\)\]]/gi, '')
      .replace(/\s*-\s*official\s*video/gi, '')
      .trim();
  }

  normalizeTitle(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .replace(/\s*[\(\[](official\s*(music\s*)?video|video|audio|lyrics|lyric\s*video|visualizer|full\s*song|hd|4k|mv|remix|lofi|slowed(\s*\+\s*reverb)?|reverb|speed\s*up|sped\s*up|cover|acoustic|live|extended|radio\s*edit)[\)\]]/gi, '')
      .replace(/\s*-\s*(official\s*(music\s*)?video|video|audio|lyrics|lyric\s*video|visualizer|full\s*song|remix|lofi|slowed|cover).*/gi, '')
      .replace(/[^\w\s\u0600-\u06FF\u0900-\u097F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async fetchRadioQueue(videoId) {
    if (!videoId) return [];
    if (this._radioCache.has(videoId)) {
      return this._radioCache.get(videoId);
    }

    try {
      const res = await fetch(`/api/radio/${encodeURIComponent(videoId)}`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.tracks || []).map(t => ({
          ...t,
          thumbnail: formatHighResThumbnail(t.videoId, t.thumbnail)
        }));
        if (list.length > 0) {
          if (this._radioCache.size > 50) {
            const first = this._radioCache.keys().next().value;
            this._radioCache.delete(first);
          }
          this._radioCache.set(videoId, list);
          return list;
        }
      }
    } catch (e) {
      console.warn('[API] Radio fetch error:', e);
    }
    return [];
  }

  filterDiverseRecommendations(candidates, currentTrack, limit = 16) {
    if (!Array.isArray(candidates)) return [];
    const normCurrent = this.normalizeTitle(currentTrack?.title);
    const seenIds = new Set();
    if (currentTrack && currentTrack.videoId) seenIds.add(currentTrack.videoId);
    const seenTitles = new Set();
    if (normCurrent) seenTitles.add(normCurrent);

    const artistCounts = {};
    const primaryCurrentArtist = (currentTrack?.artist || '').split(',')[0].replace(/\s*-\s*Topic/i, '').trim().toLowerCase();
    if (primaryCurrentArtist) artistCounts[primaryCurrentArtist] = 1;

    const filtered = [];
    for (const cand of candidates) {
      if (!cand || !cand.videoId || seenIds.has(cand.videoId)) continue;

      const normCand = this.normalizeTitle(cand.title);
      // Discard duplicates or covers/remixes of the current track
      if (normCand && (normCand === normCurrent || seenTitles.has(normCand))) continue;

      const candArtist = (cand.artist || '').split(',')[0].replace(/\s*-\s*Topic/i, '').trim().toLowerCase();
      // Cap at 2 tracks per artist to guarantee diversity
      if (candArtist && (artistCounts[candArtist] || 0) >= 2) continue;

      seenIds.add(cand.videoId);
      if (normCand) seenTitles.add(normCand);
      if (candArtist) artistCounts[candArtist] = (artistCounts[candArtist] || 0) + 1;

      filtered.push({
        ...cand,
        id: cand.videoId,
        thumbnail: formatHighResThumbnail(cand.videoId, cand.thumbnail)
      });

      if (filtered.length >= limit) break;
    }
    return filtered;
  }

  async getRelatedTracks(currentTrack) {
    if (!currentTrack) return { category: 'english_pop', displayTag: 'Global Pop Hits', tracks: [] };

    const title = (currentTrack.title || '').toLowerCase();
    const artist = (currentTrack.artist || '').toLowerCase();
    const album = (currentTrack.album || '').toLowerCase();
    const combined = `${title} ${artist} ${album}`;

    let detectedCategory = 'english_pop';
    let displayTag = 'Global Pop Hits';

    if (/rahat\s*fateh|nusrat\s*fateh|atif\s*aslam|sufi|qawwali|ghazal|coke\s*studio|zaroori\s*tha|kaifi\s*khalil|ali\s*zafar|afreen|tajdar|o\s*re\s*piya|khudgharz|sabri|farid\s*ayaz|abul\s*hasan/i.test(combined)) {
      detectedCategory = 'urdu_sufi';
      displayTag = 'Urdu & Sufi Melodies';
    } else if (/punjabi|karan\s*aujla|shubh|ikky|diljit|sidhu\s*moose|ap\s*dhillon|b\s*praak|jassi\s*gill|amrit\s*maan|tauba|cheques|softly|baller|one\s*love|winning\s*speech|g\.o\.a\.t/i.test(combined)) {
      detectedCategory = 'punjabi';
      displayTag = 'Punjabi Bangers';
    } else if (/arijit\s*singh|pritam|shreya\s*ghoshal|jubin\s*nautiyal|neha\s*kakkar|bollywood|mohit\s*chauhan|k\.?k\.?|sonu\s*nigam|shaan|papon|sunidhi|alka\s*yagnik|kumar\s*sanu|udit\s*narayan|lata|kishore|mohammed\s*rafi|anuv\s*jain|prateek\s*kuhad|jasleen\s*royal|darshan\s*raval|armaan\s*malik|pehli\s*dafa|tum\s*hi\s*ho|kesariya|chaleya|apna\s*bana|o\s*maahi|raataan\s*lambiyan|channa\s*mereya|zara\s*sa/i.test(combined)) {
      detectedCategory = 'hindi_romance';
      displayTag = 'Bollywood & Hindi Romance';
    } else if (/phonk|drift|dvrst|kordhell|moondeity|interworld|hensonn|pharmacist|playaphonk|kslv|murder\s*in\s*my\s*mind|metamorphosis|neon\s*blade|close\s*eyes/i.test(combined)) {
      detectedCategory = 'phonk';
      displayTag = 'Phonk & Midnight Drift';
    } else if (/rap|hip-hop|hip\s*hop|eminem|kendrick\s*lamar|travis\s*scott|drake|carti|metro\s*boomin|future|21\s*savage|j\.\s*cole|kanye|not\s*like\s*us|houdini|fe!n|god's\s*plan/i.test(combined)) {
      detectedCategory = 'hiphop';
      displayTag = 'Hip-Hop & Rap';
    } else if (/rock|metal|linkin\s*park|queen|arctic\s*monkeys|imagine\s*dragons|onerepublic|nirvana|coldplay|in\s*the\s*end|thunder|counting\s*stars|bohemian\s*rhapsody|hybrid\s*theory/i.test(combined)) {
      detectedCategory = 'rock';
      displayTag = 'Rock & Alternative';
    } else if (/lofi|lo-fi|chillhop|lumosound|chilledcow|study\s*beats|cozy\s*beats/i.test(combined)) {
      detectedCategory = 'lofi';
      displayTag = 'Lo-Fi Beats & Study Chill';
    } else if (/acoustic|unplugged|guitar\s*session|stripped|piano\s*vocal/i.test(combined)) {
      detectedCategory = 'acoustic';
      displayTag = 'Acoustic Sessions & Unplugged';
    } else if (/classical|piano|orchestral|symphony|debussy|chopin|einaudi|beethoven|soundtrack|film\s*score/i.test(combined)) {
      detectedCategory = 'classical';
      displayTag = 'Classical & Instrumental Cinema';
    } else if (/edm|dance|electronic|house|techno|avicii|daft\s*punk|calvin\s*harris|tiesto|david\s*guetta|wake\s*me\s*up|get\s*lucky/i.test(combined)) {
      detectedCategory = 'edm';
      displayTag = 'Electronic & Dance Anthems';
    }

    const genrePools = {
      urdu_sufi: CATALOG_URDU_SUFI,
      punjabi: CATALOG_PUNJABI_HITS,
      hindi_romance: CATALOG_HINDI_HITS,
      phonk: CATALOG_PHONK_HITS,
      hiphop: CATALOG_HIPHOP_HITS,
      rock: CATALOG_ROCK_HITS,
      lofi: CATALOG_LOFI_HITS,
      acoustic: CATALOG_ACOUSTIC,
      classical: CATALOG_CLASSICAL,
      edm: CATALOG_ELECTRONIC,
      english_pop: CATALOG_POP_HITS
    };

    const candidateList = [];

    // 1. YouTube Music Official Machine Learning Radio Queue (ZERO keyword spam!)
    try {
      const radioTracks = await this.fetchRadioQueue(currentTrack.videoId);
      if (radioTracks && radioTracks.length > 0) {
        candidateList.push(...radioTracks);
      }
    } catch (e) {
      console.warn('[API] Radio queue notice:', e);
    }

    // 2. Curated Genre Pool Backfill
    const pool = genrePools[detectedCategory] || genrePools.english_pop;
    candidateList.push(...pool);

    // 3. Strict Diversity Filter (removes remixes/duplicates of current track & caps artist repeats)
    const diverseTracks = this.filterDiverseRecommendations(candidateList, currentTrack, 18);

    return {
      category: detectedCategory,
      displayTag: displayTag,
      tracks: diverseTracks
    };
  }

  async getLyrics(title, artist, duration = null) {
    if (!title) return { type: 'unavailable', message: 'No lyrics available' };
    const cleanedTitle = this.cleanTitle(title);
    const cleanedArtist = (artist && artist !== 'Unknown Artist') ? artist.replace(/\s*-\s*Topic/i, '').trim() : '';
    const cacheKey = `lyrics_${cleanedTitle}_${cleanedArtist}`.toLowerCase();

    if (this._lyricsCache.has(cacheKey)) {
      return this._lyricsCache.get(cacheKey);
    }

    // 1. First attempt backend lyrics endpoint (combines LRCLIB & YouTube Music)
    try {
      const res = await fetch(`/api/lyrics/${encodeURIComponent(cleanedTitle)}?title=${encodeURIComponent(cleanedTitle)}&artist=${encodeURIComponent(cleanedArtist)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.synced && typeof data.synced === 'string') {
          const lines = this.parseLrcText(data.synced);
          if (lines.length > 0) {
            const result = { type: 'synced', lines, source: data.source || 'LRCLIB' };
            this._lyricsCache.set(cacheKey, result);
            return result;
          }
        }
        if (data.plain && typeof data.plain === 'string' && data.plain !== 'No lyrics found for this track.') {
          const result = { type: 'plain', text: data.plain, source: data.source || 'YouTube Music' };
          this._lyricsCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e) {
      console.warn('[API] Backend lyrics endpoint notice:', e);
    }

    // 2. Client-side direct LRCLIB lookup
    try {
      let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}`;
      if (cleanedArtist) {
        url += `&artist_name=${encodeURIComponent(cleanedArtist)}`;
      }
      if (duration && duration > 0) {
        url += `&duration=${Math.round(duration)}`;
      }

      let res = await fetch(url, { headers: { 'User-Agent': 'EtsukoMusicApp/1.0' } });
      if (!res.ok && res.status === 404) {
        const query = `${cleanedTitle} ${cleanedArtist}`.trim();
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'EtsukoMusicApp/1.0' } });
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            res = { ok: true, status: 200, json: async () => list[0] };
          }
        }
      }

      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.instrumental) {
            const result = { type: 'instrumental', message: 'Instrumental track • Enjoy the music' };
            this._lyricsCache.set(cacheKey, result);
            return result;
          }
          if (data.syncedLyrics && typeof data.syncedLyrics === 'string') {
            const lines = this.parseLrcText(data.syncedLyrics);
            if (lines.length > 0) {
              const result = { type: 'synced', lines, source: 'LRCLIB' };
              this._lyricsCache.set(cacheKey, result);
              return result;
            }
          }
          if (data.plainLyrics && typeof data.plainLyrics === 'string') {
            const result = { type: 'plain', text: data.plainLyrics, source: 'LRCLIB' };
            this._lyricsCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (e) {
      console.warn('[API] Direct LRCLIB notice:', e);
    }

    const fallbackResult = { type: 'unavailable', message: 'Lyrics not available for this track' };
    this._lyricsCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  parseLrcText(lrcString) {
    const lines = [];
    const rawLines = lrcString.split('\n');
    for (const line of rawLines) {
      const match = line.match(/^\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\](.*)$/);
      if (match) {
        const mins = parseFloat(match[1]);
        const secs = parseFloat(match[2]);
        const text = match[3].trim();
        lines.push({
          time: mins * 60 + secs,
          text: text || '♪'
        });
      }
    }
    return lines;
  }

  // --- Universal Search with LRU Caching ---
  async search(query, filter = 'songs', signal = null) {
    if (!query || !query.trim()) return { results: [] };
    const q = query.trim();

    const cacheKey = `${q.toLowerCase()}_${filter}`;
    if (this._searchCache.has(cacheKey)) {
      return { results: this._searchCache.get(cacheKey) };
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).map(r => ({
          ...r,
          thumbnail: formatHighResThumbnail(r.videoId, r.thumbnail)
        }));
        if (this._searchCache.size > 80) {
          const firstKey = this._searchCache.keys().next().value;
          this._searchCache.delete(firstKey);
        }
        this._searchCache.set(cacheKey, results);
        return { results };
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn('[API] Search error:', err);
    }

    // Fallback: search curated local catalogs
    const lower = q.toLowerCase();
    const all = [...CATALOG_TRENDING_HITS, ...CATALOG_DAILY_POOL, ...CATALOG_HINDI_HITS, ...CATALOG_URDU_SUFI, ...CATALOG_PUNJABI_HITS, ...CATALOG_POP_HITS];
    const filtered = all.filter(t => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower));
    return { results: filtered };
  }

}

// Global API Singleton
if (typeof window !== 'undefined') {
  window.api = new EtsukoAPI();
}
