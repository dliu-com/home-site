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
        }),
    });

    template.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        AliasTarget: Match.anyValue(),
    });
});
