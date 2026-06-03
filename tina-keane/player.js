/*!
 *  Howler.js Audio Player Demo
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

// Cache references to DOM elements.
var elms = ['band', 'track', 'timer', 'duration', 'bar', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'volumeBtn', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn'];
elms.forEach(function(elm) {
  window[elm] = document.getElementById(elm);
});

/**
 * Player class containing the state of our playlist and where we are in it.
 * Includes all methods for playing, skipping, updating the display, etc.
 * @param {Array} playlist Array of objects with playlist song details ({title, file, howl}).
 */
var Player = function(playlist) {
  this.playlist = playlist;
  this.index = 0;

  // Display the title of the first track.
  // track.innerHTML = playlist[0].band + ' - ' + playlist[0].title;

  // Setup the playlist display.
  let band = '';
  playlist.forEach(function(song) {
    if (band !== song.band) {
      const bandDiv = document.createElement('div');
      if (band !== '') {
        bandDiv.style.marginTop = '.5em';
      }
      bandDiv.className = 'list-band';
      bandDiv.innerHTML = song.band;
      list.appendChild(bandDiv);
      band = song.band;
    }
    var div = document.createElement('div');
    div.className = 'list-song';
    div.innerHTML = song.title;
    div.onclick = function() {
      player.skipTo(playlist.indexOf(song));
    };
    list.appendChild(div);
  });
};
Player.prototype = {
  /**
   * Play a song in the playlist.
   * @param  {Number} index Index of the song in the playlist (leave empty to play the first or current).
   */
  play: function(index) {
    var self = this;
    var sound;

    index = typeof index === 'number' ? index : self.index;
    var data = self.playlist[index];

    // If we already loaded this track, use the current one.
    // Otherwise, setup and load a new Howl.
    if (data.howl) {
      sound = data.howl;
    } else {
      sound = data.howl = new Howl({
        src: ['./' + data.file],
        html5: true, // Force to HTML5 so that the audio can stream in (best for large files).
        onplay: function() {
          // Display the duration.
          duration.innerHTML = self.formatTime(Math.round(sound.duration()));

          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));
          pauseBtn.style.display = 'block';
        },
        onload: function() {
          loading.style.display = 'none';
        },
        onend: function() {
          self.skip('next');
        },
        onpause: function() {
        },
        onstop: function() {
        },
        onseek: function() {
          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));
        }
      });
    }

    // Begin playing the sound.
    sound.play();

    // Update the track display.
    band.innerHTML = data.band;
    track.innerHTML = data.title;

    // Show the pause button.
    if (sound.state() === 'loaded') {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      loading.style.display = 'block';
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
    }

    // Keep track of the index we are currently playing.
    self.index = index;
  },

  /**
   * Pause the currently playing track.
   */
  pause: function() {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Puase the sound.
    sound.pause();

    // Show the play button.
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },

  /**
   * Skip to the next or previous track.
   * @param  {String} direction 'next' or 'prev'.
   */
  skip: function(direction) {
    var self = this;

    // Get the next track based on the direction of the track.
    var index = 0;
    if (direction === 'prev') {
      index = self.index - 1;
      if (index < 0) {
        index = self.playlist.length - 1;
      }
    } else {
      index = self.index + 1;
      if (index >= self.playlist.length) {
        index = 0;
      }
    }

    self.skipTo(index);
  },

  /**
   * Skip to a specific track based on its playlist index.
   * @param  {Number} index Index in the playlist.
   */
  skipTo: function(index) {
    var self = this;

    // Stop the current track.
    if (self.playlist[self.index].howl) {
      self.playlist[self.index].howl.stop();
    }

    // Play the new track.
    self.play(index);
  },

  /**
   * Set the volume and update the volume slider display.
   * @param  {Number} val Volume between 0 and 1.
   */
  volume: function(val) {
    var self = this;

    // Update the global volume (affecting all Howls).
    Howler.volume(val);

    // Update the display on the slider.
    var barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  },

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} per Percentage through the song to skip.
   */
  seek: function(per) {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Convert the percent into a seek position.
    if (sound.playing()) {
      sound.seek(sound.duration() * per);
    }
  },

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  step: function() {
    var self = this;

    // Get the Howl we want to manipulate.
    var sound = self.playlist[self.index].howl;

    // Determine our current seek position.
    var seek = sound.seek() || 0;
    
    timer.innerHTML = self.formatTime(Math.round(seek));
    bar.style.width = ((seek / sound.duration()) || 0) * (document.body.offsetWidth - 110) + 'px';
    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },

  /**
   * Toggle the playlist display on/off.
   */
  togglePlaylist: function() {
    var self = this;
    var display = (playlist.style.display !== 'none') ? 'none' : 'block';
    const oposite = display === 'block' ? 'none' : 'block';
    setTimeout(function() {
      playlist.style.display = display;
      const player = [...document.getElementsByClassName('player')];
      player.forEach(elem => {
        elem.style.display = oposite;
      });
    }, (display === 'block') ? 0 : 500);
    playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  /**
   * Toggle the volume display on/off.
   */
  toggleVolume: function() {
    var self = this;
    var display = (volume.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      volume.style.display = display;
    }, (display === 'block') ? 0 : 500);
    volume.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  /**
   * Format the time from seconds to M:SS.
   * @param  {Number} secs Seconds to format.
   * @return {String}      Formatted time.
   */
  formatTime: function(secs) {
    var minutes = Math.floor(secs / 60) || 0;
    var seconds = (secs - minutes * 60) || 0;

    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
};

// Setup our new audio player class and pass it the playlist.
var player = new Player([
  {
    "band": "Tina Keane",
    "title": "No Guarantees",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20No%20Guarantees.mp3\r",
    "howl": null
  },
  {
    "band": "Tina Keane",
    "title": "Coming Back for More",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20Coming%20Back%20For%20More.mp3\r",
    "howl": null
  },
  {
    "band": "Tina Keane",
    "title": "Now I Understand",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20Now%20I%20Understand.mp3\r",
    "howl": null
  },
  {
    "band": "Tina Keane",
    "title": "Can't Stop Thinking",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20Can't%20Stop%20Thinking.mp3\r",
    "howl": null
  },
  {
    "band": "Tina Keane",
    "title": "Me Against You",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20Me%20Against%20You.mp3\r",
    "howl": null
  },
  {
    "band": "Tina Keane",
    "title": "Moving Forward",
    "year": "2004",
    "songWriter": "Tina Keane",
    "leadVocals": "Tina Keane",
    "guitar": "Tina Keane",
    "bass": "Tina Keane",
    "drums": "Tina Keane",
    "backupVocals": "Tina Keane",
    "file": "mp3/Tina%20Keane%20-%20Moving%20Forward.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "Moving In Circles",
    "year": "",
    "songWriter": "",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20Moving%20In%20Circles.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "How Am I to Blame",
    "year": "",
    "songWriter": "",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20How%20Am%20I%20to%20Blame.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "Seasons Changing",
    "year": "",
    "songWriter": "Gina Devito",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20Seasons%20Changing.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "Parallel Lines",
    "year": "",
    "songWriter": "",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20Parallel%20Lines.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "Shades of Blue",
    "year": "",
    "songWriter": "",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20Shades%20of%20Blue.mp3\r",
    "howl": null
  },
  {
    "band": "Siren Song",
    "title": "We’ll Never Know",
    "year": "",
    "songWriter": "",
    "leadVocals": "",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Siren%20Song%20-%20We'll%20Never%20Know.mp3\r",
    "howl": null
  },
  {
    "band": "Oh Mr. Grant!",
    "title": "She Sells Sanctuary",
    "year": "",
    "songWriter": "The Cult (cover)",
    "leadVocals": "Melanie Fallon",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Oh%20Mr.%20Grant!%20-%20She%20Sells%20Sanctuary.mp3\r",
    "howl": null
  },
  {
    "band": "Oh Mr. Grant!",
    "title": "Run and Hide",
    "year": "",
    "songWriter": "Gina Devito",
    "leadVocals": "Melanie Fallon",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Oh%20Mr.%20Grant%20-%20Run%20and%20Hide.mp3\r",
    "howl": null
  },
  {
    "band": "Oh Mr. Grant!",
    "title": "The Chosen One",
    "year": "",
    "songWriter": "Tina Keane",
    "leadVocals": "Melanie Fallon",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Oh%20Mr.%20Grant!%20-%20The%20Chosen%20One.mp3\r",
    "howl": null
  },
  {
    "band": "Oh Mr. Grant!",
    "title": "Let Me In",
    "year": "",
    "songWriter": "",
    "leadVocals": "Melanie Fallon",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Oh%20Mr.%20Grant!%20-%20Let%20Me%20In.mp3\r",
    "howl": null
  },
  {
    "band": "Oh Mr. Grant!",
    "title": "Now I Understand",
    "year": "",
    "songWriter": "Tina Keane",
    "leadVocals": "Melanie Fallon",
    "guitar": "Tina Keane",
    "bass": "Gina Devito",
    "drums": "",
    "backupVocals": "",
    "file": "mp3/Oh%20Mr%20%20Grant!%20%20%20Now%20I%20Understand.mp3\r",
    "howl": null
  },
  {
    "band": "Yellowfin",
    "title": "Bitter Bliss",
    "year": "",
    "songWriter": "Tina Keane",
    "leadVocals": "Stacy Lee Raddatz",
    "guitar": "Tina Keane",
    "bass": "Scott Selig",
    "drums": "Joey Hummel",
    "backupVocals": "",
    "file": "mp3/Yellowfin%20-%20Bitter%20Bliss.mp3\r",
    "howl": null
  },
  {
    "band": "Yellowfin",
    "title": "Hasty",
    "year": "",
    "songWriter": "Tina Keane",
    "leadVocals": "Stacy Lee Raddatz",
    "guitar": "Tina Keane",
    "bass": "Scott Selig",
    "drums": "Joey Hummel",
    "backupVocals": "",
    "file": "mp3/Yellowfin%20-%20Hasty.mp3\r",
    "howl": null
  },
  {
    "band": "Yellowfin",
    "title": "Slow",
    "year": "",
    "songWriter": "Tina Keane",
    "leadVocals": "Stacy Lee Raddatz",
    "guitar": "Tina Keane",
    "bass": "Scott Selig",
    "drums": "Joey Hummel",
    "backupVocals": "",
    "file": "mp3/Yellowfin%20-%20Slow.mp3\r",
    "howl": null
  },
  {
    "band": "Yellowfin",
    "title": "Drive Cars",
    "year": "",
    "songWriter": "",
    "leadVocals": "Stacy Lee Raddatz",
    "guitar": "Tina Keane",
    "bass": "Scott Selig",
    "drums": "Joey Hummel",
    "backupVocals": "",
    "file": "mp3/Yellowfin%20-%20Drive%20Cars.mp3",
    "howl": null
  }
]);

// Bind our player controls.
playBtn.addEventListener('click', function() {
  player.play();
});
pauseBtn.addEventListener('click', function() {
  player.pause();
});
prevBtn.addEventListener('click', function() {
  player.skip('prev');
});
nextBtn.addEventListener('click', function() {
  player.skip('next');
});
playlistBtn.addEventListener('click', function() {
  player.togglePlaylist();
});
playlist.addEventListener('click', function() {
  player.togglePlaylist();
});
volumeBtn.addEventListener('click', function() {
  player.toggleVolume();
});
volume.addEventListener('click', function() {
  player.toggleVolume();
});

// Setup the event listeners to enable dragging of volume slider.
barEmpty.addEventListener('click', function(event) {
  var per = event.layerX / parseFloat(barEmpty.scrollWidth);
  player.volume(per);
});
sliderBtn.addEventListener('mousedown', function() {
  window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function() {
  window.sliderDown = true;
});
volume.addEventListener('mouseup', function() {
  window.sliderDown = false;
});
volume.addEventListener('touchend', function() {
  window.sliderDown = false;
});

var move = function(event) {
  if (window.sliderDown) {
    var x = event.clientX || event.touches[0].clientX;
    var startX = window.innerWidth * 0.05;
    var layerX = x - startX;
    var per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
    player.volume(per);
  }
};

volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);
