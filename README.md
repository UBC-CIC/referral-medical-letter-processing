# IBD Centre
This prototype was created for IBD Centre's data processing and storage of a summary of patients

## Stack
* **Front-end** - ReactJS on NodeJS as the core framework, Amplify for Auth UI component and AWS integration.
* **Data** - All data is saved in Amazon S3 and DynamoDB for status
* **Auth** - Cognito user pool within AWS amplify
* **Data Processing** - Uses a Lambda function in the backend to execute Comprehend Medical API and Regex pattern to detect and categorize information 
 
## Architecture Diagram
![alt text](../docs/images/IBD.png)

## Requirements
Before you deploy, you must have the following installed:
*  [AWS Account](https://aws.amazon.com/account/) 
*  [GitHub Account](https://github.com/) 
*  [AWS CLI](https://aws.amazon.com/cli/) 
*  [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) 
*  [Amplify CLI installed and configured](https://aws-amplify.github.io/docs/cli-toolchain/quickstart#quickstart) 

## Deployment
The overall deployment has 3 parts.
1. Frondend Deployment
Follow this [guide](https://github.com/UBC-CIC/ibd-centre/docs/deployment_guide1.md) for delpoying the frontend of this solution

2. Backend Deployment and Athena set up
Deploying the backend application onto your AWS account requires the following this [guide](https://github.com/UBC-CIC/ibd-centre/docs/deployment_guide2.md)

3. Cloudformation deployment
This part works only if you run the lambda script locally first (successfully completing the previous two guides). The following deployment [guide](https://github.com/UBC-CIC/ibd-centre/docs/deployment_guide3.md) uses clloudformation and Amplify's one touch deployment.

## Change logs

## License 
This project is distributed under the [MIT License](https://github.com/UBC-CIC/ibd-centre/blob/main/LICENSE)