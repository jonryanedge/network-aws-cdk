import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';

interface RegionalStackProps extends cdk.StackProps {
    deploymentId: string;
    regionCidr: string;
    edgeCidr: string;
    subnetAzs: string[];
    pubCidrs: string[];
    privCidrs: string[];
};

export class EdgeVpcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RegionalStackProps) {
    super(scope, id, props);

    const pubIds = [];
    const privIds = [];

    // Set SSM Parameter paths
    const tgwSsm = '/' + props.deploymentId + '/coreRouterId';
    const eRtSsm = '/' + props.deploymentId + '/edgeRouteTableId';

    // Get SSM parameters
    const tgwId = ssm.StringParameter.valueFromLookup(this, tgwSsm);
    const edgeTransitRouteTableId = ssm.StringParameter.valueFromLookup(this, eRtSsm);
    
    // Define regional edge vpc resources, including subnets
    const edgeVpc = new ec2.Vpc(this, 'vpc', {
        cidr: props.edgeCidr,
        subnetConfiguration: [],
        flowLogs: {
          VpcFlowLogs: {
            destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          }
        },
    });

    // define public and private route tables
    const pubRt = new ec2.CfnRouteTable(this, 'pubRt', {
        vpcId: edgeVpc.vpcId,
        tags: [
            { key: 'Name', value: 'pubRoutes' },
            { key: 'DeploymentId', value: props.deploymentId }
        ]
    });

    const privRt = new ec2.CfnRouteTable(this, 'privRt', {
        vpcId: edgeVpc.vpcId,
        tags: [
            { key: 'Name', value: 'privRoutes' },
            { key: 'DeploymentId', value: props.deploymentId }
        ]
    });

    // define public subnets & associate them to the route table 
    const pub1 = new ec2.CfnSubnet(this, 'pub1', {
        vpcId: edgeVpc.vpcId,
        availabilityZone: props.subnetAzs[0],
        cidrBlock: props.pubCidrs[0],
        mapPublicIpOnLaunch: true,
        tags: [
            { key: 'Name', value: 'pub01' },
        ]
    });
    pubIds.push(pub1.ref);

    const pub1Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'pub1RtA', {
        routeTableId: pubRt.ref,
        subnetId: pub1.ref,
    });

    const pub2 = new ec2.CfnSubnet(this, 'pub2', {
        vpcId: edgeVpc.vpcId,
        availabilityZone: props.subnetAzs[1],
        cidrBlock: props.pubCidrs[1],
        mapPublicIpOnLaunch: true,
        tags: [
            { key: 'Name', value: 'pub02' },
        ]
    });
    pubIds.push(pub2.ref);

    const pub2Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'pub2RtA', {
        routeTableId: pubRt.ref,
        subnetId: pub2.ref,
    });
    
    // define private subents & associate them to route table 
    const priv1 = new ec2.CfnSubnet(this, 'priv1', {
        vpcId: edgeVpc.vpcId,
        availabilityZone: props.subnetAzs[0],
        cidrBlock: props.privCidrs[0],
        mapPublicIpOnLaunch: false,
        tags: [
            { key: 'Name', value: 'priv01' },
        ]
    });
    privIds.push(priv1.ref);

    const priv1Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'priv1RtA', {
        routeTableId: privRt.ref,
        subnetId: priv1.ref,
    });

    const priv2 = new ec2.CfnSubnet(this, 'priv2', {
        vpcId: edgeVpc.vpcId,
        availabilityZone: props.subnetAzs[1],
        cidrBlock: props.privCidrs[1],
        mapPublicIpOnLaunch: false,
        tags: [
            { key: 'Name', value: 'priv02' },
        ]
    });
    privIds.push(priv2.ref);

    const priv2Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'priv2RtA', {
        routeTableId: privRt.ref,
        subnetId: priv2.ref,
    });

    // define internet gateway
    const igw = new ec2.CfnInternetGateway(this, 'igw', {
        tags: [
            { key: 'DeploymentId', value: props.deploymentId },
        ]
    });

    const vpcIgw = new ec2.CfnVPCGatewayAttachment(this, 'vpcIgw', {
        vpcId: edgeVpc.vpcId,
        internetGatewayId: igw.ref,
    }).addDependsOn(igw);

    // define nat gateways
    const ngw1 = new ec2.CfnNatGateway(this, 'ngw1', {
        subnetId: priv1.ref,
        allocationId: new ec2.CfnEIP(this, 'eip-ngw1').attrAllocationId,
    });
    ngw1.addDependsOn(igw);


    // Attach edge vpc subnets to coreRouter
    const edgeVpcTgwAttachment = new ec2.CfnTransitGatewayAttachment(this, 'edgeToTgw', {
        vpcId: edgeVpc.vpcId,
        transitGatewayId: tgwId,
        subnetIds: privIds,
        tags: [
          { key: 'Name', value: 'edgeToTgw' },
          { key: 'Network', value: 'edge' }
        ]
    });

    const edgeVpcTgwRtAssociation = new ec2.CfnTransitGatewayRouteTableAssociation(this, 'edgeTgwRtA', {
        transitGatewayAttachmentId: edgeVpcTgwAttachment.ref,
        transitGatewayRouteTableId: edgeTransitRouteTableId
    });
    edgeVpcTgwRtAssociation.addDependsOn(edgeVpcTgwAttachment);
    
    // Create default route for egress routing through edgeVpc attachment
    const edgeVpcRoute = new ec2.CfnTransitGatewayRoute(this, 'DefaultRoute', {
        destinationCidrBlock: '0.0.0.0/0',
        transitGatewayRouteTableId: edgeTransitRouteTableId,
        transitGatewayAttachmentId: edgeVpcTgwAttachment.ref,
    });

    // define routes 
    const defaultRts = new ec2.CfnRoute(this, 'defRts', {
        routeTableId: pubRt.ref,
        destinationCidrBlock: '0.0.0.0/0',
        gatewayId: igw.ref
    });

    const pubRts = new ec2.CfnRoute(this, 'pubRts', {
        routeTableId: pubRt.ref,
        destinationCidrBlock: props.regionCidr,
        transitGatewayId: tgwId,
    });
    pubRts.addDependsOn(edgeVpcTgwAttachment);

    const privRts = new ec2.CfnRoute(this, 'privRts', {
        routeTableId: privRt.ref,
        destinationCidrBlock: '0.0.0.0/0',
        natGatewayId: ngw1.ref
    });

  }
}