# IBD Centre
This prototype was created for IBD Centre's data processing and storage of a summary of patients
## Stack

* **Front-end** - ReactJS on NodeJS as the core framework, Amplify for Auth UI component and AWS integration.
* **Data** - All data is saved in Amazon S3 and DynamoDB for status
* **Auth** - Cognito user pool within AWS amplify
* **Data Processing** - Uses a Lambda function in the backend to execute Comprehend Medical API and Regex pattern to detect and categorize information 
 
## Architecture Diagram
![alt text](./docs/IBD.png)

## Requirements
Before you deploy, you must have the following installed:
*  [AWS Account](https://aws.amazon.com/account/) 
*  [GitHub Account](https://github.com/) 
*  [AWS CLI](https://aws.amazon.com/cli/) 
*  [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) 
*  [Amplify CLI installed and configured](https://aws-amplify.github.io/docs/cli-toolchain/quickstart#quickstart) 

## Deployment
First you will need to clone and fork this repository. The overall deployment has 3 parts, frontend, backend and setting up Glue and Athena.
### Frontend Deployment
[![Deploy with Amplify](https://oneclick.amplifyapp.com/button.svg)](https://console.aws.amazon.com/amplify/home#/deploy?repo=https://github.com/UBC-CIC/ibd-centre)

This will start the deployment on your Amplify console. 

### Backend Deployment
Deploying the backend application onto your AWS account requires the following steps:

1. Run `deploy_lambda.sh` from command line for AWS SAM to package and deploy resources into your account. 
2. Confirm that the names are correct for project name, s3 bucket, dynamodb, and the lambda arn.
3. Click yes to options that pop up.
4. On your AWS console in Amplify, once frontend deployment is successful, you can now login, make an account and upload/process the letters.

### Glue and Athena set up

## Changelogs

## License 
