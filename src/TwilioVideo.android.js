/**
 * Component to orchestrate the Twilio Video connection and the various video
 * views.
 *
 * Authors:
 *   Ralph Pina <slycoder@gmail.com>
 *   Jonathan Chang <slycoder@gmail.com>
 */

import {
  requireNativeComponent,
  View,
  Platform,
  UIManager,
  findNodeHandle,
} from "react-native";
import React from "react";
import PropTypes from "prop-types";

const NATIVE_EVENTS = Object.freeze({
  connectToRoom: 1,
  disconnect: 2,
  switchCamera: 3,
  toggleVideo: 4,
  toggleSound: 5,
  getStats: 6,
  disableOpenSLES: 7,
  toggleSoundSetup: 8,
  toggleRemoteSound: 9,
  releaseResource: 10,
  toggleBluetoothHeadset: 11,
  sendString: 12,
});

class CustomTwilioVideoView extends React.PureComponent {
  ref = React.createRef();

  static propTypes = {
    ...View.propTypes,
    /**
     * Callback that is called when camera source changes
     */
    onCameraSwitched: PropTypes.func,

    /**
     * Callback that is called when video is toggled.
     */
    onVideoChanged: PropTypes.func,

    /**
     * Callback that is called when a audio is toggled.
     */
    onAudioChanged: PropTypes.func,

    /**
     * Callback that is called when user is connected to a room.
     */
    onRoomDidConnect: PropTypes.func,

    /**
     * Callback that is called when connecting to room fails.
     */
    onRoomDidFailToConnect: PropTypes.func,

    /**
     * Callback that is called when user is disconnected from room.
     */
    onRoomDidDisconnect: PropTypes.func,

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
     * Called when an dataTrack receives a message
     *
     * @param {{message}}
     */
    onDataTrackMessageReceived: PropTypes.func,

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
     * Callback called a participant enters a room.
     */
    onRoomParticipantDidConnect: PropTypes.func,

    /**
     * Callback that is called when a participant exits a room.
     */
    onRoomParticipantDidDisconnect: PropTypes.func,
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
     * Callback that is called when stats are received (after calling getStats)
     */
    onStatsReceived: PropTypes.func,
  };

  componentWillUnmount() {
    this.runCommand(NATIVE_EVENTS.releaseResource, []);
  }

  connect({
    roomName,
    accessToken,
    enableAudio = true,
    enableVideo = true,
    enableRemoteAudio = true,
  }) {
    this.runCommand(NATIVE_EVENTS.connectToRoom, [
      roomName,
      accessToken,
      enableAudio,
      enableVideo,
      enableRemoteAudio,
    ]);
  }

  sendString(message) {
    this.runCommand(NATIVE_EVENTS.sendString, [message]);
  }

  disconnect() {
    this.runCommand(NATIVE_EVENTS.disconnect, []);
  }

  flipCamera() {
    this.runCommand(NATIVE_EVENTS.switchCamera, []);
  }

  setLocalVideoEnabled(enabled) {
    this.runCommand(NATIVE_EVENTS.toggleVideo, [enabled]);
    return Promise.resolve(enabled);
  }

  setLocalAudioEnabled(enabled) {
    this.runCommand(NATIVE_EVENTS.toggleSound, [enabled]);
    return Promise.resolve(enabled);
  }

  setRemoteAudioEnabled(enabled) {
    this.runCommand(NATIVE_EVENTS.toggleRemoteSound, [enabled]);
    return Promise.resolve(enabled);
  }

  setBluetoothHeadsetConnected(enabled) {
    this.runCommand(NATIVE_EVENTS.toggleBluetoothHeadset, [enabled]);
    return Promise.resolve(enabled);
  }

  getStats() {
    this.runCommand(NATIVE_EVENTS.getStats, []);
  }

  disableOpenSLES() {
    this.runCommand(NATIVE_EVENTS.disableOpenSLES, []);
  }

  toggleSoundSetup(speaker) {
    this.runCommand(NATIVE_EVENTS.toggleSoundSetup, [speaker]);
  }

  runCommand(event, args) {
    switch (Platform.OS) {
      case "android":
        UIManager.dispatchViewManagerCommand(
          findNodeHandle(this.ref.current),
          event,
          args
        );
        break;
      default:
        break;
    }
  }

  buildNativeEventWrappers() {
    return [
      "onCameraSwitched",
      "onVideoChanged",
      "onAudioChanged",
      "onRoomDidConnect",
      "onRoomDidFailToConnect",
      "onRoomDidDisconnect",
      "onParticipantAddedDataTrack",
      "onParticipantRemovedDataTrack",
      "onDataTrackMessageReceived",
      "onParticipantAddedVideoTrack",
      "onParticipantRemovedVideoTrack",
      "onParticipantAddedAudioTrack",
      "onParticipantRemovedAudioTrack",
      "onRoomParticipantDidConnect",
      "onRoomParticipantDidDisconnect",
      "onParticipantEnabledVideoTrack",
      "onParticipantDisabledVideoTrack",
      "onParticipantEnabledAudioTrack",
      "onParticipantDisabledAudioTrack",
      "onStatsReceived",
    ].reduce((wrappedEvents, eventName) => {
      if (this.props[eventName]) {
        return {
          ...wrappedEvents,
          [eventName]: (data) => this.props[eventName](data.nativeEvent),
        };
      }
      return wrappedEvents;
    }, {});
  }

  render() {
    const nativeEventWrappers = this.buildNativeEventWrappers();

    return (
      <NativeCustomTwilioVideoView
        ref={this.ref}
        {...this.props}
        {...nativeEventWrappers}
      />
    );
  }
}

const NativeCustomTwilioVideoView = requireNativeComponent(
  "RNCustomTwilioVideoView",
  CustomTwilioVideoView
);

module.exports = CustomTwilioVideoView;
