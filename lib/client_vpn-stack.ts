import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ssm from '@aws-cdk/aws-ssm';
import * as cm from '@aws-cdk/aws-certificatemanager';

interface RegionalStackProps extends cdk.StackProps {
    deploymentId: string;
    regionAsn: number;
    regionCidr: string;
  };
  
  export class CoreNetworkStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: RegionalStackProps) {
      super(scope, id, props);
  
      // Define certificates
      // const serverCert = cm.Certificate(this, 'serverCert', {

      // });

      // Define client vpn endpoint
      const vpnConnection = new ec2.CfnClientVpnEndpoint(this, 'clienVpn', {
        authenticationOptions: [
          // { 
          //   type: 'federated-authentication',
          //   federatedAuthentication: {
          //     samlProviderArn: "arn:aws:iam::553800827446:saml-provider/AWSSSO_8fcd5adb3105a417_DO_NOT_DELETE",
          //     selfServiceSAMLProviderArn: "arn:aws:iam::553800827446:saml-provider/AWSSSO_8fcd5adb3105a417_DO_NOT_DELETE",
          //   },
          // }
        ],
        transportProtocol: 'tcp',
        splitTunnel: true,
        clientCidrBlock: '172.30.0.0/22',
        serverCertificateArn: '',
        connectionLogOptions: { enabled: false },
        tagSpecifications: [{
          resourceType: 'client-vpn-endpoint',
          tags: [
            { key: 'Name', value: 'vpnConnection' },
          ]
        }],
      });
    }
}