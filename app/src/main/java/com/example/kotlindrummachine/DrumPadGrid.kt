package com.example.kotlindrummachine

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
// import androidx.compose.material.Button // Unused in the final version
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.RoundedCornerShape

@Composable
fun DrumPadGrid(
    pads: List<Pad>,
    onPadClick: (Pad) -> Unit,
    onPadLongClick: (Pad) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        contentPadding = PaddingValues(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        items(pads.size) { index ->
            val pad = pads[index]
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(
                        MaterialTheme.colors.primary.copy(
                            alpha = if (pad.sampleId != null) 1.0f else 0.3f
                        ),
                        shape = RoundedCornerShape(8.dp)
                    )
                    .border(
                        BorderStroke(1.dp, Color.DarkGray.copy(alpha = 0.7f)),
                        shape = RoundedCornerShape(8.dp)
                    )
                    .pointerInput(pad) {
                        detectTapGestures(
                            onTap = { onPadClick(pad) },
                            onLongPress = { onPadLongClick(pad) }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Pad ${pad.id}",
                        color = MaterialTheme.colors.onPrimary
                    )
                    pad.sampleId?.let {
                        Text(
                            text = it.take(4), // Display first 4 chars of sampleId
                            style = MaterialTheme.typography.caption,
                            color = MaterialTheme.colors.onPrimary.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}
