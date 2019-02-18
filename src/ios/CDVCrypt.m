//
//  CDVCrypt.m
//  CordovaLib
//
//  Created by busenm on 2015/07/17.
//
//

#import "CDVCrypt.h"
#import "CDVCryptURLProtocol.h"

@implementation CDVCrypt

- (void)pluginInitialize
{
    [NSURLProtocol registerClass:[CDVCryptURLProtocol class]];
}

@end
