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

import TwilioVideo from "./TwilioVideo";

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
     * Called when an dataTrack receives a message
     *
     * @param {{message}}
     */
    onDataTrackMessageReceived: PropTypes.func,
    /**
     * Called when stats are received (after calling getStats)
     *
     */
    onStatsReceived: PropTypes.func,
    ...View.propTypes,
  };

  subscriptions = [];

  constructor(props) {
    super(props);

    // Register events
    this.registerEvents();
  }

  componentWillUnmount() {
    this.unregisterEvents();
  }

  /**
   * Enable or disable local video
   */
  setLocalVideoEnabled = (enabled) => {
    return TwilioVideo.setLocalVideoEnabled(enabled);
  };

  /**
   * Enable or disable local audio
   */
  setLocalAudioEnabled = (enabled) => {
    return TwilioVideo.setLocalAudioEnabled(enabled);
  };

  /**
   * Flip between the front and back camera
   */
  flipCamera = () => {
    TwilioVideo.flipCamera();
  };

  /**
   * Get connection stats
   */
  getStats = () => {
    TwilioVideo.getStats();
  };

  /**
   * Connect to given room name using the JWT access token
   * @param  {String} roomName           The connecting room name
   * @param  {String} accessToken        The Twilio's JWT access token
   * @param  {String} encodingParameters Control Encoding config
   */
  connect = ({ roomName, accessToken, ...options }) => {
    TwilioVideo.connect(roomName, accessToken, options);
  };

  /**
   * Disconnect from current room
   */
  disconnect = () => {
    TwilioVideo.disconnect();
  };

  /**
   * SendString to datatrack
   * @param  {String} message    The message string to send
   */
  sendString = (message) => {
    TwilioVideo.sendString(message);
  };

  startLocalVideo = () => {
    TwilioVideo.startLocalVideo();
  };

  stopLocalVideo = () => {
    TwilioVideo.stopLocalVideo();
  };

  startLocalAudio = () => {
    TwilioVideo.startLocalAudio();
  };

  stopLocalAudio = () => {
    TwilioVideo.stopLocalAudio();
  };

  unregisterEvents = () => {
    this.subscriptions.forEach((e) => e.remove());
    this.subscriptions = [];
  };

  registerEvents = () => {
    this.subscriptions = [
      TwilioVideo.onRoomDidConnect((data) => {
        if (this.props.onRoomDidConnect) {
          this.props.onRoomDidConnect(data);
        }
      }),
      TwilioVideo.onRoomDidDisconnect((data) => {
        if (this.props.onRoomDidDisconnect) {
          this.props.onRoomDidDisconnect(data);
        }
      }),
      TwilioVideo.onRoomDidFailToConnect((data) => {
        if (this.props.onRoomDidFailToConnect) {
          this.props.onRoomDidFailToConnect(data);
        }
      }),
      TwilioVideo.onRoomParticipantDidConnect((data) => {
        if (this.props.onRoomParticipantDidConnect) {
          this.props.onRoomParticipantDidConnect(data);
        }
      }),
      TwilioVideo.onRoomParticipantDidDisconnect((data) => {
        if (this.props.onRoomParticipantDidDisconnect) {
          this.props.onRoomParticipantDidDisconnect(data);
        }
      }),
      TwilioVideo.onParticipantAddedVideoTrack((data) => {
        if (this.props.onParticipantAddedVideoTrack) {
          this.props.onParticipantAddedVideoTrack(data);
        }
      }),
      TwilioVideo.onParticipantAddedDataTrack((data) => {
        if (this.props.onParticipantAddedDataTrack) {
          this.props.onParticipantAddedDataTrack(data);
        }
      }),
      TwilioVideo.onParticipantRemovedDataTrack((data) => {
        if (this.props.onParticipantRemovedDataTrack) {
          this.props.onParticipantRemovedDataTrack(data);
        }
      }),
      TwilioVideo.onParticipantRemovedVideoTrack((data) => {
        if (this.props.onParticipantRemovedVideoTrack) {
          this.props.onParticipantRemovedVideoTrack(data);
        }
      }),
      TwilioVideo.onParticipantAddedAudioTrack((data) => {
        if (this.props.onParticipantAddedAudioTrack) {
          this.props.onParticipantAddedAudioTrack(data);
        }
      }),
      TwilioVideo.onParticipantRemovedAudioTrack((data) => {
        if (this.props.onParticipantRemovedAudioTrack) {
          this.props.onParticipantRemovedAudioTrack(data);
        }
      }),
      TwilioVideo.onDataTrackMessageReceived((data) => {
        if (this.props.onDataTrackMessageReceived) {
          this.props.onDataTrackMessageReceived(data);
        }
      }),
      TwilioVideo.onStatsReceived((data) => {
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
