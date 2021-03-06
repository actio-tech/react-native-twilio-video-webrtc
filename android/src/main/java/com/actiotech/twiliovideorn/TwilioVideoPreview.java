/**
 * Component for Twilio Video local views.
 * <p>
 * Authors:
 * Jonathan Chang <slycoder@gmail.com>
 */

package com.actiotech.twiliovideorn;

import android.content.Context;


public class TwilioVideoPreview extends RNVideoViewGroup {

    private static final String TAG = "TwilioVideoPreview";

    public TwilioVideoPreview(Context context) {
        super(context);
        TwilioVideoModule.registerThumbnailVideoView(this.getSurfaceViewRenderer());
        this.getSurfaceViewRenderer().applyZOrder(true);
    }
}
