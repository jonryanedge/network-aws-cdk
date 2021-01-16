import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import { Subnet, SubnetNetworkAclAssociation } from '@aws-cdk/aws-ec2';

interface RegionalStackProps extends cdk.StackProps {
    deploymentId: string;
    regionCidr: string;
    vpcCidr: string;
    subnetAzs: string[];
    subnetCidrs: string[];
};

export class CoreVpcStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RegionalStackProps) {
    super(scope, id, props);

    const tgwSsm = '/' + props.deploymentId + '/coreRouterId';
    const netIds = [];

    // Get SSM parameters
    const tgwId = ssm.StringParameter.valueFromLookup(this, tgwSsm);
    

    // Define core vpc 
    const coreVpc = new ec2.Vpc(this, 'vpc', {
        cidr: props.vpcCidr,
        subnetConfiguration: [],
        flowLogs: {
          VpcFlowLogs: {
            destination: ec2.FlowLogDestination.toCloudWatchLogs(),
          }
        }
    });

    const coreRouteTable = new ec2.CfnRouteTable(this, 'coreRouteTable', {
        vpcId: coreVpc.vpcId,
        tags: [
            { key: 'Name', value: 'gatewayConnected' },
            { key: 'DeploymentId', value: props.deploymentId }
        ]
    });

    const net1 = new ec2.CfnSubnet(this, 'coreNet1', {
        vpcId: coreVpc.vpcId,
        availabilityZone: props.subnetAzs[0],
        cidrBlock: props.subnetCidrs[0],
        mapPublicIpOnLaunch: false,
        tags: [
            { key: 'Name', value: 'core01' }
        ]
    });

    netIds.push(net1.ref);

    const net1Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'net1RtA', {
        routeTableId: coreRouteTable.ref,
        subnetId: net1.ref,
    });

    const net2 = new ec2.CfnSubnet(this, 'coreNet2', {
        vpcId: coreVpc.vpcId,
        availabilityZone: props.subnetAzs[1],
        cidrBlock: props.subnetCidrs[1],
        mapPublicIpOnLaunch: false,
        tags: [
            { key: 'Name', value: 'core02' }
        ]
    });

    netIds.push(net2.ref);

    const net2Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'net2RtA', {
        routeTableId: coreRouteTable.ref,
        subnetId: net2.ref,
    });
    
    const net3 = new ec2.CfnSubnet(this, 'coreNet3', {
        vpcId: coreVpc.vpcId,
        availabilityZone: props.subnetAzs[2],
        cidrBlock: props.subnetCidrs[2],
        mapPublicIpOnLaunch: false,
        tags: [
            { key: 'Name', value: 'core03' }
        ]
    });

    netIds.push(net3.ref);

    const net3Rt = new ec2.CfnSubnetRouteTableAssociation(this, 'net3RtA', {
        routeTableId: coreRouteTable.ref,
        subnetId: net3.ref,
    });
    
    // Attach core vpc subnets to coreRouter
    const coreVpcTgwAttachment = new ec2.CfnTransitGatewayAttachment(this, 'coreToTgw', {
        vpcId: coreVpc.vpcId,
        transitGatewayId: tgwId,
        subnetIds: netIds,
        tags: [
          { key: 'Name', value: 'coreToTgw' },
          { key: 'Network', value: 'core' }
        ]
    }); 

    // Setup vpc route to transit gateway
    const coreVpcTransitRoute = new ec2.CfnRoute(this, 'defaultRoute', {
        routeTableId: coreRouteTable.ref,
        destinationCidrBlock: '0.0.0.0/0',
        transitGatewayId: tgwId
    });
    coreVpcTransitRoute.addDependsOn(coreVpcTgwAttachment);
  }
}