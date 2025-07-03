const playButton = document.getElementById('playButton');
const playingIndicator = document.getElementById('playingIndicator');
const audioPlayer = document.getElementById('audioPlayer');

let isPlaying = false;

playButton.addEventListener('click', () => {
    if (isPlaying) {
        audioPlayer.pause();
        playButton.textContent = 'Play';
        playingIndicator.classList.add('hidden');
    } else {
        audioPlayer.play();
        playButton.textContent = 'Pause';
        playingIndicator.classList.remove('hidden');
    }
    isPlaying = !isPlaying;
});

// Optional: Update button text if audio finishes playing on its own
// (though this example uses loop, so it might not be strictly necessary)
audioPlayer.addEventListener('ended', () => {
    if (isPlaying) { // Only update if it was playing and ended naturally
        playButton.textContent = 'Play';
        playingIndicator.classList.add('hidden');
        isPlaying = false;
    }
});

// Handle potential errors during audio loading or playback
audioPlayer.addEventListener('error', (e) => {
    console.error('Error with audio player:', e);
    playingIndicator.textContent = 'Error loading audio.';
    playingIndicator.classList.remove('hidden');
    playingIndicator.style.color = 'red';
    playButton.disabled = true; // Disable button if audio fails
});
