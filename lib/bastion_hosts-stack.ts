import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as ssm from '@aws-cdk/aws-ssm';

interface RegionalStackProps extends cdk.StackProps {
    deploymentId: string;
  };

export class BastionStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RegionalStackProps) {
    super(scope, id, props);

    // define bastion properties - ami / role / vpc 
    const amzn_linux = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    });

    const role = new iam.Role(this, 'InstanceSSM', {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [ iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonEC2RoleforSSM") ],
    });

    const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
      vpcName: 'core/vpc',
    });

    const edgevpc = ec2.Vpc.fromLookup(this, 'edgeVpc', {
      vpcName: 'edge/vpc',
    })

    const bastion = new ec2.Instance(this, 'bastion', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2,ec2.InstanceSize.NANO),
      machineImage: amzn_linux,
      role: role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE,
      }
    });

    const edgeBastion = new ec2.Instance(this, 'edgeBastion', {
      vpc: edgevpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2,ec2.InstanceSize.MICRO),
      machineImage: amzn_linux,
      role: role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      }
    })
  }
}
