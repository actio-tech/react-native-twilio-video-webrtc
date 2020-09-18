/**
 * Component for Twilio Video participant views.
 * <p>
 * Authors:
 * Jonathan Chang <slycoder@gmail.com>
 */

package com.actiotech.twiliovideorn;

import android.content.Context;
import android.util.Log;


public class TwilioRemotePreview extends RNVideoViewGroup {

    private static final String TAG = "TwilioRemotePreview";


    public TwilioRemotePreview(Context context, String trackSid) {
        super(context);
        Log.i("CustomTwilioVideoView", "Remote Prview Construct");
        Log.i("CustomTwilioVideoView", trackSid);


        TwilioVideoModule.registerPrimaryVideoView(this.getSurfaceViewRenderer(), trackSid);
    }
}
