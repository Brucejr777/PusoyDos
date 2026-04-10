package com.pusoy.solver.ui

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import com.pusoy.solver.R
import com.pusoy.solver.databinding.OverlayWindowBinding

/**
 * Custom view for the card suggestion overlay window.
 * Supports drag-to-move functionality and click-to-close.
 *
 * TODO: Update text dynamically from solver
 * TODO: Add visual indicators for detected cards
 * TODO: Animate suggestion transitions
 */
class CardOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private var binding: OverlayWindowBinding
    private var onCloseListener: (() -> Unit)? = null

    // Drag state
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var layoutParams: LayoutParams? = null

    init {
        binding = OverlayWindowBinding.inflate(context.getSystemService(Context.LAYOUT_INFLATER_SERVICE) as android.view.LayoutInflater, this, true)

        setupCloseButton()
        setupDragToMove()
    }

    /**
     * Sets the suggestion text displayed in the overlay.
     * TODO: Update text dynamically from solver
     */
    fun setSuggestionText(text: String) {
        binding.tvSuggestion.text = text
    }

    /**
     * Sets the callback invoked when the close button is tapped.
     */
    fun setOnCloseListener(listener: () -> Unit) {
        onCloseListener = listener
    }

    private fun setupCloseButton() {
        binding.btnClose.setOnClickListener {
            onCloseListener?.invoke()
            // Hide the view (service handles removal from WindowManager)
            visibility = View.GONE
        }
    }

    private fun setupDragToMove() {
        // Main container touch listener for dragging
        binding.rootContainer.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams?.x ?: 0
                    initialY = layoutParams?.y ?: 0
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    layoutParams?.apply {
                        x = initialX + (event.rawX - initialTouchX).toInt()
                        y = initialY + (event.rawY - initialTouchY).toInt()
                    }
                    // Request layout update via parent
                    requestLayout()
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Updates the layout parameters from the parent WindowManager.
     * Call this after the view is added to WindowManager.
     */
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        layoutParams = this.layoutParams as? LayoutParams
    }
}
