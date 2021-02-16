/**
 * Component to orchestrate the Twilio Video connection and the various video
 * views.
 * <p>
 * Authors:
 * Ralph Pina <ralph.pina@gmail.com>
 * Jonathan Chang <slycoder@gmail.com>
 */
package com.actiotech.twiliovideorn;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

import android.content.Context;
import android.media.AudioManager;
import android.os.Handler;
import android.os.HandlerThread;

import androidx.annotation.MainThread;
import androidx.annotation.NonNull;
import androidx.annotation.StringDef;

import android.os.Looper;
import android.util.Log;
import android.util.Pair;
import android.view.View;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.twilio.audioswitch.AudioDevice;
import com.twilio.audioswitch.AudioSwitch;
import com.twilio.video.AudioTrackPublication;
import com.twilio.video.BaseTrackStats;
import com.twilio.video.CameraCapturer;
import com.twilio.video.ConnectOptions;
import com.twilio.video.LocalAudioTrack;
import com.twilio.video.LocalAudioTrackStats;
import com.twilio.video.LocalParticipant;
import com.twilio.video.LocalTrackStats;
import com.twilio.video.LocalVideoTrack;
import com.twilio.video.LocalVideoTrackStats;
import com.twilio.video.Participant;
import com.twilio.video.RemoteAudioTrack;
import com.twilio.video.RemoteAudioTrackPublication;
import com.twilio.video.RemoteAudioTrackStats;
import com.twilio.video.LocalDataTrack;
import com.twilio.video.RemoteDataTrack;
import com.twilio.video.RemoteDataTrackPublication;
import com.twilio.video.RemoteParticipant;
import com.twilio.video.RemoteTrackStats;
import com.twilio.video.RemoteVideoTrack;
import com.twilio.video.RemoteVideoTrackPublication;
import com.twilio.video.RemoteVideoTrackStats;
import com.twilio.video.Room;
import com.twilio.video.StatsListener;
import com.twilio.video.StatsReport;
import com.twilio.video.TrackPublication;
import com.twilio.video.TwilioException;
import com.twilio.video.Video;
import com.twilio.video.VideoConstraints;
import com.twilio.video.VideoDimensions;

import org.webrtc.voiceengine.WebRtcAudioManager;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.Collections;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

import kotlin.Unit;

import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_AUDIO_CHANGED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_CAMERA_SWITCHED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_CONNECTED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_CONNECT_FAILURE;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_DISCONNECTED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_DATATRACK_MESSAGE_RECEIVED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_ADDED_DATA_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_ADDED_AUDIO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_ADDED_VIDEO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_CONNECTED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_DISABLED_AUDIO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_DISABLED_VIDEO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_DISCONNECTED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_ENABLED_AUDIO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_ENABLED_VIDEO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_AUDIO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_DATA_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_VIDEO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_REMOVED_DATA_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_REMOVED_AUDIO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_PARTICIPANT_REMOVED_VIDEO_TRACK;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_STATS_RECEIVED;
import static com.actiotech.twiliovideorn.TwilioVideoModule.Events.ON_VIDEO_CHANGED;

public class TwilioVideoModule extends ReactContextBaseJavaModule implements LifecycleEventListener, StatsListener {
    private static final String TAG = "TwilioVideoModule";
    private static final String DATA_TRACK_MESSAGE_THREAD_NAME = "DataTrackMessages";
    private boolean enableRemoteAudio = false;

    @Retention(RetentionPolicy.SOURCE)
    @StringDef({Events.ON_CAMERA_SWITCHED,
            Events.ON_VIDEO_CHANGED,
            Events.ON_AUDIO_CHANGED,
            Events.ON_CONNECTED,
            Events.ON_CONNECT_FAILURE,
            Events.ON_DISCONNECTED,
            Events.ON_PARTICIPANT_CONNECTED,
            Events.ON_PARTICIPANT_DISCONNECTED,
            Events.ON_PARTICIPANT_ADDED_VIDEO_TRACK,
            Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_VIDEO_TRACK,
            Events.ON_DATATRACK_MESSAGE_RECEIVED,
            Events.ON_PARTICIPANT_ADDED_DATA_TRACK,
            Events.ON_PARTICIPANT_REMOVED_DATA_TRACK,
            Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_DATA_TRACK,
            Events.ON_PARTICIPANT_REMOVED_VIDEO_TRACK,
            Events.ON_PARTICIPANT_ADDED_AUDIO_TRACK,
            Events.ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_AUDIO_TRACK,
            Events.ON_PARTICIPANT_REMOVED_AUDIO_TRACK,
            Events.ON_PARTICIPANT_ENABLED_VIDEO_TRACK,
            Events.ON_PARTICIPANT_DISABLED_VIDEO_TRACK,
            Events.ON_PARTICIPANT_ENABLED_AUDIO_TRACK,
            Events.ON_PARTICIPANT_DISABLED_AUDIO_TRACK,
            Events.ON_STATS_RECEIVED})
    public @interface Events {
        String ON_CAMERA_SWITCHED = "TwilioVideo.onCameraSwitched";
        String ON_VIDEO_CHANGED = "TwilioVideo.onVideoChanged";
        String ON_AUDIO_CHANGED = "TwilioVideo.onAudioChanged";
        String ON_CONNECTED = "TwilioVideo.onRoomDidConnect";
        String ON_CONNECT_FAILURE = "TwilioVideo.onRoomDidFailToConnect";
        String ON_DISCONNECTED = "TwilioVideo.onRoomDidDisconnect";
        String ON_PARTICIPANT_CONNECTED = "TwilioVideo.onRoomParticipantDidConnect";
        String ON_PARTICIPANT_DISCONNECTED = "TwilioVideo.onRoomParticipantDidDisconnect";
        String ON_DATATRACK_MESSAGE_RECEIVED = "TwilioVideo.onDataTrackMessageReceived";
        String ON_PARTICIPANT_ADDED_DATA_TRACK = "TwilioVideo.onParticipantAddedDataTrack";
        String ON_PARTICIPANT_REMOVED_DATA_TRACK = "TwilioVideo.onParticipantRemovedDataTrack";
        String ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_DATA_TRACK = "TwilioVideo.onParticipantFailedToSubscribeToDataTrack";
        String ON_PARTICIPANT_ADDED_VIDEO_TRACK = "TwilioVideo.onParticipantAddedVideoTrack";
        String ON_PARTICIPANT_REMOVED_VIDEO_TRACK = "TwilioVideo.onParticipantRemovedVideoTrack";
        String ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_VIDEO_TRACK = "TwilioVideo.onParticipantFailedToSubscribeToVideoTrack";
        String ON_PARTICIPANT_ADDED_AUDIO_TRACK = "TwilioVideo.onParticipantAddedAudioTrack";
        String ON_PARTICIPANT_REMOVED_AUDIO_TRACK = "TwilioVideo.onParticipantRemovedAudioTrack";
        String ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_AUDIO_TRACK = "TwilioVideo.onParticipantFailedToSubscribeToAudioTrack";
        String ON_PARTICIPANT_ENABLED_VIDEO_TRACK = "TwilioVideo.onParticipantEnabledVideoTrack";
        String ON_PARTICIPANT_DISABLED_VIDEO_TRACK = "TwilioVideo.onParticipantDisabledVideoTrack";
        String ON_PARTICIPANT_ENABLED_AUDIO_TRACK = "TwilioVideo.onParticipantEnabledAudioTrack";
        String ON_PARTICIPANT_DISABLED_AUDIO_TRACK = "TwilioVideo.onParticipantDisabledAudioTrack";
        String ON_STATS_RECEIVED = "TwilioVideo.onStatsReceived";
    }

    private final ReactContext context;
    private DeviceEventManagerModule.RCTDeviceEventEmitter eventEmitter;

    /*
     * A Room represents communication between the client and one or more participants.
     */
    private static Room room;
    private String roomName = null;
    private String accessToken = null;
    private LocalParticipant localParticipant;

    /*
     * A VideoView receives frames from a local or remote video track and renders them
     * to an associated view.
     */
    private static PatchedVideoView thumbnailVideoView;
    private static LocalVideoTrack localVideoTrack;

    private static CameraCapturer cameraCapturer;
    private LocalAudioTrack localAudioTrack;
    private AudioManager audioManager;
    private AudioSwitch audioSwitch;
    private boolean disconnectedFromOnDestroy;

    // Dedicated thread and handler for messages received from a RemoteDataTrack
    private HandlerThread dataTrackMessageThread;
    private Handler dataTrackMessageThreadHandler;

    private LocalDataTrack localDataTrack;

    // Map used to map remote data tracks to remote participants
    private final Map<String, Pair<RemoteDataTrack, RemoteParticipant>> remoteDataTrackMap =
            new HashMap<>();

    private class RequestStatsTask extends TimerTask {
        @Override
        public void run() {
            if (room != null) {
                room.getStats(TwilioVideoModule.this);
            }
        }
    }

    private Timer requestStatsTimer = new Timer();

    private final Handler mainHandler;

    @NonNull
    @Override
    public String getName() {
        return "TwilioModule";
    }

    private ReactContext getContext() {
        return context;
    }

    public TwilioVideoModule(ReactApplicationContext context) {
        super(context);
        this.context = context;

        // add lifecycle for onResume and on onPause
        context.addLifecycleEventListener(this);

        /*
         * Enable changing the volume using the up/down keys during a conversation
         */
        if (context.getCurrentActivity() != null) {
            context.getCurrentActivity().setVolumeControlStream(AudioManager.STREAM_VOICE_CALL);
        }
        /*
         * Needed for setting/abandoning audio focus during call
         */
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        List<Class<? extends AudioDevice>> preferredDevicesList = Arrays.asList(
            AudioDevice.BluetoothHeadset.class,
            AudioDevice.WiredHeadset.class,
            AudioDevice.Speakerphone.class
        );
        audioSwitch = new AudioSwitch(context, false, (int a) -> {}, preferredDevicesList);

        // Create the local data track
        // localDataTrack = LocalDataTrack.create(this);
        localDataTrack = LocalDataTrack.create(context);

        mainHandler = new Handler(Looper.getMainLooper());
    }

    @Override
    public void initialize() {
        super.initialize();

        this.eventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class);
    }

    // ===== SETUP =================================================================================

    private VideoConstraints buildVideoConstraints() {
        return new VideoConstraints.Builder()
                .minVideoDimensions(VideoDimensions.CIF_VIDEO_DIMENSIONS)
                .maxVideoDimensions(VideoDimensions.HD_720P_VIDEO_DIMENSIONS)
                .minFps(5)
                .maxFps(24)
                .build();
    }

    private CameraCapturer createCameraCaputer(Context context, CameraCapturer.CameraSource cameraSource) {
        CameraCapturer newCameraCapturer = null;
        try {
            newCameraCapturer = new CameraCapturer(
                    context,
                    cameraSource,
                    new CameraCapturer.Listener() {
                        @Override
                        public void onFirstFrameAvailable() {
                        }

                        @Override
                        public void onCameraSwitched() {
                            setThumbnailMirror();
                        }

                        @Override
                        public void onError(int i) {
                            Log.i("CustomTwilioVideoView", "Error getting camera");
                        }
                    }
            );
            return newCameraCapturer;
        } catch (Exception e) {
            return null;
        }
    }

    private boolean createLocalVideo(boolean enableVideo) {
        // Share your camera
        cameraCapturer = this.createCameraCaputer(getContext(), CameraCapturer.CameraSource.FRONT_CAMERA);
        if (cameraCapturer == null) {
            cameraCapturer = this.createCameraCaputer(getContext(), CameraCapturer.CameraSource.BACK_CAMERA);
        }
        if (cameraCapturer == null) {
            WritableMap event = new WritableNativeMap();
            event.putString("error", "No camera is supported on this device");
            pushEvent(ON_CONNECT_FAILURE, event);
            return false;
        }

        if (cameraCapturer.getSupportedFormats().size() > 0) {
            localVideoTrack = LocalVideoTrack.create(getContext(), enableVideo, cameraCapturer, buildVideoConstraints());
            if (thumbnailVideoView != null && localVideoTrack != null) {
                localVideoTrack.addRenderer(thumbnailVideoView);
            }
            setThumbnailMirror();
        }
        return true;
    }

    // ===== LIFECYCLE EVENTS ======================================================================


    @Override
    public void onHostResume() {
        /*
         * In case it wasn't set.
         */
        if (context.getCurrentActivity() != null) {
            /*
             * If the local video track was released when the app was put in the background, recreate.
             */
            if (cameraCapturer != null && localVideoTrack == null) {
                localVideoTrack = LocalVideoTrack.create(getContext(), true, cameraCapturer, buildVideoConstraints());
            }

            if (localVideoTrack != null) {
                if (thumbnailVideoView != null) {
                    localVideoTrack.addRenderer(thumbnailVideoView);
                }

                /*
                 * If connected to a Room then share the local video track.
                 */
                if (localParticipant != null) {
                    localParticipant.publishTrack(localVideoTrack);
                }
            }

            context.getCurrentActivity().setVolumeControlStream(AudioManager.STREAM_VOICE_CALL);

        }
    }

    @Override
    public void onHostPause() {
        /*
         * Release the local video track before going in the background. This ensures that the
         * camera can be used by other applications while this app is in the background.
         */
        if (localVideoTrack != null) {
            /*
             * If this local video track is being shared in a Room, remove from local
             * participant before releasing the video track. Participants will be notified that
             * the track has been removed.
             */
            if (localParticipant != null) {
                localParticipant.unpublishTrack(localVideoTrack);
            }

            localVideoTrack.release();
            localVideoTrack = null;
        }
    }

    @Override
    public void onHostDestroy() {
        /*
         * Always disconnect from the room before leaving the Activity to
         * ensure any memory allocated to the Room resource is freed.
         */
        cancelStatsRequest();

        if (room != null && room.getState() != Room.State.DISCONNECTED) {
            room.disconnect();
            disconnectedFromOnDestroy = true;
        }

        /*
         * Release the local media ensuring any memory allocated to audio or video is freed.
         */
        if (localVideoTrack != null) {
            localVideoTrack.release();
            localVideoTrack = null;
        }

        if (localAudioTrack != null) {
            localAudioTrack.release();
            localAudioTrack = null;
        }

        quitDataTrackThread();
    }

    public void releaseResource() {
        context.removeLifecycleEventListener(this);
        room = null;
        localVideoTrack = null;
        thumbnailVideoView = null;
        cameraCapturer = null;
    }

    // ====== CONNECTING ===========================================================================

    @ReactMethod
    public void connect(
            String roomName, String accessToken, ReadableMap options) {
        boolean enableAudio = options.getBoolean("enableAudio");
        boolean enableVideo = options.getBoolean("enableVideo");

        this.roomName = roomName;
        this.accessToken = accessToken;
        this.enableRemoteAudio = enableAudio;

        mainHandler.post(() -> {
            createDataTrackThread();

            // Share your microphone
            localAudioTrack = LocalAudioTrack.create(getContext(), enableAudio);

            if (enableVideo && cameraCapturer == null) {
                boolean createVideoStatus = createLocalVideo(enableVideo);
                if (!createVideoStatus) {
                    // No need to connect to room if video creation failed
                    return;
                }
            }
            connectToRoom(enableAudio);
        });
    }

    @MainThread
    private void connectToRoom(boolean enableAudio) {
        /*
         * Create a VideoClient allowing you to connect to a Room
         */
        setAudioFocus(enableAudio);
        ConnectOptions.Builder connectOptionsBuilder = new ConnectOptions.Builder(this.accessToken);

        if (this.roomName != null) {
            connectOptionsBuilder.roomName(this.roomName);
        }

        if (localAudioTrack != null) {
            connectOptionsBuilder.audioTracks(Collections.singletonList(localAudioTrack));
        }

        if (localVideoTrack != null) {
            connectOptionsBuilder.videoTracks(Collections.singletonList(localVideoTrack));
        }

        //LocalDataTrack localDataTrack = LocalDataTrack.create(getContext());

        if (localDataTrack != null) {
            connectOptionsBuilder.dataTracks(Collections.singletonList(localDataTrack));
        }

        // TODO: provide this via a parameter
        connectOptionsBuilder.enableAutomaticSubscription(false);

        room = Video.connect(getContext(), connectOptionsBuilder.build(), roomListener());
    }

    @MainThread
    private void setAudioFocus(boolean focus) {
        if (focus) {
            audioSwitch.start((audioDevices, audioDevice) -> {
                return Unit.INSTANCE;
            });
            audioSwitch.activate();
        } else {
            audioSwitch.deactivate();
            audioSwitch.stop();
        }
    }

    // ====== DISCONNECTING ========================================================================

    @ReactMethod
    public void disconnect() {
        mainHandler.post(() -> {
            quitDataTrackThread();
            cancelStatsRequest();

            if (room != null) {
                room.disconnect();
            }
            if (localAudioTrack != null) {
                localAudioTrack.release();
                localAudioTrack = null;
            }
            if (localVideoTrack != null) {
                localVideoTrack.release();
                localVideoTrack = null;
            }
            setAudioFocus(false);
            if (cameraCapturer != null) {
                cameraCapturer.stopCapture();
                cameraCapturer = null;
            }
        });
    }

    // ===== SEND STRING ON DATA TRACK ======================================================================
    @ReactMethod
    public void sendString(String message) {
        if (localDataTrack != null) {
            localDataTrack.send(message);
        }
    }

    // ===== BUTTON LISTENERS ======================================================================
    @MainThread
    private static void setThumbnailMirror() {
        if (cameraCapturer != null) {
            CameraCapturer.CameraSource cameraSource = cameraCapturer.getCameraSource();
            final boolean isBackCamera = (cameraSource == CameraCapturer.CameraSource.BACK_CAMERA);
            if (thumbnailVideoView != null && thumbnailVideoView.getVisibility() == View.VISIBLE) {
                thumbnailVideoView.setMirror(!isBackCamera);
            }
        }
    }

    @ReactMethod
    public void flipCamera() {
        mainHandler.post(() -> {
            if (cameraCapturer != null) {
                cameraCapturer.switchCamera();
                CameraCapturer.CameraSource cameraSource = cameraCapturer.getCameraSource();
                final boolean isBackCamera = cameraSource == CameraCapturer.CameraSource.BACK_CAMERA;
                WritableMap event = new WritableNativeMap();
                event.putBoolean("isBackCamera", isBackCamera);
                pushEvent(ON_CAMERA_SWITCHED, event);
            }
        });
    }

    @ReactMethod
    public void setLocalVideoEnabled(boolean enabled) {
        mainHandler.post(() -> {
            if (localVideoTrack != null) {
                localVideoTrack.enable(enabled);

                WritableMap event = new WritableNativeMap();
                event.putBoolean("videoEnabled", enabled);
                pushEvent(ON_VIDEO_CHANGED, event);
            }
        });
    }

    @ReactMethod
    public void toggleSoundSetup(boolean speaker) {
        mainHandler.post(() -> {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (speaker) {
                audioManager.setSpeakerphoneOn(true);
            } else {
                audioManager.setSpeakerphoneOn(false);
            }
        });
    }

    @ReactMethod
    public void setLocalAudioEnabled(boolean enabled) {
        mainHandler.post(() -> {
            if (localAudioTrack != null) {
                localAudioTrack.enable(enabled);

                WritableMap event = new WritableNativeMap();
                event.putBoolean("audioEnabled", enabled);
                pushEvent(ON_AUDIO_CHANGED, event);
            }
        });
    }

    @ReactMethod
    public void toggleBluetoothHeadset(boolean enabled) {
        mainHandler.post(() -> {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (enabled) {
                audioManager.startBluetoothSco();
            } else {
                audioManager.stopBluetoothSco();
            }
        });
    }

    @ReactMethod
    public void setRemoteAudioEnabled(String participantSid, boolean enabled) {
        mainHandler.post(() -> {
            if (room != null) {
                for (RemoteParticipant rp : room.getRemoteParticipants()) {
                    if (rp.getSid().equals(participantSid)) {
                        for (AudioTrackPublication at : rp.getAudioTracks()) {
                            if (at.getAudioTrack() != null) {
                                ((RemoteAudioTrack) at.getAudioTrack()).enablePlayback(enabled);
                            }
                        }
                    }
                }
            }
        });
    }

    private void convertBaseTrackStats(BaseTrackStats bs, WritableMap result) {
        result.putString("codec", bs.codec);
        result.putInt("packetsLost", bs.packetsLost);
        result.putString("ssrc", bs.ssrc);
        result.putDouble("timestamp", bs.timestamp);
        result.putString("trackSid", bs.trackSid);
    }

    private void convertLocalTrackStats(LocalTrackStats ts, WritableMap result) {
        result.putDouble("bytesSent", ts.bytesSent);
        result.putInt("packetsSent", ts.packetsSent);
        result.putDouble("roundTripTime", ts.roundTripTime);
    }

    private void convertRemoteTrackStats(RemoteTrackStats ts, WritableMap result) {
        result.putDouble("bytesReceived", ts.bytesReceived);
        result.putInt("packetsReceived", ts.packetsReceived);
    }

    private WritableMap convertAudioTrackStats(RemoteAudioTrackStats as) {
        WritableMap result = new WritableNativeMap();
        result.putInt("audioLevel", as.audioLevel);
        result.putInt("jitter", as.jitter);
        convertBaseTrackStats(as, result);
        convertRemoteTrackStats(as, result);
        return result;
    }

    private WritableMap convertLocalAudioTrackStats(LocalAudioTrackStats as) {
        WritableMap result = new WritableNativeMap();
        result.putInt("audioLevel", as.audioLevel);
        result.putInt("jitter", as.jitter);
        convertBaseTrackStats(as, result);
        convertLocalTrackStats(as, result);
        return result;
    }

    private WritableMap convertVideoTrackStats(RemoteVideoTrackStats vs) {
        WritableMap result = new WritableNativeMap();
        WritableMap dimensions = new WritableNativeMap();
        dimensions.putInt("height", vs.dimensions.height);
        dimensions.putInt("width", vs.dimensions.width);
        result.putMap("dimensions", dimensions);
        result.putInt("frameRate", vs.frameRate);
        convertBaseTrackStats(vs, result);
        convertRemoteTrackStats(vs, result);
        return result;
    }

    private WritableMap convertLocalVideoTrackStats(LocalVideoTrackStats vs) {
        WritableMap result = new WritableNativeMap();
        WritableMap dimensions = new WritableNativeMap();
        dimensions.putInt("height", vs.dimensions.height);
        dimensions.putInt("width", vs.dimensions.width);
        result.putMap("dimensions", dimensions);
        result.putInt("frameRate", vs.frameRate);
        convertBaseTrackStats(vs, result);
        convertLocalTrackStats(vs, result);
        return result;
    }

    @ReactMethod
    public void getStats() {
        if (room != null) {
            room.getStats(this);
        }
    }

    @ReactMethod
    public void requestStats(int intervalMs) {
        if (requestStatsTimer != null) {
            requestStatsTimer.cancel();
        }
        requestStatsTimer = new Timer();
        requestStatsTimer.scheduleAtFixedRate(new RequestStatsTask(), 0, intervalMs);
    }

    @ReactMethod
    public void cancelStatsRequest() {
        if (requestStatsTimer != null) {
            requestStatsTimer.cancel();
            requestStatsTimer = null;
        }
    }

    @ReactMethod
    public void disableOpenSLES() {
        WebRtcAudioManager.setBlacklistDeviceForOpenSLESUsage(true);
    }

    // ====== ROOM LISTENER ========================================================================

    /*
     * Room events listener
     */
    private Room.Listener roomListener() {
        return new Room.Listener() {
            @Override
            public void onConnected(Room room) {
                localParticipant = room.getLocalParticipant();

                WritableMap event = new WritableNativeMap();
                event.putString("roomName", room.getName());
                event.putString("roomSid", room.getSid());
                List<RemoteParticipant> participants = room.getRemoteParticipants();

                WritableArray participantsArray = new WritableNativeArray();
                for (RemoteParticipant participant : participants) {
                    participantsArray.pushMap(buildParticipant(participant));
                }
                participantsArray.pushMap(buildParticipant(localParticipant));
                event.putArray("participants", participantsArray);

                pushEvent(ON_CONNECTED, event);


                //There is not .publish it's publishTrack
                localParticipant.publishTrack(localDataTrack);

                for (RemoteParticipant participant : participants) {
                    addParticipant(room, participant);
                }
            }

            @Override
            public void onConnectFailure(Room room, TwilioException e) {
                WritableMap event = new WritableNativeMap();
                event.putString("roomName", room.getName());
                event.putString("roomSid", room.getSid());

                WritableMap error = new WritableNativeMap();
                error.putString("message", e.getMessage());
                error.putInt("code", e.getCode());
                event.putMap("error", error);
                pushEvent(ON_CONNECT_FAILURE, event);
            }

            @Override
            public void onReconnecting(@NonNull Room room, @NonNull TwilioException twilioException) {

            }

            @Override
            public void onReconnected(@NonNull Room room) {

            }

            @Override
            public void onDisconnected(Room room, TwilioException e) {
                WritableMap event = new WritableNativeMap();

                if (localParticipant != null) {
                    event.putString("participant", localParticipant.getIdentity());
                }
                event.putString("roomName", room.getName());
                event.putString("roomSid", room.getSid());
                if (e != null) {
                    WritableMap error = new WritableNativeMap();
                    error.putString("message", e.getMessage());
                    error.putInt("code", e.getCode());
                    event.putMap("error", error);
                }
                pushEvent(ON_DISCONNECTED, event);

                localParticipant = null;
                roomName = null;
                accessToken = null;


                TwilioVideoModule.room = null;
                // Only reinitialize the UI if disconnect was not called from onDestroy()
                if (!disconnectedFromOnDestroy) {
                    setAudioFocus(false);
                }
            }

            @Override
            public void onParticipantConnected(Room room, RemoteParticipant participant) {
                addParticipant(room, participant);

            }

            @Override
            public void onParticipantDisconnected(Room room, RemoteParticipant participant) {
                removeParticipant(room, participant);
            }

            @Override
            public void onRecordingStarted(Room room) {
            }

            @Override
            public void onRecordingStopped(Room room) {
            }
        };
    }

    /*
     * Called when participant joins the room
     */
    private void addParticipant(Room room, RemoteParticipant remoteParticipant) {

        WritableMap event = new WritableNativeMap();
        event.putString("roomName", room.getName());
        event.putString("roomSid", room.getSid());
        event.putMap("participant", buildParticipant(remoteParticipant));

        pushEvent(ON_PARTICIPANT_CONNECTED, event);

        /*
         * Start listening for participant media events
         */
        remoteParticipant.setListener(mediaListener());

        for (final RemoteDataTrackPublication remoteDataTrackPublication :
                remoteParticipant.getRemoteDataTracks()) {
            /*
             * Data track messages are received on the thread that calls setListener. Post the
             * invocation of setting the listener onto our dedicated data track message thread.
             */
            if (remoteDataTrackPublication.isTrackSubscribed()) {
                dataTrackMessageThreadHandler.post(() -> addRemoteDataTrack(remoteParticipant,
                        remoteDataTrackPublication.getRemoteDataTrack()));
            }
        }
    }

    /*
     * Called when participant leaves the room
     */
    private void removeParticipant(Room room, RemoteParticipant participant) {
        WritableMap event = new WritableNativeMap();
        event.putString("roomName", room.getName());
        event.putString("roomSid", room.getSid());
        event.putMap("participant", buildParticipant(participant));
        pushEvent(ON_PARTICIPANT_DISCONNECTED, event);
        //something about this breaking.
        //participant.setListener(null);
    }

    private void addRemoteDataTrack(RemoteParticipant remoteParticipant, RemoteDataTrack remoteDataTrack) {
        remoteDataTrackMap.put(remoteDataTrack.getSid(), new Pair<>(remoteDataTrack, remoteParticipant));
        remoteDataTrack.setListener(remoteDataTrackListener());
    }

    private void removeRemoteDataTrack(RemoteParticipant remoteParticipant, RemoteDataTrack remoteDataTrack) {
        remoteDataTrackMap.remove(remoteDataTrack.getSid());
    }

    // ====== MEDIA LISTENER =======================================================================

    private RemoteParticipant.Listener mediaListener() {
        return new RemoteParticipant.Listener() {
            @Override
            public void onAudioTrackSubscribed(RemoteParticipant participant, RemoteAudioTrackPublication publication, RemoteAudioTrack audioTrack) {
                audioTrack.enablePlayback(enableRemoteAudio);
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_ADDED_AUDIO_TRACK, event);
            }

            @Override
            public void onAudioTrackUnsubscribed(RemoteParticipant participant, RemoteAudioTrackPublication publication, RemoteAudioTrack audioTrack) {
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_REMOVED_AUDIO_TRACK, event);
            }

            @Override
            public void onAudioTrackSubscriptionFailed(RemoteParticipant participant, RemoteAudioTrackPublication publication, TwilioException twilioException) {
                WritableMap event = buildTrackSubscriptionFailedEvent(participant, publication, twilioException);
                pushEvent(ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_AUDIO_TRACK, event);
            }

            @Override
            public void onAudioTrackPublished(RemoteParticipant participant, RemoteAudioTrackPublication publication) {
            }

            @Override
            public void onAudioTrackUnpublished(RemoteParticipant participant, RemoteAudioTrackPublication publication) {

            }


            @Override
            public void onDataTrackSubscribed(RemoteParticipant remoteParticipant, RemoteDataTrackPublication remoteDataTrackPublication, RemoteDataTrack remoteDataTrack) {
                WritableMap event = buildParticipantDataEvent(remoteParticipant);
                pushEvent(ON_PARTICIPANT_ADDED_DATA_TRACK, event);
                dataTrackMessageThreadHandler.post(() -> addRemoteDataTrack(remoteParticipant, remoteDataTrack));
            }

            @Override
            public void onDataTrackUnsubscribed(RemoteParticipant remoteParticipant, RemoteDataTrackPublication publication, RemoteDataTrack remoteDataTrack) {
                WritableMap event = buildParticipantDataEvent(remoteParticipant);
                pushEvent(ON_PARTICIPANT_REMOVED_DATA_TRACK, event);
                dataTrackMessageThreadHandler.post(() -> removeRemoteDataTrack(remoteParticipant, remoteDataTrack));
            }

            @Override
            public void onDataTrackSubscriptionFailed(RemoteParticipant participant, RemoteDataTrackPublication publication, TwilioException twilioException) {
                WritableMap event = buildTrackSubscriptionFailedEvent(participant, publication, twilioException);
                pushEvent(ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_DATA_TRACK, event);
            }

            @Override
            public void onDataTrackPublished(RemoteParticipant participant, RemoteDataTrackPublication publication) {

            }

            @Override
            public void onDataTrackUnpublished(RemoteParticipant participant, RemoteDataTrackPublication publication) {

            }

            @Override
            public void onVideoTrackSubscribed(RemoteParticipant participant, RemoteVideoTrackPublication publication, RemoteVideoTrack videoTrack) {
                addParticipantVideo(participant, publication);
            }

            @Override
            public void onVideoTrackUnsubscribed(RemoteParticipant participant, RemoteVideoTrackPublication publication, RemoteVideoTrack videoTrack) {
                removeParticipantVideo(participant, publication);
            }

            @Override
            public void onVideoTrackSubscriptionFailed(RemoteParticipant participant, RemoteVideoTrackPublication publication, TwilioException twilioException) {
                WritableMap event = buildTrackSubscriptionFailedEvent(participant, publication, twilioException);
                pushEvent(ON_PARTICIPANT_FAILED_TO_SUBSCRIBE_TO_VIDEO_TRACK, event);
            }

            @Override
            public void onVideoTrackPublished(RemoteParticipant participant, RemoteVideoTrackPublication publication) {

            }

            @Override
            public void onVideoTrackUnpublished(RemoteParticipant participant, RemoteVideoTrackPublication publication) {

            }

            @Override
            public void onAudioTrackEnabled(RemoteParticipant participant, RemoteAudioTrackPublication publication) {//                Log.i(TAG, "onAudioTrackEnabled");
//                publication.getRemoteAudioTrack().enablePlayback(false);
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_ENABLED_AUDIO_TRACK, event);
            }

            @Override
            public void onAudioTrackDisabled(RemoteParticipant participant, RemoteAudioTrackPublication publication) {
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_DISABLED_AUDIO_TRACK, event);
            }

            @Override
            public void onVideoTrackEnabled(RemoteParticipant participant, RemoteVideoTrackPublication publication) {
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_ENABLED_VIDEO_TRACK, event);
            }

            @Override
            public void onVideoTrackDisabled(RemoteParticipant participant, RemoteVideoTrackPublication publication) {
                WritableMap event = buildParticipantVideoEvent(participant, publication);
                pushEvent(ON_PARTICIPANT_DISABLED_VIDEO_TRACK, event);
            }
        };
    }

    private WritableMap buildParticipant(Participant participant) {
        WritableMap participantMap = new WritableNativeMap();
        participantMap.putString("identity", participant.getIdentity());
        participantMap.putString("sid", participant.getSid());
        return participantMap;
    }


    private WritableMap buildParticipantDataEvent(Participant participant) {
        WritableMap participantMap = buildParticipant(participant);
        WritableMap participantMap2 = buildParticipant(participant);

        WritableMap event = new WritableNativeMap();
        event.putMap("participant", participantMap);
        event.putMap("track", participantMap2);
        return event;
    }

    private WritableMap buildParticipantVideoEvent(Participant participant, TrackPublication publication) {
        WritableMap participantMap = buildParticipant(participant);

        WritableMap trackMap = new WritableNativeMap();
        trackMap.putString("trackSid", publication.getTrackSid());
        trackMap.putString("trackName", publication.getTrackName());
        trackMap.putBoolean("enabled", publication.isTrackEnabled());

        WritableMap event = new WritableNativeMap();
        event.putMap("participant", participantMap);
        event.putMap("track", trackMap);
        return event;
    }

    private WritableMap buildTrackSubscriptionFailedEvent(Participant participant, TrackPublication publication, TwilioException twilioException) {
        WritableMap participantMap = buildParticipant(participant);

        WritableMap trackMap = new WritableNativeMap();
        trackMap.putString("trackSid", publication.getTrackSid());
        trackMap.putString("trackName", publication.getTrackName());
        trackMap.putBoolean("enabled", publication.isTrackEnabled());

        WritableMap event = new WritableNativeMap();
        event.putMap("participant", participantMap);
        event.putMap("track", trackMap);

        WritableMap error = new WritableNativeMap();
        error.putString("message", twilioException.getMessage());
        error.putInt("code", twilioException.getCode());
        event.putMap("error", error);

        return event;
    }

    private WritableMap buildDataTrackEvent(RemoteDataTrack remoteDataTrack, String message) {
        Pair<RemoteDataTrack, RemoteParticipant> dataTrackInfo = remoteDataTrackMap.get(remoteDataTrack.getSid());
        String senderId = dataTrackInfo != null ? dataTrackInfo.second.getIdentity() : null;
        WritableMap event = new WritableNativeMap();
        event.putString("message", message);
        event.putString("senderId", senderId);
        return event;
    }

    private void addParticipantVideo(Participant participant, RemoteVideoTrackPublication publication) {
        WritableMap event = this.buildParticipantVideoEvent(participant, publication);
        pushEvent(ON_PARTICIPANT_ADDED_VIDEO_TRACK, event);
    }

    private void removeParticipantVideo(Participant participant, RemoteVideoTrackPublication deleteVideoTrack) {
        WritableMap event = this.buildParticipantVideoEvent(participant, deleteVideoTrack);
        pushEvent(ON_PARTICIPANT_REMOVED_VIDEO_TRACK, event);
    }
    // ===== EVENTS TO RN ==========================================================================

    void pushEvent(String name, ReadableMap data) {
        this.eventEmitter.emit(name, data);
    }

    public static void registerPrimaryVideoView(PatchedVideoView v, String trackSid) {
        if (room != null) {

            for (RemoteParticipant participant : room.getRemoteParticipants()) {
                for (RemoteVideoTrackPublication publication : participant.getRemoteVideoTracks()) {
                    RemoteVideoTrack track = publication.getRemoteVideoTrack();
                    if (track == null) {
                        continue;
                    }
                    if (publication.getTrackSid().equals(trackSid)) {
                        track.addRenderer(v);
                    } else {
                        track.removeRenderer(v);
                    }
                }
            }
        }
    }

    public static void registerThumbnailVideoView(PatchedVideoView v) {
        thumbnailVideoView = v;
        if (localVideoTrack != null) {
            localVideoTrack.addRenderer(v);
        }
        setThumbnailMirror();
    }

    private RemoteDataTrack.Listener remoteDataTrackListener() {
        return new RemoteDataTrack.Listener() {

            @Override
            public void onMessage(RemoteDataTrack remoteDataTrack, ByteBuffer byteBuffer) {

            }


            @Override
            public void onMessage(RemoteDataTrack remoteDataTrack, String message) {
                WritableMap event = buildDataTrackEvent(remoteDataTrack, message);
                pushEvent(ON_DATATRACK_MESSAGE_RECEIVED, event);
            }
        };
    }

    @Override
    public void onStats(List<StatsReport> statsReports) {
        WritableMap event = new WritableNativeMap();
        for (StatsReport sr : statsReports) {
            WritableMap connectionStats = new WritableNativeMap();
            WritableArray as = new WritableNativeArray();
            for (RemoteAudioTrackStats s : sr.getRemoteAudioTrackStats()) {
                as.pushMap(convertAudioTrackStats(s));
            }
            connectionStats.putArray("remoteAudioTrackStats", as);

            WritableArray vs = new WritableNativeArray();
            for (RemoteVideoTrackStats s : sr.getRemoteVideoTrackStats()) {
                vs.pushMap(convertVideoTrackStats(s));
            }
            connectionStats.putArray("remoteVideoTrackStats", vs);

            WritableArray las = new WritableNativeArray();
            for (LocalAudioTrackStats s : sr.getLocalAudioTrackStats()) {
                las.pushMap(convertLocalAudioTrackStats(s));
            }
            connectionStats.putArray("localAudioTrackStats", las);

            WritableArray lvs = new WritableNativeArray();
            for (LocalVideoTrackStats s : sr.getLocalVideoTrackStats()) {
                lvs.pushMap(convertLocalVideoTrackStats(s));
            }
            connectionStats.putArray("localVideoTrackStats", lvs);
            event.putMap(sr.getPeerConnectionId(), connectionStats);
        }
        pushEvent(ON_STATS_RECEIVED, event);
    }

    private void createDataTrackThread() {
        quitDataTrackThread();

        dataTrackMessageThread =
                new HandlerThread(DATA_TRACK_MESSAGE_THREAD_NAME);
        // Start the thread where data messages are received
        dataTrackMessageThread.start();
        dataTrackMessageThreadHandler = new Handler(dataTrackMessageThread.getLooper());
    }

    private void quitDataTrackThread() {
        if (dataTrackMessageThread != null) {
            dataTrackMessageThread.quit();
            dataTrackMessageThread = null;
        }
    }
}
