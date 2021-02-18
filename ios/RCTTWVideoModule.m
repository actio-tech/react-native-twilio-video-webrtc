//
//  RCTTWVideoModule.h
//  Black
//
//  Created by Martín Fernández on 6/13/17.
//
//

#import "RCTTWVideoModule.h"

#import "RCTTWSerializable.h"

static NSString* roomDidConnect               = @"TwilioVideo.onRoomDidConnect";
static NSString* roomDidDisconnect            = @"TwilioVideo.onRoomDidDisconnect";
static NSString* roomDidFailToConnect         = @"TwilioVideo.onRoomDidFailToConnect";
static NSString* roomParticipantDidConnect    = @"TwilioVideo.onRoomParticipantDidConnect";
static NSString* roomParticipantDidDisconnect = @"TwilioVideo.onRoomParticipantDidDisconnect";

static NSString* participantAddedAudioTrack   = @"TwilioVideo.onParticipantAddedAudioTrack";
static NSString* participantRemovedAudioTrack = @"TwilioVideo.onParticipantRemovedAudioTrack";
static NSString* participantFailedToSubscribeToAudioTrack = @"TwilioVideo.onParticipantFailedToSubscribeToAudioTrack";

static NSString* participantAddedVideoTrack   = @"TwilioVideo.onParticipantAddedVideoTrack";
static NSString* participantRemovedVideoTrack = @"TwilioVideo.onParticipantRemovedVideoTrack";
static NSString* participantFailedToSubscribeToVideoTrack = @"TwilioVideo.onParticipantFailedToSubscribeToVideoTrack";

static NSString* participantAddedDataTrack   = @"TwilioVideo.onParticipantAddedDataTrack";
static NSString* participantRemovedDataTrack   = @"TwilioVideo.onParticipantRemovedDataTrack";
static NSString* participantFailedToSubscribeToDataTrack = @"TwilioVideo.onParticipantFailedToSubscribeToDataTrack";

static NSString* participantEnabledVideoTrack      = @"TwilioVideo.onParticipantEnabledVideoTrack";
static NSString* participantDisabledVideoTrack     = @"TwilioVideo.onParticipantDisabledVideoTrack";
static NSString* participantEnabledAudioTrack      = @"TwilioVideo.onParticipantEnabledAudioTrack";
static NSString* participantDisabledAudioTrack     = @"TwilioVideo.onParticipantDisabledAudioTrack";
static NSString* dataTrackMessageReceived     = @"TwilioVideo.onDataTrackMessageReceived";

static NSString* cameraDidStart               = @"TwilioVideo.onCameraDidStart";
static NSString* cameraWasInterrupted         = @"TwilioVideo.onCameraWasInterrupted";
static NSString* cameraInterruptionEnded      = @"TwilioVideo.onCameraInterruptionEnded";
static NSString* cameraDidStopRunning         = @"TwilioVideo.onCameraDidStopRunning";
static NSString* statsReceived                = @"TwilioVideo.onStatsReceived";

static const CMVideoDimensions kRCTTWVideoAppCameraSourceDimensions = (CMVideoDimensions){900, 720};

static const int32_t kRCTTWVideoCameraSourceFrameRate = 15;

TVIVideoFormat *RCTTWVideoModuleCameraSourceSelectVideoFormatBySize(AVCaptureDevice *device, CMVideoDimensions targetSize) {
    TVIVideoFormat *selectedFormat = nil;
    // Ordered from smallest to largest.
    NSOrderedSet<TVIVideoFormat *> *formats = [TVICameraSource supportedFormatsForDevice:device];
    
    for (TVIVideoFormat *format in formats) {
        if (format.pixelFormat != TVIPixelFormatYUV420BiPlanarFullRange) {
            continue;
        }
        selectedFormat = format;
        // ^ Select whatever is available until we find one we like and short-circuit
        CMVideoDimensions dimensions = format.dimensions;
        
        if (dimensions.width >= targetSize.width && dimensions.height >= targetSize.height) {
            break;
        }
    }
    return selectedFormat;
}


@interface RCTTWVideoModule () <TVIRemoteDataTrackDelegate, TVIRemoteParticipantDelegate, TVIRoomDelegate, TVICameraSourceDelegate>

@property (strong, nonatomic) TVICameraSource *camera;
@property (strong, nonatomic) TVILocalVideoTrack* localVideoTrack;
@property (strong, nonatomic) TVILocalAudioTrack* localAudioTrack;
@property (strong, nonatomic) TVILocalDataTrack* localDataTrack;
@property (strong, nonatomic) TVIRoom *room;
@property (nonatomic) BOOL listening;
@property (strong, nonatomic) NSMutableDictionary* remoteDataTrackMap;
@property (nonatomic, copy) void(^statsReceivedCallback)(NSArray<TVIStatsReport *> * _Nonnull statsReports);
@property (strong, nonatomic) NSTimer* getStatsTimer;

@end

@implementation RCTTWVideoModule

@synthesize bridge = _bridge;

RCT_EXPORT_MODULE();

- (id)init {
    self = [super init];
    if (self) {
        __weak RCTTWVideoModule *weakSelf = self;
        self.statsReceivedCallback = ^(NSArray<TVIStatsReport *> * _Nonnull statsReports) {
            NSMutableDictionary *eventBody = [[NSMutableDictionary alloc] initWithCapacity:10];
            for (TVIStatsReport *statsReport in statsReports) {
                NSMutableArray *audioTrackStats = [[NSMutableArray alloc] initWithCapacity:10];
                NSMutableArray *videoTrackStats = [[NSMutableArray alloc] initWithCapacity:10];
                NSMutableArray *localAudioTrackStats = [[NSMutableArray alloc] initWithCapacity:10];
                NSMutableArray *localVideoTrackStats = [[NSMutableArray alloc] initWithCapacity:10];
                for (TVIRemoteAudioTrackStats *stats in statsReport.remoteAudioTrackStats) {
                    [audioTrackStats addObject:[weakSelf convertRemoteAudioTrackStats:stats]];
                }
                for (TVIRemoteVideoTrackStats *stats in statsReport.remoteVideoTrackStats) {
                    [videoTrackStats addObject:[weakSelf convertRemoteVideoTrackStats:stats]];
                }
                for (TVILocalAudioTrackStats *stats in statsReport.localAudioTrackStats) {
                    [localAudioTrackStats addObject:[weakSelf convertLocalAudioTrackStats:stats]];
                }
                for (TVILocalVideoTrackStats *stats in statsReport.localVideoTrackStats) {
                    [localVideoTrackStats addObject:[weakSelf convertLocalVideoTrackStats:stats]];
                }
                eventBody[statsReport.peerConnectionId] = @{
                    @"remoteAudioTrackStats": audioTrackStats,
                    @"remoteVideoTrackStats": videoTrackStats,
                    @"localAudioTrackStats": localAudioTrackStats,
                    @"localVideoTrackStats": localVideoTrackStats
                };
            }
            [weakSelf sendEventCheckingListenerWithName:statsReceived body:eventBody];
        };
    }
    return self;
}

- (void)dealloc {
    [self cancelStatsRequest];
    // We are done with camera
    if (self.camera) {
        [self.camera stopCapture];
        self.camera = nil;
    }
}

- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        roomDidConnect,
        roomDidDisconnect,
        roomDidFailToConnect,
        roomParticipantDidConnect,
        roomParticipantDidDisconnect,
        participantAddedVideoTrack,
        participantRemovedVideoTrack,
        participantFailedToSubscribeToVideoTrack,
        participantAddedDataTrack,
        participantRemovedDataTrack,
        participantFailedToSubscribeToDataTrack,
        participantAddedAudioTrack,
        participantRemovedAudioTrack,
        participantFailedToSubscribeToAudioTrack,
        participantEnabledVideoTrack,
        participantDisabledVideoTrack,
        participantEnabledAudioTrack,
        participantDisabledAudioTrack,
        dataTrackMessageReceived,
        cameraDidStopRunning,
        cameraDidStart,
        cameraWasInterrupted,
        cameraInterruptionEnded,
        statsReceived
    ];
}

- (void)addLocalView:(TVIVideoView *)view {
    if (self.localVideoTrack == nil) {
        [self startLocalVideo];
    }
    [self.localVideoTrack addRenderer:view];
    [self updateLocalViewMirroring:view];
}

- (void)updateLocalViewMirroring:(TVIVideoView *)view {
    if (self.camera && self.camera.device.position == AVCaptureDevicePositionFront) {
        view.mirror = true;
    }
}

- (void)removeLocalView:(TVIVideoView *)view {
    [self.localVideoTrack removeRenderer:view];
}

- (void)removeParticipantView:(TVIVideoView *)view sid:(NSString *)sid trackSid:(NSString *)trackSid {
    // TODO: Implement this nicely
}

- (void)addParticipantView:(TVIVideoView *)view sid:(NSString *)sid trackSid:(NSString *)trackSid {
    // Lookup for the participant in the room
    TVIRemoteParticipant *participant = [self.room getRemoteParticipantWithSid:sid];
    if (participant) {
        for (TVIRemoteVideoTrackPublication *publication in participant.remoteVideoTracks) {
            if ([publication.trackSid isEqualToString:trackSid]) {
                [publication.videoTrack addRenderer:view];
            }
        }
    }
}

RCT_EXPORT_METHOD(setRemoteAudioEnabled:(NSString *)participantSid enabled:(BOOL)enabled) {
    TVIRemoteParticipant *participant = [self.room getRemoteParticipantWithSid:participantSid];
    if (participant) {
        NSArray<TVIRemoteAudioTrackPublication *> *trackPublications = participant.remoteAudioTracks;
        for(TVIRemoteAudioTrackPublication *remoteAudioTrack in trackPublications) {
            [remoteAudioTrack.remoteTrack setPlaybackEnabled:enabled];
        }
    }
}

RCT_EXPORT_METHOD(startLocalVideo) {
    TVICameraSourceOptions *options = [TVICameraSourceOptions optionsWithBlock:^(TVICameraSourceOptionsBuilder * _Nonnull builder) {
        
    }];
    self.camera = [[TVICameraSource alloc] initWithOptions:options delegate:self];
    if (self.camera == nil) {
        return;
    }
    self.localVideoTrack = [TVILocalVideoTrack trackWithSource:self.camera enabled:YES name:@"camera"];
    AVCaptureDevice *camera = [TVICameraSource captureDeviceForPosition:AVCaptureDevicePositionFront];
    [self.camera startCaptureWithDevice:camera completion:^(AVCaptureDevice *device,
                                                            TVIVideoFormat *startFormat,
                                                            NSError *error) {
        if (!error) {
            for (TVIVideoView *renderer in self.localVideoTrack.renderers) {
                [self updateLocalViewMirroring:renderer];
            }
            [self sendEventCheckingListenerWithName:cameraDidStart body:nil];
        }
    }];
}

RCT_EXPORT_METHOD(startLocalAudio) {
    self.localAudioTrack = [TVILocalAudioTrack trackWithOptions:nil enabled:YES name:@"microphone"];
}

RCT_EXPORT_METHOD(stopLocalVideo) {
    self.localVideoTrack = nil;
    self.camera = nil;
}

RCT_EXPORT_METHOD(stopLocalAudio) {
    self.localAudioTrack = nil;
}

RCT_REMAP_METHOD(setLocalAudioEnabled, enabled:(BOOL)enabled setLocalAudioEnabledWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    [self.localAudioTrack setEnabled:enabled];
    
    resolve(@(enabled));
}

RCT_REMAP_METHOD(setLocalVideoEnabled, enabled:(BOOL)enabled setLocalVideoEnabledWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    if (self.localVideoTrack != nil) {
        [self.localVideoTrack setEnabled:enabled];
        resolve(@(enabled));
    }
}


RCT_EXPORT_METHOD(flipCamera) {
    if (self.camera) {
        AVCaptureDevicePosition position = self.camera.device.position;
        AVCaptureDevicePosition nextPosition = position == AVCaptureDevicePositionFront ? AVCaptureDevicePositionBack : AVCaptureDevicePositionFront;
        BOOL mirror = nextPosition == AVCaptureDevicePositionFront;
        
        AVCaptureDevice *captureDevice = [TVICameraSource captureDeviceForPosition:nextPosition];
        [self.camera selectCaptureDevice:captureDevice completion:^(AVCaptureDevice *device,
                                                                    TVIVideoFormat *startFormat,
                                                                    NSError *error) {
            if (!error) {
                for (TVIVideoView *renderer in self.localVideoTrack.renderers) {
                    renderer.mirror = mirror;
                }
            }
        }];
    }
}

RCT_EXPORT_METHOD(toggleSoundSetup:(BOOL)speaker) {
    NSError *error = nil;
    kTVIDefaultAVAudioSessionConfigurationBlock();
    AVAudioSession *session = [AVAudioSession sharedInstance];
    AVAudioSessionMode mode = speaker ? AVAudioSessionModeVideoChat : AVAudioSessionModeVoiceChat ;
    // Overwrite the audio route
    if (![session setMode:mode error:&error]) {
        NSLog(@"AVAudiosession setMode %@",error);
    }
    
    if (![session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:&error]) {
        NSLog(@"AVAudiosession overrideOutputAudioPort %@",error);
    }
}

-(void)convertBaseTrackStats:(TVIBaseTrackStats *)stats result:(NSMutableDictionary *)result {
    result[@"trackSid"] = stats.trackSid;
    result[@"packetsLost"] = @(stats.packetsLost);
    result[@"codec"] = stats.codec;
    result[@"ssrc"] = stats.ssrc;
    result[@"timestamp"] = @(stats.timestamp);
}

-(void)convertRemoteTrackStats:(TVIRemoteTrackStats *)stats result:(NSMutableDictionary *)result {
    result[@"bytesReceived"] = @(stats.bytesReceived);
    result[@"packetsReceived"] = @(stats.packetsReceived);
}

-(void)convertLocalTrackStats:(TVILocalTrackStats *)stats result:(NSMutableDictionary *)result {
    result[@"bytesSent"] = @(stats.bytesSent);
    result[@"packetsSent"] = @(stats.packetsSent);
    result[@"roundTripTime"] = @(stats.roundTripTime);
}

-(NSMutableDictionary*)convertDimensions:(CMVideoDimensions)dimensions {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] initWithCapacity:2];
    result[@"width"] = @(dimensions.width);
    result[@"height"] = @(dimensions.height);
    return result;
}

-(NSMutableDictionary*)convertRemoteAudioTrackStats:(TVIRemoteAudioTrackStats *)stats {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] initWithCapacity:10];
    [self convertBaseTrackStats:stats result:result];
    [self convertRemoteTrackStats:stats result:result];
    result[@"audioLevel"] = @(stats.audioLevel);
    result[@"jitter"] = @(stats.jitter);
    return result;
}

-(NSMutableDictionary*)convertRemoteVideoTrackStats:(TVIRemoteVideoTrackStats *)stats {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] initWithCapacity:10];
    [self convertBaseTrackStats:stats result:result];
    [self convertRemoteTrackStats:stats result:result];
    result[@"dimensions"] = [self convertDimensions:stats.dimensions];
    result[@"frameRate"] = @(stats.frameRate);
    return result;
}

-(NSMutableDictionary*)convertLocalAudioTrackStats:(TVILocalAudioTrackStats *)stats {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] initWithCapacity:10];
    [self convertBaseTrackStats:stats result:result];
    [self convertLocalTrackStats:stats result:result];
    result[@"audioLevel"] = @(stats.audioLevel);
    result[@"jitter"] = @(stats.jitter);
    return result;
}

-(NSMutableDictionary*)convertLocalVideoTrackStats:(TVILocalVideoTrackStats *)stats {
    NSMutableDictionary *result = [[NSMutableDictionary alloc] initWithCapacity:10];
    [self convertBaseTrackStats:stats result:result];
    [self convertLocalTrackStats:stats result:result];
    result[@"dimensions"] = [self convertDimensions:stats.dimensions];
    result[@"frameRate"] = @(stats.frameRate);
    return result;
}

RCT_EXPORT_METHOD(getStats) {
    if (self.room) {
        [self.room getStatsWithBlock: self.statsReceivedCallback];
                }
            }

RCT_EXPORT_METHOD(requestStats:(double)intervalMs) {
    [self.getStatsTimer invalidate];
    self.getStatsTimer = [NSTimer scheduledTimerWithTimeInterval: intervalMs / 1000
                                                          target: self
                                                          selector: @selector(getStats)
                                                          userInfo: nil repeats:YES];
    }

RCT_EXPORT_METHOD(cancelStatsRequest) {
    [self.getStatsTimer invalidate];
    self.getStatsTimer = nil;
}

RCT_EXPORT_METHOD(connect:(NSString *)roomName accessToken:(NSString *)accessToken options:(NSDictionary *)options) {
    self.remoteDataTrackMap = [NSMutableDictionary new];
    
    if (options[@"enableVideo"] && [options[@"enableVideo"] boolValue] && self.localVideoTrack == nil) {
        // We disabled video in a previous call, attempt to re-enable
        [self startLocalVideo];
    }
    
    if (options[@"enableAudio"] && [options[@"enableAudio"] boolValue] && self.localAudioTrack == nil) {
        [self startLocalAudio];
    }
    
    TVIConnectOptions *connectOptions = [TVIConnectOptions optionsWithToken:accessToken block:^(TVIConnectOptionsBuilder * _Nonnull builder) {
        if (self.localVideoTrack) {
            builder.videoTracks = @[self.localVideoTrack];
        }
        
        if (self.localAudioTrack) {
            builder.audioTracks = @[self.localAudioTrack];
        }
        
        self.localDataTrack = [TVILocalDataTrack track];
        
        if (self.localDataTrack) {
            builder.dataTracks = @[self.localDataTrack];
        }
        
        builder.roomName = roomName;
        
        builder.automaticSubscriptionEnabled = [options[@"enableAutomaticSubscription"] boolValue];

        // This will prevent Twilio Video from messing with the audio session
        // since v4 Twilio Video allows for manual audio session configuration (start/stop)
        builder.uuid = [NSUUID UUID];
        
        if(options[@"enableH264Codec"]){
            builder.preferredVideoCodecs = @[ [TVIH264Codec new] ];
        }
        
        if(options[@"audioBitrate"] || options[@"videoBitrate"]){
            NSInteger audioBitrate = [options[@"audioBitrate"] integerValue];
            NSInteger videoBitrate = [options[@"videoBitrate"] integerValue];
            builder.encodingParameters = [[TVIEncodingParameters alloc] initWithAudioBitrate:(audioBitrate) ? audioBitrate : 40 videoBitrate:(videoBitrate) ? videoBitrate : 1500];
        }
        
    }];
    
    self.room = [TwilioVideoSDK connectWithOptions:connectOptions delegate:self];
}

RCT_EXPORT_METHOD(sendString:(nonnull NSString *)message) {
    [self.localDataTrack sendString:message];
    //NSData *data = [message dataUsingEncoding:NSUTF8StringEncoding];
    //[self.localDataTrack sendString:message];
}

RCT_EXPORT_METHOD(disconnect) {
    [self cancelStatsRequest];
    
    [self stopLocalAudio];
    [self stopLocalVideo];
    
    [self.remoteDataTrackMap removeAllObjects];

    [self.room disconnect];
}

# pragma mark - Common

-(void)sendEventCheckingListenerWithName:(NSString *)event body:(NSDictionary *)body {
    if (_listening) {
        [self sendEventWithName:event body:body];
    }
}

# pragma mark - RCTEventEmitter

// Will be called when this module's first listener is added.
- (void)startObserving {
    self.listening = YES;
}

// Will be called when this module's last listener is removed, or on dealloc.
- (void)stopObserving {
    self.listening = NO;
}

# pragma mark - TVICameraSourceDelegate


- (void)cameraSourceWasInterrupted:(nonnull TVICameraSource *)source reason:(AVCaptureSessionInterruptionReason)reason  API_AVAILABLE(ios(9.0)){
    NSString *reasonStr = @"unknown";
    if (@available(iOS 9.0, *)) {
        if (reason == AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableInBackground) {
            reasonStr = @"video device not available in background";
        } else if (reason == AVCaptureSessionInterruptionReasonAudioDeviceInUseByAnotherClient) {
            reasonStr = @"audio device in use by another client";
        } else if (reason == AVCaptureSessionInterruptionReasonVideoDeviceInUseByAnotherClient) {
            reasonStr = @"video device in use by another client";
        } else if (reason == AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableWithMultipleForegroundApps) {
            reasonStr = @"video device not available with multiple foreground apps";
        }
    }
    if (@available(iOS 11.1, *)) {
        if (reason == AVCaptureSessionInterruptionReasonVideoDeviceNotAvailableDueToSystemPressure) {
            reasonStr = @"video device not available due to system pressure";
        }
    }
    
    [self sendEventCheckingListenerWithName:cameraWasInterrupted body:@{@"reason" : reasonStr }];
}

- (void)cameraSourceInterruptionEnded:(nonnull TVICameraSource *)source {
    [self sendEventCheckingListenerWithName:cameraInterruptionEnded body:nil];
}

-(void)cameraSource:(nonnull TVICameraSource *)source didFailWithError:(nonnull NSError *)error {
    [self sendEventCheckingListenerWithName:cameraDidStopRunning body:@{ @"error" : error.localizedDescription }];
}

# pragma mark - TVIRoomDelegate

- (void)didConnectToRoom:(TVIRoom *)room {
    NSMutableArray *participants = [NSMutableArray array];
    
    for (TVIRemoteParticipant *p in room.remoteParticipants) {
        p.delegate = self;
        [participants addObject:[p toJSON]];
    }
    TVILocalParticipant *localParticipant = room.localParticipant;
    [participants addObject:[localParticipant toJSON]];
    [self sendEventCheckingListenerWithName:roomDidConnect body:@{ @"roomName" : room.name , @"roomSid": room.sid, @"participants" : participants }];
    
}

- (void)room:(TVIRoom *)room didDisconnectWithError:(nullable NSError *)error {
    self.room = nil;
    
    NSMutableDictionary *body = [@{ @"roomName": room.name, @"roomSid": room.sid } mutableCopy];
    
    if (error) {
        [body addEntriesFromDictionary:@{ @"error" : @{ @"message": error.localizedDescription, @"code": @(error.code) } }];
    }
    [self sendEventCheckingListenerWithName:roomDidDisconnect body:body];
}

- (void)room:(TVIRoom *)room didFailToConnectWithError:(nonnull NSError *)error{
    self.room = nil;
    
    NSMutableDictionary *body = [@{ @"roomName": room.name, @"roomSid": room.sid } mutableCopy];
    
    if (error) {
        [body addEntriesFromDictionary:@{ @"error" : @{ @"message": error.localizedDescription, @"code": @(error.code) } }];
    }
    
    [self sendEventCheckingListenerWithName:roomDidFailToConnect body:body];
}


- (void)room:(TVIRoom *)room participantDidConnect:(TVIRemoteParticipant *)participant {
    participant.delegate = self;
    
    [self sendEventCheckingListenerWithName:roomParticipantDidConnect body:@{ @"roomName": room.name, @"roomSid": room.sid, @"participant": [participant toJSON] }];
}

- (void)room:(TVIRoom *)room participantDidDisconnect:(TVIRemoteParticipant *)participant {
    [self sendEventCheckingListenerWithName:roomParticipantDidDisconnect body:@{ @"roomName": room.name, @"roomSid": room.sid, @"participant": [participant toJSON] }];
}

# pragma mark - TVIRemoteParticipantDelegate

- (void)didSubscribeToDataTrack:(TVIRemoteDataTrack *)dataTrack publication:(TVIRemoteDataTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    dataTrack.delegate = self;
    self.remoteDataTrackMap[dataTrack.sid] = @{ @"senderId": participant.identity };
    [self sendEventCheckingListenerWithName:participantAddedDataTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didUnsubscribeFromDataTrack:(TVIRemoteDataTrack *)dataTrack publication:(TVIRemoteVideoTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    [self.remoteDataTrackMap removeObjectForKey:dataTrack.sid];
    [self sendEventCheckingListenerWithName:participantRemovedDataTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didFailToSubscribeToDataTrack:(TVIRemoteDataTrackPublication *)publication error:(NSError *)error forParticipant:(TVIRemoteParticipant *)participant {
    NSMutableDictionary *body = [@{ @"participant": [participant toJSON], @"track": [publication toJSON] } mutableCopy];
    
    if (error) {
        [body addEntriesFromDictionary:@{ @"error" : @{ @"message": error.localizedDescription, @"code": @(error.code) } }];
    }

    [self sendEventCheckingListenerWithName:participantFailedToSubscribeToDataTrack body:body];
}

- (void)didSubscribeToVideoTrack:(TVIRemoteVideoTrack *)videoTrack publication:(TVIRemoteVideoTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    [self sendEventCheckingListenerWithName:participantAddedVideoTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didUnsubscribeFromVideoTrack:(TVIRemoteVideoTrack *)videoTrack publication:(TVIRemoteVideoTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    [self sendEventCheckingListenerWithName:participantRemovedVideoTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didFailToSubscribeToVideoTrack:(TVIRemoteVideoTrackPublication *)publication error:(NSError *)error forParticipant:(TVIRemoteParticipant *)participant {
    NSMutableDictionary *body = [@{ @"participant": [participant toJSON], @"track": [publication toJSON] } mutableCopy];
    
    if (error) {
        [body addEntriesFromDictionary:@{ @"error" : @{ @"message": error.localizedDescription, @"code": @(error.code) } }];
    }

    [self sendEventCheckingListenerWithName:participantFailedToSubscribeToVideoTrack body:body];
}

- (void)didSubscribeToAudioTrack:(TVIRemoteAudioTrack *)audioTrack publication:(TVIRemoteAudioTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    [self sendEventCheckingListenerWithName:participantAddedAudioTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didUnsubscribeFromAudioTrack:(TVIRemoteAudioTrack *)audioTrack publication:(TVIRemoteAudioTrackPublication *)publication forParticipant:(TVIRemoteParticipant *)participant {
    [self sendEventCheckingListenerWithName:participantRemovedAudioTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)didFailToSubscribeToAudioTrack:(TVIRemoteAudioTrackPublication *)publication error:(NSError *)error forParticipant:(TVIRemoteParticipant *)participant {
    NSMutableDictionary *body = [@{ @"participant": [participant toJSON], @"track": [publication toJSON] } mutableCopy];
    
    if (error) {
        [body addEntriesFromDictionary:@{ @"error" : @{ @"message": error.localizedDescription, @"code": @(error.code) } }];
    }

    [self sendEventCheckingListenerWithName:participantFailedToSubscribeToAudioTrack body:body];
}

- (void)remoteParticipant:(TVIRemoteParticipant *)participant didEnableVideoTrack:(TVIRemoteVideoTrackPublication *)publication {
    [self sendEventCheckingListenerWithName:participantEnabledVideoTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)remoteParticipant:(TVIRemoteParticipant *)participant didDisableVideoTrack:(TVIRemoteVideoTrackPublication *)publication {
    [self sendEventCheckingListenerWithName:participantDisabledVideoTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)remoteParticipant:(TVIRemoteParticipant *)participant didEnableAudioTrack:(TVIRemoteAudioTrackPublication *)publication {
    [self sendEventCheckingListenerWithName:participantEnabledAudioTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

- (void)remoteParticipant:(TVIRemoteParticipant *)participant didDisableAudioTrack:(TVIRemoteAudioTrackPublication *)publication {
    [self sendEventCheckingListenerWithName:participantDisabledAudioTrack body:@{ @"participant": [participant toJSON], @"track": [publication toJSON] }];
}

# pragma mark - TVIRemoteDataTrackDelegate

- (void)remoteDataTrack:(nonnull TVIRemoteDataTrack *)remoteDataTrack didReceiveString:(nonnull NSString *)message {
    NSString* senderId = self.remoteDataTrackMap[remoteDataTrack.sid][@"senderId"];
    [self sendEventCheckingListenerWithName:dataTrackMessageReceived body:@{ @"message": message, @"senderId": senderId }];
}

- (void)remoteDataTrack:(nonnull TVIRemoteDataTrack *)remoteDataTrack didReceiveData:(nonnull NSData *)message {
    // TODO: Handle didReceiveData
    NSLog(@"DataTrack didReceiveData");
}



// TODO: Local participant delegates

@end
