//
//  TwilioVideo.js
//  Black
//
//  Created by Martín Fernández on 6/13/17.
//
//

import React from 'react';
import PropTypes from 'prop-types';
import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  View,
  Platform,
} from 'react-native';

const {
  TWVideoModule: TwilioIosModule,
  TwilioModule: TwilioAndroidModule,
} = NativeModules;

export const TwilioErrorCode = Object.freeze({
  ACCESS_TOKEN_INVALID: 20101,
  ACCESS_TOKEN_HEADER_INVALID: 20102,
  ACCESS_TOKEN_ISSUER_INVALID: 20103,
  ACCESS_TOKEN_EXPIRED_EXCEPTION: 20104,
  ACCESS_TOKEN_NOT_YET_VALID: 20105,
  ACCESS_TOKEN_GRANTS_INVALID: 20106,
  ACCESS_TOKEN_SIGNATURE_INVALID: 20107,
  SIGNALING_CONNECTION_ERROR: 53000,
  SIGNALING_CONNECTION_DISCONNECTED: 53001,
  SIGNALING_CONNECTION_TIMEOUT: 53002,
  SIGNALING_INCOMING_MESSAGE_INVALID: 53003,
  SIGNALING_OUTGOING_MESSAGE_INVALID: 53004,
  SIGNALING_DNS_RESOLUTION_ERROR: 53005,
  SIGNALING_SERVER_BUSY: 53006,
  ROOM_NAME_INVALID: 53100,
  ROOM_NAME_TOO_LONG: 53101,
  ROOM_NAME_CHARS_INVALID: 53102,
  ROOM_CREATE_FAILED: 53103,
  ROOM_CONNECT_FAILED: 53104,
  ROOM_MAX_PARTICIPANTS_EXCEEDED: 53105,
  ROOM_NOT_FOUND: 53106,
  ROOM_MAX_PARTICIPANTS_OUT_OF_RANGE: 53107,
  ROOM_TYPE_INVALID: 53108,
  ROOM_TIMEOUT_OUT_OF_RANGE: 53109,
  ROOM_STATUS_CALLBACK_METHOD_INVALID: 53110,
  ROOM_STATUS_CALLBACK_INVALID: 53111,
  ROOM_STATUS_INVALID: 53112,
  ROOM_ROOM_EXISTS: 53113,
  ROOM_INVALID_PARAMETERS: 53114,
  ROOM_MEDIA_REGION_INVALID: 53115,
  ROOM_MEDIA_REGION_UNAVAILABLE: 53116,
  ROOM_SUBSCRIPTION_OPERATION_NOT_SUPPORTED: 53117,
  ROOM_ROOM_COMPLETED: 53118,
  ROOM_ACCOUNT_LIMIT_EXCEEDED: 53119,
  PARTICIPANT_IDENTITY_INVALID: 53200,
  PARTICIPANT_IDENTITY_TOO_LONG: 53201,
  PARTICIPANT_IDENTITY_CHARS_INVALID: 53202,
  PARTICIPANT_MAX_TRACKS_EXCEEDED: 53203,
  PARTICIPANT_NOT_FOUND: 53204,
  PARTICIPANT_DUPLICATE_IDENTITY: 53205,
  PARTICIPANT_ACCOUNT_LIMIT_EXCEEDED: 53206,
  PARTICIPANT_INVALID_SUBSCRIBE_RULE: 53215,
  TRACK_INVALID: 53300,
  TRACK_NAME_INVALID: 53301,
  TRACK_NAME_TOO_LONG: 53302,
  TRACK_NAME_CHARS_INVALID: 53303,
  TRACK_NAME_IS_DUPLICATED: 53304,
  TRACK_SERVER_TRACK_CAPACITY_REACHED: 53305,
  TRACK_DATA_TRACK_MESSAGE_TOO_LARGE: 53306,
  TRACK_DATA_TRACK_SEND_BUFFER_FULL: 53307,
  MEDIA_CLIENT_LOCAL_DESC_FAILED: 53400,
  MEDIA_SERVER_LOCAL_DESC_FAILED: 53401,
  MEDIA_CLIENT_REMOTE_DESC_FAILED: 53402,
  MEDIA_SERVER_REMOTE_DESC_FAILED: 53403,
  MEDIA_NO_SUPPORTED_CODEC: 53404,
  MEDIA_CONNECTION_ERROR: 53405,
  MEDIA_DATA_TRACK_FAILED: 53406,
  MEDIA_DTLS_TRANSPORT_FAILED: 53407,
  MEDIA_ICE_RESTART_NOT_ALLOWED: 53408,
  CONFIGURATION_ACQUIRE_FAILED: 53500,
  CONFIGURATION_ACQUIRE_TURN_FAILED: 53501,
});

export class TwilioError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

class TwilioVideo {
  subscriptions = [];

  eventEmitter = Platform.select({
    ios: new NativeEventEmitter(TwilioIosModule),
    android: DeviceEventEmitter,
  });

  nativeModule = Platform.select({
    ios: TwilioIosModule,
    android: TwilioAndroidModule,
  });

  /**
   * Connect to given room name using the JWT access token
   * @param  {String} roomName           The connecting room name
   * @param  {String} accessToken        The Twilio's JWT access token
   * @param  {String} encodingParameters Control Encoding config
   */
  connect = (roomName, accessToken, options) => {
    this.nativeModule.connect(roomName, accessToken, {
      ...options,
      enableAudio: options.enableAudio ?? true,
      enableVideo: options.enableVideo ?? true,
    });
  };

  /**
   * Disconnect from current room
   */
  disconnect = () => {
    this.nativeModule.disconnect();
  };

  /**1
   * Enable or disable local video
   */
  setLocalVideoEnabled = enabled => {
    return this.nativeModule.setLocalVideoEnabled(enabled);
  };

  /**
   * Enable or disable local audio
   */
  setLocalAudioEnabled = enabled => {
    return this.nativeModule.setLocalAudioEnabled(enabled);
  };

  /**
   * Flip between the front and back camera
   */
  flipCamera = () => {
    this.nativeModule.flipCamera();
  };

  /**
   * Get connection stats
   */
  getStats = () => {
    this.nativeModule.getStats();
  };

  /**
   * SendString to datatrack
   * @param  {String} message    The message string to send
   */
  sendString = message => {
    this.nativeModule.sendString(message);
  };

  onRoomDidConnect = callback => {
    return this.eventEmitter.addListener('TwilioVideo.onRoomDidConnect', callback);
  };

  onRoomDidDisconnect = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onRoomDidDisconnect',
      ({ error, ...rest }) => callback({ ...rest, error: error ? new TwilioError(error.code, error.message) : undefined }),
    );
  };

  onRoomDidFailToConnect = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onRoomDidFailToConnect',
      ({ error, ...rest }) => callback({ ...rest, error: new TwilioError(error.code, error.message) }),
    );
  };

  onRoomParticipantDidConnect = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onRoomParticipantDidConnect',
      callback,
    );
  };

  onRoomParticipantDidDisconnect = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onRoomParticipantDidDisconnect',
      callback,
    );
  };

  onParticipantAddedVideoTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantAddedVideoTrack',
      callback,
    );
  };

  onParticipantAddedDataTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantAddedDataTrack',
      callback,
    );
  };

  onParticipantRemovedDataTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantRemovedDataTrack',
      callback,
    );
  };

  onParticipantRemovedVideoTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantRemovedVideoTrack',
      callback,
    );
  };

  onParticipantAddedAudioTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantAddedAudioTrack',
      callback,
    );
  };

  onParticipantRemovedAudioTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantRemovedAudioTrack',
      callback,
    );
  };

  onParticipantRemovedDataTrack = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onParticipantRemovedDataTrack',
      callback,
    );
  };

  onDataTrackMessageReceived = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onDataTrackMessageReceived',
      callback,
    );
  };

  onStatsReceived = callback => {
    return this.eventEmitter.addListener('TwilioVideo.onStatsReceived', callback);
  };
}

export default new TwilioVideo();
