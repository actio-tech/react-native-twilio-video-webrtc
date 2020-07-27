//
//  TwilioVideo.js
//  Black
//
//  Created by Martín Fernández on 6/13/17.
//
//

import React from "react";
import PropTypes from "prop-types";
import { NativeModules, NativeEventEmitter, View } from "react-native";

const { TWVideoModule } = NativeModules;
export default class extends React.PureComponent {
  static propTypes = {
    /**
     * Flag that enables screen sharing RCTRootView instead of camera capture
     */
    screenShare: PropTypes.bool,
    /**
     * Called when the room has connected
     *
     * @param {{roomName, participants}}
     */
    onRoomDidConnect: PropTypes.func,
    /**
     * Called when the room has disconnected
     *
     * @param {{roomName, error}}
     */
    onRoomDidDisconnect: PropTypes.func,
    /**
     * Called when connection with room failed
     *
     * @param {{roomName, error}}
     */
    onRoomDidFailToConnect: PropTypes.func,
    /**
     * Called when a new participant has connected
     *
     * @param {{roomName, participant}}
     */
    onRoomParticipantDidConnect: PropTypes.func,
    /**
     * Called when a participant has disconnected
     *
     * @param {{roomName, participant}}
     */
    onRoomParticipantDidDisconnect: PropTypes.func,
    /**
     * Called when a new video track has been added
     *
     * @param {{participant, track, enabled}}
     */
    onParticipantAddedVideoTrack: PropTypes.func,
    /**
     * Called when a video track has been removed
     *
     * @param {{participant, track}}
     */
    onParticipantRemovedVideoTrack: PropTypes.func,
    /**
     * Called when a new data track has been added
     *
     * @param {{participant, track}}
     */
    onParticipantAddedDataTrack: PropTypes.func,
    /**
     * Called when a data track has been removed
     *
     * @param {{participant, track}}
     */
    onParticipantRemovedDataTrack: PropTypes.func,
    /**
     * Called when a new audio track has been added
     *
     * @param {{participant, track}}
     */
    onParticipantAddedAudioTrack: PropTypes.func,
    /**
     * Called when a audio track has been removed
     *
     * @param {{participant, track}}
     */
    onParticipantRemovedAudioTrack: PropTypes.func,
    /**
     * Called when a video track has been enabled.
     *
     * @param {{participant, track}}
     */
    onParticipantEnabledVideoTrack: PropTypes.func,
    /**
     * Called when a video track has been disabled.
     *
     * @param {{participant, track}}
     */
    onParticipantDisabledVideoTrack: PropTypes.func,
    /**
     * Called when an audio track has been enabled.
     *
     * @param {{participant, track}}
     */
    onParticipantEnabledAudioTrack: PropTypes.func,
    /**
     * Called when an audio track has been disabled.
     *
     * @param {{participant, track}}
     */
    onParticipantDisabledAudioTrack: PropTypes.func,
    /**
     * Called when an dataTrack receives a message
     *
     * @param {{message}}
     */
    onDataTrackMessageReceived: PropTypes.func,
    /**
     * Called when the camera has started
     *
     */
    onCameraDidStart: PropTypes.func,
    /**
     * Called when the camera has been interrupted
     *
     */
    onCameraWasInterrupted: PropTypes.func,
    /**
     * Called when the camera interruption has ended
     *
     */
    onCameraInterruptionEnded: PropTypes.func,
    /**
     * Called when the camera has stopped runing with an error
     *
     * @param {{error}} The error message description
     */
    onCameraDidStopRunning: PropTypes.func,
    /**
     * Called when stats are received (after calling getStats)
     *
     */
    onStatsReceived: PropTypes.func,
    ...View.propTypes,
  };

  subscriptions = [];
  eventEmitter = new NativeEventEmitter(TWVideoModule);

  constructor(props) {
    super(props);

    // Register events
    this.registerEvents();
    this.startLocalVideo();
    this.startLocalAudio();
  }

  componentWillUnmount() {
    this.unregisterEvents();
    this.stopLocalVideo();
    this.stopLocalAudio();
  }

  /**
   * Locally mute/unmute all remote audio tracks from a given participant
   */
  setRemoteAudioPlayback = ({ participantSid, enabled }) => {
    TWVideoModule.setRemoteAudioPlayback(participantSid, enabled);
  };

  setRemoteAudioEnabled = (enabled) => {
    return Promise.resolve(enabled);
  };

  setBluetoothHeadsetConnected = (enabled) => {
    return Promise.resolve(enabled);
  };

  /**
   * Enable or disable local video
   */
  setLocalVideoEnabled = (enabled) => {
    return TWVideoModule.setLocalVideoEnabled(enabled);
  };

  /**
   * Enable or disable local audio
   */
  setLocalAudioEnabled = (enabled) => {
    return TWVideoModule.setLocalAudioEnabled(enabled);
  };

  /**
   * Flip between the front and back camera
   */
  flipCamera = () => {
    TWVideoModule.flipCamera();
  };

  /**
   * Toggle audio setup from speaker (default) and headset
   */
  toggleSoundSetup = (speaker) => {
    TWVideoModule.toggleSoundSetup(speaker);
  };

  /**
   * Get connection stats
   */
  getStats = () => {
    TWVideoModule.getStats();
  };

  /**
   * Connect to given room name using the JWT access token
   * @param  {String} roomName           The connecting room name
   * @param  {String} accessToken        The Twilio's JWT access token
   * @param  {String} encodingParameters Control Encoding config
   */
  connect = ({ roomName, accessToken, encodingParameters }) => {
    TWVideoModule.connect(accessToken, roomName, encodingParameters);
  };

  /**
   * Disconnect from current room
   */
  disconnect = () => {
    TWVideoModule.disconnect();
  };

  /**
   * SendString to datatrack
   * @param  {String} message    The message string to send
   */
  sendString = (message) => {
    TWVideoModule.sendString(message);
  };

  startLocalVideo = () => {
    TWVideoModule.startLocalVideo();
  };

  stopLocalVideo = () => {
    TWVideoModule.stopLocalVideo();
  };

  startLocalAudio = () => {
    TWVideoModule.startLocalAudio();
  };

  stopLocalAudio = () => {
    TWVideoModule.stopLocalAudio();
  };

  unregisterEvents = () => {
    TWVideoModule.changeListenerStatus(false);
    this.subscriptions.forEach((e) => e.remove());
    this.subscriptions = [];
  };

  registerEvents = () => {
    TWVideoModule.changeListenerStatus(true);

    this.subscriptions = [
      this.eventEmitter.addListener("roomDidConnect", (data) => {
        if (this.props.onRoomDidConnect) {
          this.props.onRoomDidConnect(data);
        }
      }),
      this.eventEmitter.addListener("roomDidDisconnect", (data) => {
        if (this.props.onRoomDidDisconnect) {
          this.props.onRoomDidDisconnect(data);
        }
      }),
      this.eventEmitter.addListener("roomDidFailToConnect", (data) => {
        if (this.props.onRoomDidFailToConnect) {
          this.props.onRoomDidFailToConnect(data);
        }
      }),
      this.eventEmitter.addListener("roomParticipantDidConnect", (data) => {
        if (this.props.onRoomParticipantDidConnect) {
          this.props.onRoomParticipantDidConnect(data);
        }
      }),
      this.eventEmitter.addListener("roomParticipantDidDisconnect", (data) => {
        if (this.props.onRoomParticipantDidDisconnect) {
          this.props.onRoomParticipantDidDisconnect(data);
        }
      }),
      this.eventEmitter.addListener("participantAddedVideoTrack", (data) => {
        if (this.props.onParticipantAddedVideoTrack) {
          this.props.onParticipantAddedVideoTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantAddedDataTrack", (data) => {
        if (this.props.onParticipantAddedDataTrack) {
          this.props.onParticipantAddedDataTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantRemovedDataTrack", (data) => {
        if (this.props.onParticipantRemovedDataTrack) {
          this.props.onParticipantRemovedDataTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantRemovedVideoTrack", (data) => {
        if (this.props.onParticipantRemovedVideoTrack) {
          this.props.onParticipantRemovedVideoTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantAddedAudioTrack", (data) => {
        if (this.props.onParticipantAddedAudioTrack) {
          this.props.onParticipantAddedAudioTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantRemovedAudioTrack", (data) => {
        if (this.props.onParticipantRemovedAudioTrack) {
          this.props.onParticipantRemovedAudioTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantEnabledVideoTrack", (data) => {
        if (this.props.onParticipantEnabledVideoTrack) {
          this.props.onParticipantEnabledVideoTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantDisabledVideoTrack", (data) => {
        if (this.props.onParticipantDisabledVideoTrack) {
          this.props.onParticipantDisabledVideoTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantEnabledAudioTrack", (data) => {
        if (this.props.onParticipantEnabledAudioTrack) {
          this.props.onParticipantEnabledAudioTrack(data);
        }
      }),
      this.eventEmitter.addListener("participantDisabledAudioTrack", (data) => {
        if (this.props.onParticipantDisabledAudioTrack) {
          this.props.onParticipantDisabledAudioTrack(data);
        }
      }),
      this.eventEmitter.addListener("dataTrackMessageReceived", (data) => {
        if (this.props.onDataTrackMessageReceived) {
          this.props.onDataTrackMessageReceived(data);
        }
      }),
      this.eventEmitter.addListener("cameraDidStart", (data) => {
        if (this.props.onCameraDidStart) {
          this.props.onCameraDidStart(data);
        }
      }),
      this.eventEmitter.addListener("cameraWasInterrupted", (data) => {
        if (this.props.onCameraWasInterrupted) {
          this.props.onCameraWasInterrupted(data);
        }
      }),
      this.eventEmitter.addListener("cameraInterruptionEnded", (data) => {
        if (this.props.onCameraInterruptionEnded) {
          this.props.onCameraInterruptionEnded(data);
        }
      }),
      this.eventEmitter.addListener("cameraDidStopRunning", (data) => {
        if (this.props.onCameraDidStopRunning) {
          this.props.onCameraDidStopRunning(data);
        }
      }),
      this.eventEmitter.addListener("statsReceived", (data) => {
        if (this.props.onStatsReceived) {
          this.props.onStatsReceived(data);
        }
      }),
    ];
  };

  render() {
    return this.props.children || null;
  }
}
