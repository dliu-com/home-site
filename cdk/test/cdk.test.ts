import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CdkStack } from '../lib/main-stack';

test('creates a private S3 bucket behind CloudFront', () => {
    const app = new App();

    const stack = new CdkStack(app, 'MyTestStack', {
        env: {
            account: '123456789012',
            region: 'eu-west-2',
        },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        },
    });

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: Match.objectLike({
            DefaultRootObject: 'index.html',
            Enabled: true,
            HttpVersion: 'http2and3',
        }),
    });

    template.hasResourceProperties('Custom::CDKBucketDeployment', {
        Exclude: ['*.html', '*.md'],
        SystemMetadata: {
            'cache-control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
        },
    });
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
        Exclude: ['*'],
        Include: ['*.md'],
        SystemMetadata: {
            'content-type': 'text/markdown; charset=utf-8',
            'cache-control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
        },
    });
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
        Exclude: ['*'],
        Include: ['*.html'],
        SystemMetadata: Match.absent(),
    });

    template.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        AliasTarget: Match.anyValue(),
    });
});

test('the viewer-request function serves clean URLs', () => {
    const app = new App();
    const stack = new CdkStack(app, 'RoutingTestStack', {
        env: { account: '123456789012', region: 'eu-west-2' },
    });
    const functions = Template.fromStack(stack).findResources('AWS::CloudFront::Function');
    const [code] = Object.values(functions).map((resource: any) => resource.Properties.FunctionCode as string);
    const handler = new Function(`${code}; return handler;`)() as (event: any) => { uri: string };
    const route = (uri: string) => handler({ request: { uri } }).uri;

    expect(route('/')).toBe('/index.html');
    expect(route('/docs')).toBe('/docs.html');
    expect(route('/docs/')).toBe('/docs.html');
    expect(route('/docs/health')).toBe('/docs-health.html');
    expect(route('/docs/health/')).toBe('/docs-health.html');
    expect(route('/health')).toBe('/health');
    expect(route('/docs/health.md')).toBe('/docs/health.md');
    expect(route('/resume.pdf')).toBe('/resume.pdf');
    expect(route('/style.css')).toBe('/style.css');
});
