//
//  CDVC.m
//  CordovaLib
//
//  Created by bch on 2015/07/17.
//
//

#import "CDVC.h"
#import "CDVCURLP.h"

@implementation CDVC

- (void)pluginInitialize
{
    [NSURLProtocol registerClass:[CDVCURLP class]];
}

@end
