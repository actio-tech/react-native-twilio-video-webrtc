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
    // TODO: start local video/audio on iOS
  };

  /**
   * Disconnect from current room
   */
  disconnect = () => {
    this.nativeModule.disconnect();

    // TODO: stop local video/audio on iOS
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
      callback,
    );
  };

  onRoomDidFailToConnect = callback => {
    return this.eventEmitter.addListener(
      'TwilioVideo.onRoomDidFailToConnect',
      callback,
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
