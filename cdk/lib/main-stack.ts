import * as path from 'path';
import { Construct } from 'constructs';
import {
  aws_route53 as route53,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_certificatemanager as acm,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy,
  StackProps,
  Stack,
  CfnOutput,
  Duration,
  Fn,
  RemovalPolicy,
  aws_route53_targets as targets,
} from 'aws-cdk-lib';

export interface CdkStackProps extends StackProps {}

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const domainName = Fn.importValue('MainDomain');

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
      zoneName: domainName,
      hostedZoneId: Fn.importValue('MainHostedZoneId'),
    });

    const certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName,
      hostedZone,
      region: 'us-east-1',
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'SiteOriginAccessIdentity');

    // Clean URLs: / and /x/ -> index.html, /docs -> /docs.html; the old /docs/health moved to /docs#health.
    const viewerRequestFunction = new cloudfront.Function(this, 'ViewerRequestFunction', {
      code: cloudfront.FunctionCode.fromInline(`
var PAGES = {
  '/docs': '/docs.html',
  '/docs/': '/docs.html',
};
var REDIRECTS = {
  '/docs/health': '/docs#health',
  '/docs/health/': '/docs#health',
};

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (REDIRECTS[uri]) {
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: REDIRECTS[uri] } } };
  }
  if (PAGES[uri]) {
    request.uri = PAGES[uri];
  } else if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  }

  return request;
}
`),
    });

    // Central traffic monitoring (dliu-com/traffic-monitor): shared visitor cookie; TrafficMonitor
    // creates this distribution's access-log delivery (CloudFront standard logging v2).
    const visitorIdFunction = cloudfront.Function.fromFunctionAttributes(this, 'VisitorId', {
      functionArn: Fn.importValue('TrafficVisitorFunctionArn'),
      functionName: 'dliu-visitor-id',
    });
    // Makes CloudFront add CloudFront-Viewer-City so the visitor function can log the city.
    const trafficGeoPolicy = cloudfront.OriginRequestPolicy.fromOriginRequestPolicyId(
      this, 'TrafficGeo', Fn.importValue('TrafficGeoOriginRequestPolicyId'));

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        originRequestPolicy: trafficGeoPolicy,
        functionAssociations: [
          {
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            function: viewerRequestFunction,
          },
          { eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE, function: visitorIdFunction },
        ],
      },
      domainNames: [domainName],
      certificate,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.minutes(5),
        },
      ],
    });
    // IncludeCookies is the only legacy logging setting v2 honours: it puts the dl_vid cookie in the logs.
    (distribution.node.defaultChild as cloudfront.CfnDistribution)
      .addPropertyOverride('DistributionConfig.Logging', { IncludeCookies: true });

    siteBucket.grantRead(originAccessIdentity);

    const siteSource = s3deploy.Source.asset(path.join(__dirname, '..', '..', 'src'));

    // HTML keeps the default caching; other files (e.g. resume.pdf) are invalidated on every
    // deploy, so the edge may cache them for a day.
    const staticFiles = new s3deploy.BucketDeployment(this, 'DeployStaticFiles', {
      destinationBucket: siteBucket,
      sources: [siteSource],
      exclude: ['*.html', '*.md'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(Duration.minutes(5)),
        s3deploy.CacheControl.sMaxAge(Duration.days(1)),
        s3deploy.CacheControl.fromString('stale-while-revalidate=86400'),
      ],
      distribution,
      distributionPaths: ['/*'],
    });

    // Markdown (docs/health.md) needs an explicit charset; same caching as the other static files.
    const markdownFiles = new s3deploy.BucketDeployment(this, 'DeployMarkdownFiles', {
      destinationBucket: siteBucket,
      sources: [siteSource],
      exclude: ['*'],
      include: ['*.md'],
      contentType: 'text/markdown; charset=utf-8',
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(Duration.minutes(5)),
        s3deploy.CacheControl.sMaxAge(Duration.days(1)),
        s3deploy.CacheControl.fromString('stale-while-revalidate=86400'),
      ],
      distribution,
      distributionPaths: ['/*'],
    });
    markdownFiles.node.addDependency(staticFiles);

    const htmlFiles = new s3deploy.BucketDeployment(this, 'DeploySiteFiles', {
      destinationBucket: siteBucket,
      destinationKeyPrefix: '',
      sources: [siteSource],
      exclude: ['*'],
      include: ['*.html'],
      distribution,
      distributionPaths: ['/*'],
    });
    htmlFiles.node.addDependency(staticFiles);

    new route53.ARecord(this, 'SiteAliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new route53.AaaaRecord(this, 'SiteAliasIpv6Record', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    new CfnOutput(this, 'WebsiteUrl', {
      value: `https://${domainName}`,
    });

    new CfnOutput(this, 'CustomDomainUrl', {
      value: `https://${domainName}`,
    });
  }
}
