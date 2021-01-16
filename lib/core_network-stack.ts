import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';

interface RegionalStackProps extends cdk.StackProps {
  deploymentId: string;
  regionAsn: number;
  regionCidr: string;
};

export class CoreNetworkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RegionalStackProps) {
    super(scope, id, props);

    // Define regional Transit Gateway
    const tgw = new ec2.CfnTransitGateway(this, 'tgw', {
      amazonSideAsn: props.regionAsn,
      autoAcceptSharedAttachments: 'enable',
      defaultRouteTableAssociation: 'enable',
      defaultRouteTablePropagation: 'enable',
      description: 'transit gateway',
      dnsSupport: 'enable',
      multicastSupport: 'enable',
      tags: [
        {key: 'Name', value: 'coreRouter'}, 
        {key: 'Network', value: 'core'},
        {key: 'DeploymentId', value: props.deploymentId},
        {key: 'asn', value: props.regionAsn.toString()},
        {key: 'cidr', value: props.regionCidr}
      ],
      vpnEcmpSupport: 'enable'
    });

    // Publish SSM Parameter containing regional Transit Gateway Id
    const tgwParam = new ssm.StringParameter(this, 'tgwParam', {
      stringValue: tgw.ref,
      parameterName: '/' + props.deploymentId + '/coreRouterId',
    });

    // Create new transit gateway route table for egress traffic
    const edgeTransitRouteTable = new ec2.CfnTransitGatewayRouteTable(this, 'edgeRouteTable', {
      transitGatewayId: tgw.ref,
      tags: [
        { key: 'Name', value: 'edge-TGW-RouteTable' },
        { key: 'Network', value: 'edge' }
      ]
    });
    
    const edgeRtParam = new ssm.StringParameter(this, 'edgeRtParam', {
      stringValue: edgeTransitRouteTable.ref,
      parameterName: '/' + props.deploymentId + '/edgeRouteTableId',
    });

  }
}
