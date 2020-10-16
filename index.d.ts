declare module 'react-native-twilio-video-webrtc' {
  import { EmitterSubscription, ViewProps } from 'react-native';
  import React from 'react';

  enum TwilioErrorCode {
    ACCESS_TOKEN_INVALID = 20101,
    ACCESS_TOKEN_HEADER_INVALID = 20102,
    ACCESS_TOKEN_ISSUER_INVALID = 20103,
    ACCESS_TOKEN_EXPIRED_EXCEPTION = 20104,
    ACCESS_TOKEN_NOT_YET_VALID = 20105,
    ACCESS_TOKEN_GRANTS_INVALID = 20106,
    ACCESS_TOKEN_SIGNATURE_INVALID = 20107,
    SIGNALING_CONNECTION_ERROR = 53000,
    SIGNALING_CONNECTION_DISCONNECTED = 53001,
    SIGNALING_CONNECTION_TIMEOUT = 53002,
    SIGNALING_INCOMING_MESSAGE_INVALID = 53003,
    SIGNALING_OUTGOING_MESSAGE_INVALID = 53004,
    SIGNALING_DNS_RESOLUTION_ERROR = 53005,
    SIGNALING_SERVER_BUSY = 53006,
    ROOM_NAME_INVALID = 53100,
    ROOM_NAME_TOO_LONG = 53101,
    ROOM_NAME_CHARS_INVALID = 53102,
    ROOM_CREATE_FAILED = 53103,
    ROOM_CONNECT_FAILED = 53104,
    ROOM_MAX_PARTICIPANTS_EXCEEDED = 53105,
    ROOM_NOT_FOUND = 53106,
    ROOM_MAX_PARTICIPANTS_OUT_OF_RANGE = 53107,
    ROOM_TYPE_INVALID = 53108,
    ROOM_TIMEOUT_OUT_OF_RANGE = 53109,
    ROOM_STATUS_CALLBACK_METHOD_INVALID = 53110,
    ROOM_STATUS_CALLBACK_INVALID = 53111,
    ROOM_STATUS_INVALID = 53112,
    ROOM_ROOM_EXISTS = 53113,
    ROOM_INVALID_PARAMETERS = 53114,
    ROOM_MEDIA_REGION_INVALID = 53115,
    ROOM_MEDIA_REGION_UNAVAILABLE = 53116,
    ROOM_SUBSCRIPTION_OPERATION_NOT_SUPPORTED = 53117,
    ROOM_ROOM_COMPLETED = 53118,
    ROOM_ACCOUNT_LIMIT_EXCEEDED = 53119,
    PARTICIPANT_IDENTITY_INVALID = 53200,
    PARTICIPANT_IDENTITY_TOO_LONG = 53201,
    PARTICIPANT_IDENTITY_CHARS_INVALID = 53202,
    PARTICIPANT_MAX_TRACKS_EXCEEDED = 53203,
    PARTICIPANT_NOT_FOUND = 53204,
    PARTICIPANT_DUPLICATE_IDENTITY = 53205,
    PARTICIPANT_ACCOUNT_LIMIT_EXCEEDED = 53206,
    PARTICIPANT_INVALID_SUBSCRIBE_RULE = 53215,
    TRACK_INVALID = 53300,
    TRACK_NAME_INVALID = 53301,
    TRACK_NAME_TOO_LONG = 53302,
    TRACK_NAME_CHARS_INVALID = 53303,
    TRACK_NAME_IS_DUPLICATED = 53304,
    TRACK_SERVER_TRACK_CAPACITY_REACHED = 53305,
    TRACK_DATA_TRACK_MESSAGE_TOO_LARGE = 53306,
    TRACK_DATA_TRACK_SEND_BUFFER_FULL = 53307,
    MEDIA_CLIENT_LOCAL_DESC_FAILED = 53400,
    MEDIA_SERVER_LOCAL_DESC_FAILED = 53401,
    MEDIA_CLIENT_REMOTE_DESC_FAILED = 53402,
    MEDIA_SERVER_REMOTE_DESC_FAILED = 53403,
    MEDIA_NO_SUPPORTED_CODEC = 53404,
    MEDIA_CONNECTION_ERROR = 53405,
    MEDIA_DATA_TRACK_FAILED = 53406,
    MEDIA_DTLS_TRANSPORT_FAILED = 53407,
    MEDIA_ICE_RESTART_NOT_ALLOWED = 53408,
    CONFIGURATION_ACQUIRE_FAILED = 53500,
    CONFIGURATION_ACQUIRE_TURN_FAILED = 53501,
  }

  class TwilioError extends Error {
    code: TwilioErrorCode;
  }

  interface TwilioVideoLocalViewProps extends ViewProps {
    enabled: boolean;
    ref?: React.Ref<any>;
  }

  interface TwilioVideoParticipantViewProps extends ViewProps {
    trackIdentifier: {
      participantSid: string;
      videoTrackSid: string;
    };
    ref?: React.Ref<any>;
  }

  interface Participant {
    sid: string;
    identity: string;
  }

  interface Track {
    enabled: boolean;
    trackName: string;
    trackSid: string;
  }

  export interface TrackEventCbArgs {
    participant: Participant;
    track: Track;
  }

  export type TrackEventCb = (t: TrackEventCbArgs) => void;

  interface RoomEventCommonArgs {
    roomName: string;
    roomSid: string;
  }

  type RoomErrorEventArgs = RoomEventCommonArgs & {
    error?: TwilioError;
  };

  type RoomEventArgs = RoomEventCommonArgs & {
    participants: Participant[];
  };

  type ParticipantEventArgs = RoomEventCommonArgs & {
    participant: Participant;
  };

  export type MessageReceivedEventCb = ({
    message: string,
    senderId: string,
  }) => void;
  export type StatsReceivedEventCb = (stats: TwilioStats) => void;

  export type RoomEventCb = (p: RoomEventArgs) => void;
  export type RoomErrorEventCb = (t: RoomErrorEventArgs) => void;

  export type ParticipantEventCb = (p: ParticipantEventArgs) => void;

  interface AudioTrackStats {
    audioLevel: number;
    jitter: number;
  }

  interface VideoTrackStats {
    dimensions: {
      width: number;
      height: number;
    }
    frameRate: number;
  }

  interface BaseTrackStats {
    codec: string,
    packetsLost: number,
    timestamp: number,
    trackSid: string,
  }

  interface LocalTrackStats {
    bytesSent: number,
    packetsSent: number,
    roundTripTime: number,
  }

  interface RemoteTrackStats {
    bytesReceived: number,
    packetsReceived: number,
  }

  export interface TwilioStats {
    [connectionId: string]: {
      remoteAudioTrackStats: Array<BaseTrackStats & AudioTrackStats & RemoteTrackStats>;
      remoteVideoTrackStats: Array<BaseTrackStats & VideoTrackStats & RemoteTrackStats>;
      localAudioTrackStats: Array<BaseTrackStats & AudioTrackStats & LocalTrackStats>;
      localVideoTrackStats: Array<BaseTrackStats & VideoTrackStats & LocalTrackStats>;
    };
  }

  export type TwilioSubscription<CFunc> = (f: CFunc) => EmitterSubscription;

  export interface ConnectionOptions {
    enableAudio?: boolean;
    enableVideo?: boolean;
    enableRemoteAudio?: boolean;
    enableH264Codec?: boolean;
    // if audioBitrate OR videoBitrate is provided, you must provide both
    audioBitrate?: number;
    videoBitrate?: number;
  }

  interface ITwilioVideo {
    connect: (
      roomName: string,
      accessToken: string,
      options: ConnectionOptions,
    ) => void;

    disconnect: () => void;

    flipCamera: () => void;

    getStats: () => void;

    requestStats: (intervalMs: number) => void;

    cancelStatsRequest: () => void;

    sendString: (message: string) => void;

    setLocalVideoEnabled: (enabled: boolean) => Promise<boolean>;

    setLocalAudioEnabled: (enabled: boolean) => Promise<boolean>;

    setRemoteAudioEnabled: (participantSid: string, enabled: boolean) => void;

    onRoomDidConnect: TwilioSubscription<RoomEventCb>;

    onRoomDidDisconnect: TwilioSubscription<RoomErrorEventCb>;

    onRoomDidFailToConnect: TwilioSubscription<RoomErrorEventCb>;

    onRoomParticipantDidConnect: TwilioSubscription<ParticipantEventCb>;

    onRoomParticipantDidDisconnect: TwilioSubscription<ParticipantEventCb>;

    onParticipantAddedVideoTrack: TwilioSubscription<TrackEventCb>;

    onParticipantAddedDataTrack: TwilioSubscription<TrackEventCb>;

    onParticipantRemovedDataTrack: TwilioSubscription<TrackEventCb>;

    onParticipantRemovedVideoTrack: TwilioSubscription<TrackEventCb>;

    onParticipantAddedAudioTrack: TwilioSubscription<TrackEventCb>;

    onParticipantRemovedAudioTrack: TwilioSubscription<TrackEventCb>;

    onParticipantRemovedDataTrack: TwilioSubscription<TrackEventCb>;

    onDataTrackMessageReceived: TwilioSubscription<MessageReceivedEventCb>;

    onStatsReceived: TwilioSubscription<StatsReceivedEventCb>;
  }

  const TwilioVideo: ITwilioVideo;

  type TwilioVideoViewProps = ViewProps & {
    onCameraDidStart?: () => void;
    onCameraDidStopRunning?: (err: any) => void;
    onCameraWasInterrupted?: () => void;
    onParticipantAddedAudioTrack?: TrackEventCb;
    onParticipantAddedVideoTrack?: TrackEventCb;
    onParticipantAddedDataTrack?: TrackEventCb;
    onParticipantDisabledVideoTrack?: TrackEventCb;
    onParticipantDisabledAudioTrack?: TrackEventCb;
    onParticipantEnabledVideoTrack?: TrackEventCb;
    onParticipantEnabledAudioTrack?: TrackEventCb;
    onParticipantRemovedAudioTrack?: TrackEventCb;
    onParticipantRemovedVideoTrack?: TrackEventCb;
    onParticipantRemovedDataTrack?: TrackEventCb;
    onRoomDidConnect?: RoomEventCb;
    onRoomDidDisconnect?: RoomErrorEventCb;
    onRoomDidFailToConnect?: RoomErrorEventCb;
    onRoomParticipantDidConnect?: ParticipantEventCb;
    onRoomParticipantDidDisconnect?: ParticipantEventCb;
    onDataTrackMessageReceived?: MessageReceivedEventCb;
    onStatsReceived?: StatsReceivedEventCb;
    ref?: React.Ref<any>;
  };

  type iOSConnectParams = {
    accessToken: string;
    roomName?: string;
    enableH264Codec?: boolean;
    // if audioBitrate OR videoBitrate is provided, you must provide both
    audioBitrate?: number;
    videoBitrate?: number;
  };

  type androidConnectParams = {
    roomName?: string;
    accessToken: string;
    enableAudio?: boolean;
    enableVideo?: boolean;
    enableRemoteAudio?: boolean;
  };

  class TwilioVideoView extends React.Component<TwilioVideoViewProps> {
    setLocalVideoEnabled: (enabled: boolean) => Promise<boolean>;
    setLocalAudioEnabled: (enabled: boolean) => Promise<boolean>;
    setRemoteAudioEnabled: (participantSid: string, enabled: boolean) => void;
    setBluetoothHeadsetConnected: (enabled: boolean) => Promise<boolean>;
    connect: (options: iOSConnectParams | androidConnectParams) => void;
    disconnect: () => void;
    flipCamera: () => void;
    toggleSoundSetup: (speaker: boolean) => void;
    getStats: () => void;
    sendString: (message: string) => void;
  }

  class TwilioVideoLocalView extends React.Component<TwilioVideoLocalViewProps> {}

  class TwilioVideoParticipantView extends React.Component<
    TwilioVideoParticipantViewProps
  > {}

  export {
    TwilioVideoLocalView,
    TwilioVideoParticipantView,
    TwilioVideo,
    TwilioVideoView,
    TwilioError,
    TwilioErrorCode,
  };
}
