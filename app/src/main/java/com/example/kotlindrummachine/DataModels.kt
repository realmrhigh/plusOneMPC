package com.example.kotlindrummachine

import kotlinx.serialization.Serializable

// Placeholder R class for compilation. In a real build, this is generated.
object R_DataModels {
    object raw {
        const val kick = 0 // Placeholder
        const val snare = 1 // Placeholder
        const val metronome_high = 2 // Placeholder for metronome_high.wav
        const val metronome_low = 3  // Placeholder for metronome_low.wav
    }
}

@Serializable
data class Sample(val id: String, val name: String, val resourceId: Int)

// Pad now includes volume and pitch
@Serializable
data class Pad(
    val id: Int,
    var sampleId: String?,
    val volume: Float = 1.0f, // Default volume
    val pitch: Float = 0.0f   // Default pitch (in semitones, 0.0f is no change)
)

@Serializable
data class Track(val padId: Int, val steps: List<Boolean> = List(16) { false })

@Serializable
data class Pattern(val id: Int, val name: String, val tracks: List<Track> = listOf())

// PadSettings for storing complete pad configuration in a DrumKit
@Serializable
data class PadSettings(
    val sampleId: String?,
    val volume: Float = 1.0f,
    val pitch: Float = 0.0f
)

// DrumKit now stores PadSettings
@Serializable
data class DrumKit(
    val id: String,
    val name: String,
    val padSettings: Map<Int, PadSettings> // Map of Pad ID to its full settings
)
