#import <React/RCTBridgeModule.h>

// Objective-C exporter for DailyHanziWidgetBridge.swift. This is what makes
// the Swift class visible to RN's classic native module bridge, without
// needing a Swift bridging header (see the comment at the top of the .swift
// file for why).
@interface RCT_EXTERN_MODULE(DailyHanziWidgetBridge, NSObject)

RCT_EXTERN_METHOD(syncState:(NSString *)payloadJson)
RCT_EXTERN_METHOD(reloadWidgets)
RCT_EXTERN_METHOD(getWidgetHistory:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
