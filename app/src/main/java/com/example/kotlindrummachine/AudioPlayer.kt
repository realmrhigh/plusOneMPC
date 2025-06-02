package com.example.kotlindrummachine

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.util.Log
import kotlin.math.pow

// kotlin.math.pow import removed as we are using java.lang.Math.pow

class AudioPlayer(private val context: Context) {

    private val soundPool: SoundPool
    private val soundMap: HashMap<String, Int> = HashMap()

    init {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(16)
            .setAudioAttributes(audioAttributes)
            .build()
    }

    fun loadSample(sampleName: String, resourceId: Int): Int {
        val soundId = soundPool.load(context, resourceId, 1)
        soundMap[sampleName] = soundId
        Log.d("AudioPlayer", "Loaded sample $sampleName with ID $soundId and resource ID $resourceId")
        return soundId
    }

    fun loadSamples() {
        loadSample("kick", R.raw.kick) // These use the local placeholder R
        loadSample("snare", R.raw.snare) // These use the local placeholder R
        // For metronome sounds, explicitly use R_DataModels from the DataModels.kt file
        loadSample("metronome_high", R_DataModels.raw.metronome_high)
        loadSample("metronome_low", R_DataModels.raw.metronome_low)
    }

    fun playSound(sampleName: String, volume: Float = 1.0f, pitch: Float = 0.0f) {
        val soundId = soundMap[sampleName]
        if (soundId != null) {
            // Calculate rate from pitch (semitones)
            // 2^(pitch/12) gives the rate multiplier. e.g., +12 semitones = 2x rate, -12 semitones = 0.5x rate
            val rate = 2.0.pow((pitch / 12.0f).toDouble()).toFloat().coerceIn(0.5f, 2.0f) // Clamp rate
            val clampedVolume = volume.coerceIn(0.0f, 1.0f) // Clamp volume

            soundPool.play(soundId, clampedVolume, clampedVolume, 0, 0, rate)
            Log.d("AudioPlayer", "Playing sound $sampleName (ID $soundId), Vol: $clampedVolume, Pitch (Rate): $rate")
        } else {
            Log.w("AudioPlayer", "Sound sample not found: $sampleName")
        }
    }

    fun release() {
        soundPool.release()
        soundMap.clear()
        Log.d("AudioPlayer", "SoundPool released")
    }
}

// Placeholder R class for compilation. In a real build, this is generated.
object R {
    object raw {
        const val kick = 0 // Placeholder, will be replaced by actual resource ID
        const val snare = 1 // Placeholder, will be replaced by actual resource ID
    }
}
